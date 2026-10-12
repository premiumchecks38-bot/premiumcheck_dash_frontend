"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Bell, CheckCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/dashboard/primitives";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { Envelope, Notification } from "@/lib/api/schemas";
import { admin, request } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { cn } from "@/lib/utils/cn";

import { useNotificationStream } from "./use-notification-stream";

const LIST_KEY = ["notifications", "list"] as const;
const COUNT_KEY = ["notifications", "unread"] as const;

/** Only internal dashboard links are followed. */
function safeLink(link: string | null): Route | null {
  return link?.startsWith("/") && !link.startsWith("//") ? (link as Route) : null;
}

/** Bell with the unread count, a dropdown list and live updates from the event stream. */
export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const count = useQuery({
    queryKey: COUNT_KEY,
    queryFn: () => admin<{ unread: number }>("/notifications/unread-count"),
    refetchInterval: 120_000,
  });
  const list = useQuery({
    queryKey: LIST_KEY,
    queryFn: () =>
      request<Notification[]>("/api/admin/notifications", { query: { page_size: 10 } }).then(
        (envelope: Envelope<Notification[]>) => envelope.data,
      ),
    enabled: open,
  });

  const refresh = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  useNotificationStream((notification) => {
    queryClient.setQueryData<{ unread: number }>(COUNT_KEY, (old) => ({
      unread: (old?.unread ?? 0) + 1,
    }));
    queryClient.setQueryData<Notification[]>(LIST_KEY, (old) =>
      old ? [notification, ...old].slice(0, 10) : old,
    );
    toast(notification.title, { description: notification.body ?? undefined });
  }, refresh);

  const markRead = useMutation({
    mutationFn: (id: string) => admin(`/notifications/${id}/read`, { method: "POST" }),
    onSuccess: refresh,
    onError: (error) => toast.error(errorMessage(error)),
  });
  const markAll = useMutation({
    mutationFn: () => admin("/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      refresh();
      toast.success("All notifications marked as read.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const unread = count.data?.unread ?? 0;
  const label = unread > 0 ? `Notifications, ${String(unread)} unread` : "Notifications";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="none"
          className="relative min-h-touch min-w-touch rounded-full"
          aria-label={label}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unread > 0 ? (
            <span
              className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-accent px-1 font-heading text-micro font-bold text-accent-foreground"
              data-testid="notification-count"
              aria-hidden="true"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-popover" aria-label="Notifications">
        <div className="flex items-center justify-between border-b-thin border-border px-4 py-3">
          <h2 className="font-heading text-small font-bold text-primary">Notifications</h2>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => markAll.mutate()}
            disabled={unread === 0 || markAll.isPending}
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto" data-testid="notification-list">
          {list.isPending ? (
            <p className="px-4 py-6 text-center font-body text-small text-text-muted">Loading...</p>
          ) : list.isError ? (
            <p className="px-4 py-6 text-center font-body text-small text-error-text">
              Notifications could not be loaded.
            </p>
          ) : list.data.length === 0 ? (
            <p className="px-4 py-6 text-center font-body text-small text-text-muted">
              You are all caught up.
            </p>
          ) : (
            <ul className="divide-y-thin divide-border">
              {list.data.map((item) => {
                const href = safeLink(item.link);
                const content = (
                  <>
                    <span className="flex items-start gap-2">
                      {!item.read ? (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span
                        className={cn(
                          "font-body text-small",
                          item.read ? "text-text-muted" : "font-semibold text-text",
                        )}
                      >
                        {item.title}
                        {!item.read ? <span className="sr-only"> (unread)</span> : null}
                      </span>
                    </span>
                    {item.body ? (
                      <span className="mt-0.5 block font-body text-caption text-text-muted">
                        {item.body}
                      </span>
                    ) : null}
                    <DateTimeText
                      value={item.created_at}
                      className="mt-1 block font-body text-caption text-text-subtle"
                    />
                  </>
                );
                const onOpen = () => {
                  if (!item.read) markRead.mutate(item.id);
                  setOpen(false);
                };
                return (
                  <li key={item.id}>
                    {href ? (
                      <Link
                        href={href}
                        onClick={onOpen}
                        className="block px-4 py-3 hover:bg-surface-alt focus-visible:bg-surface-alt"
                      >
                        {content}
                      </Link>
                    ) : (
                      <Button
                        variant="ghost"
                        size="none"
                        className="block w-full rounded-none px-4 py-3 text-left font-normal"
                        onClick={onOpen}
                      >
                        {content}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
