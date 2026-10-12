"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Mail,
  MailOpen,
  Phone,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { usePermission } from "@/components/dashboard/session-context";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContactMessage } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatTime } from "@/lib/utils/format";

export default function MessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("leads");

  const id = typeof params?.id === "string" ? params.id : "";
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const query = useQuery({
    queryKey: ["admin", "leads", "messages", id],
    queryFn: () => admin<ContactMessage>(`/leads/messages/${id}`),
    enabled: Boolean(id),
  });

  const message = query.data;

  // Auto-mark as read on open if unread
  React.useEffect(() => {
    if (message && !message.is_read) {
      admin(`/leads/messages/${id}/read`, { method: "POST" })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
        })
        .catch(() => {});
    }
  }, [message, id, queryClient]);

  async function handleToggleRead() {
    if (!message) return;
    try {
      const endpoint = message.is_read
        ? `/leads/messages/${message.id}/unread`
        : `/leads/messages/${message.id}/read`;
      await admin<ContactMessage>(endpoint, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      toast.success(message.is_read ? "Marked as unread" : "Marked as read");
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!message) return;
    try {
      await admin(`/leads/messages/${message.id}`, { method: "DELETE" });
      toast.success("Message deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      router.push("/leads");
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  if (query.isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError || !message) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <span>{query.error ? errorMessage(query.error) : "Message could not be found."}</span>
        </Alert>

        <Button asChild variant="outline">
          <Link href="/leads">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to contact enquiries
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-dashboard-muted hover:text-dashboard-text">
          <Link href="/leads">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to all enquiries
          </Link>
        </Button>
      </div>

      <PageHeader
        title={message.subject || "Contact form enquiry"}
        description={`Submitted on ${formatDate(message.created_at, "long")} at ${formatTime(message.created_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <a
                href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject || "Your enquiry with Premium Property Checks"}`)}`}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" /> Reply by email
              </a>
            </Button>

            <Button variant="outline" size="sm" onClick={handleToggleRead}>
              {message.is_read ? (
                <>
                  <Mail className="mr-1.5 h-3.5 w-3.5" /> Mark unread
                </>
              ) : (
                <>
                  <MailOpen className="mr-1.5 h-3.5 w-3.5" /> Mark read
                </>
              )}
            </Button>

            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-6 max-w-3xl">
        {/* Contact Information Card */}
        <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-5 text-sm space-y-3">
          <h3 className="font-semibold text-dashboard-text uppercase tracking-wider text-xs">
            Sender details
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <span className="text-xs text-dashboard-muted flex items-center gap-1">
                <User className="h-3 w-3" /> Name
              </span>
              <p className="font-medium text-dashboard-text">{message.full_name}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-dashboard-muted flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </span>
              <a href={`mailto:${message.email}`} className="font-mono text-dashboard-primary hover:underline block truncate">
                {message.email}
              </a>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-dashboard-muted flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone
              </span>
              {message.phone ? (
                <a href={`tel:${message.phone}`} className="font-mono text-dashboard-text hover:underline block truncate">
                  {message.phone}
                </a>
              ) : (
                <p className="text-dashboard-muted italic text-xs">Not provided</p>
              )}
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-dashboard-border pb-3">
            <h3 className="font-semibold text-dashboard-text text-base">
              {message.subject || "Enquiry Message"}
            </h3>
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider",
                message.is_read
                  ? "bg-dashboard-surface text-dashboard-muted"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold",
              )}
            >
              {message.is_read ? "Read" : "Unread"}
            </span>
          </div>

          <div className="py-2 text-dashboard-text leading-relaxed whitespace-pre-wrap font-body text-sm">
            {message.message}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete enquiry"
        description="Are you sure you want to delete this enquiry? This action cannot be undone."
        confirmLabel="Delete message"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
