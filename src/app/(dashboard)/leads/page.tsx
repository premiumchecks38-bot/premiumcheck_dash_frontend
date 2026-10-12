"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Clock,
  Download,
  Mail,
  MailOpen,
  MessageSquare,
  Phone,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { usePermission } from "@/components/dashboard/session-context";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContactMessage } from "@/lib/api/schemas";
import { admin, adminPage } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatTime } from "@/lib/utils/format";

type FilterTab = "all" | "unread" | "read";

export default function LeadsMessagesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("leads");

  const [search, setSearch] = React.useState("");
  const [filterTab, setFilterTab] = React.useState<FilterTab>("all");
  const [selectedMessage, setSelectedMessage] = React.useState<ContactMessage | null>(null);
  const [deleteMessageId, setDeleteMessageId] = React.useState<string | null>(null);

  const messagesQuery = useQuery({
    queryKey: ["admin", "leads", "messages", filterTab, search],
    queryFn: () =>
      adminPage<ContactMessage[]>("/leads/messages", {
        query: {
          search: search.trim() || undefined,
          is_read: filterTab === "unread" ? false : filterTab === "read" ? true : undefined,
          page_size: 100,
        },
      }),
  });

  const messages = messagesQuery.data?.data ?? [];
  const unreadCount = React.useMemo(() => {
    return messages.filter((m) => !m.is_read).length;
  }, [messages]);

  async function handleToggleRead(msg: ContactMessage) {
    try {
      const endpoint = msg.is_read
        ? `/leads/messages/${msg.id}/unread`
        : `/leads/messages/${msg.id}/read`;
      const updated = await admin<ContactMessage>(endpoint, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      if (selectedMessage?.id === msg.id) {
        setSelectedMessage(updated);
      }
      toast.success(msg.is_read ? "Marked as unread" : "Marked as read");
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  async function handleDeleteMessage(id: string) {
    try {
      await admin(`/leads/messages/${id}`, { method: "DELETE" });
      toast.success("Message deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      setDeleteMessageId(null);
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Contact queries & messages"
        description="Prospective client queries, contact form submissions, and general enquiries from the website."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href="/api/admin/leads/messages/export.csv" download>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </a>
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dashboard-muted" />
            <Input
              placeholder="Search sender, email, subject or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition-colors",
                filterTab === "all"
                  ? "bg-dashboard-primary text-dashboard-primary-foreground"
                  : "bg-dashboard-surface text-dashboard-muted hover:text-dashboard-text",
              )}
            >
              All queries
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("unread")}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition-colors",
                filterTab === "unread"
                  ? "bg-dashboard-primary text-dashboard-primary-foreground"
                  : "bg-dashboard-surface text-dashboard-muted hover:text-dashboard-text",
              )}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("read")}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition-colors",
                filterTab === "read"
                  ? "bg-dashboard-primary text-dashboard-primary-foreground"
                  : "bg-dashboard-surface text-dashboard-muted hover:text-dashboard-text",
              )}
            >
              Read
            </button>
          </div>
        </div>

        {/* Message List */}
        {messagesQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : messagesQuery.isError ? (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage(messagesQuery.error)}</span>
          </Alert>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-dashboard-border p-12 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-dashboard-muted mb-2" />
            <p className="text-sm font-medium text-dashboard-text">No contact form messages found</p>
            <p className="text-xs text-dashboard-muted mt-1">
              New website enquiries submitted through the contact form will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-dashboard-border rounded-xl border border-dashboard-border bg-dashboard-card overflow-hidden">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-dashboard-surface/40",
                  !m.is_read && "bg-dashboard-primary/5",
                )}
              >
                <div
                  className="flex-1 cursor-pointer space-y-1 min-w-0"
                  onClick={() => setSelectedMessage(m)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-dashboard-text text-sm">
                      {m.full_name}
                    </span>
                    <span className="text-xs text-dashboard-muted font-mono">{m.email}</span>
                    {m.phone && (
                      <span className="text-xs text-dashboard-muted flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {m.phone}
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        m.is_read
                          ? "bg-dashboard-surface text-dashboard-muted"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold",
                      )}
                    >
                      {m.is_read ? "Read" : "Unread"}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-dashboard-text truncate">
                    {m.subject || "General Enquiry"}
                  </p>

                  <p className="line-clamp-2 text-xs text-dashboard-muted leading-relaxed">
                    {m.message}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs shrink-0">
                  <div className="text-right text-dashboard-muted font-mono text-[11px]">
                    <div>{formatDate(m.created_at, "short")}</div>
                    <div className="opacity-80">{formatTime(m.created_at)}</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleRead(m)}
                      title={m.is_read ? "Mark unread" : "Mark read"}
                    >
                      {m.is_read ? (
                        <Mail className="h-4 w-4" />
                      ) : (
                        <MailOpen className="h-4 w-4 text-blue-500" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      title="View full query"
                    >
                      <Link href={`/leads/messages/${m.id}`}>
                        <Search className="h-4 w-4" />
                      </Link>
                    </Button>

                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => setDeleteMessageId(m.id)}
                        title="Delete query"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Detail Sheet */}
      {selectedMessage && (
        <MessageDetailSheet
          message={selectedMessage}
          canEdit={canEdit}
          open={Boolean(selectedMessage)}
          onClose={() => setSelectedMessage(null)}
          onToggleRead={() => handleToggleRead(selectedMessage)}
          onDelete={() => setDeleteMessageId(selectedMessage.id)}
        />
      )}

      {/* Confirm Delete Message */}
      <ConfirmDialog
        open={Boolean(deleteMessageId)}
        onOpenChange={(open) => !open && setDeleteMessageId(null)}
        title="Delete message"
        description="Are you sure you want to delete this contact query? This cannot be undone."
        confirmLabel="Delete message"
        destructive
        onConfirm={async () => {
          if (deleteMessageId) await handleDeleteMessage(deleteMessageId);
        }}
      />
    </>
  );
}

function MessageDetailSheet({
  message,
  canEdit,
  open,
  onClose,
  onToggleRead,
  onDelete,
}: {
  message: ContactMessage;
  canEdit: boolean;
  open: boolean;
  onClose: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Contact form query</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            Received on {formatDate(message.created_at, "short")} at {formatTime(message.created_at)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 text-xs">
          <div className="rounded-lg border border-dashboard-border bg-dashboard-card p-4 space-y-2">
            <div>
              <span className="text-dashboard-muted">From:</span>{" "}
              <strong className="text-dashboard-text font-semibold">{message.full_name}</strong>
            </div>
            <div>
              <span className="text-dashboard-muted">Email:</span>{" "}
              <a href={`mailto:${message.email}`} className="text-dashboard-primary hover:underline font-mono">
                {message.email}
              </a>
            </div>
            {message.phone && (
              <div>
                <span className="text-dashboard-muted">Phone:</span>{" "}
                <a href={`tel:${message.phone}`} className="hover:underline font-mono">
                  {message.phone}
                </a>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-dashboard-text text-sm">
              {message.subject || "General Enquiry"}
            </h4>
            <div className="rounded-md border border-dashboard-border bg-dashboard-surface/50 p-4 leading-relaxed whitespace-pre-wrap text-dashboard-text font-body">
              {message.message}
            </div>
          </div>

          <div className="border-t border-dashboard-border pt-4 flex items-center justify-between gap-2">
            <Button asChild size="sm">
              <a
                href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject || "Your enquiry with Premium Property Checks"}`)}`}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" /> Reply by email
              </a>
            </Button>

            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={onToggleRead}>
                {message.is_read ? "Mark unread" : "Mark read"}
              </Button>
              {canEdit && (
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
