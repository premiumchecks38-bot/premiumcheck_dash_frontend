"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Mail,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmailLog, EmailLogsPage } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { cn } from "@/lib/utils/cn";

export default function EmailLogPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [previewTemplate, setPreviewTemplate] = React.useState<string | null>(null);
  const [resendingId, setResendingId] = React.useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin", "email-logs", search, statusFilter],
    queryFn: () =>
      admin<EmailLogsPage>("/admin/email-logs", {
        query: {
          to: search.trim() || undefined,
          status: statusFilter || undefined,
          page_size: 50,
        },
      }),
  });

  const logs = query.data?.data ?? [];
  const quota = query.data?.quota;

  async function handleResend(logId: string) {
    setResendingId(logId);
    try {
      await admin(`/admin/email-logs/${logId}/resend`, { method: "POST" });
      toast.success("Email queued for resending");
      queryClient.invalidateQueries({ queryKey: ["admin", "email-logs"] });
    } catch (err) {
      toast.error(actionErrorMessage(err));
    } finally {
      setResendingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Email log"
        description="Every transactional email queued, sent or failed across customer and staff workflows."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Admin" },
          { label: "Email log" },
        ]}
      />

      <div className="space-y-6">
        {/* Sending Quota Banner */}
        {quota && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashboard-border bg-dashboard-card p-4 text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-dashboard-text uppercase tracking-wider text-[11px]">
                Email Service Quota
              </span>
              <p className="text-dashboard-muted">
                Sent today: <strong>{quota.daily_used ?? 0}</strong> emails.
              </p>
            </div>
            {quota.daily_limit && (
              <div className="rounded bg-dashboard-surface px-3 py-1.5 font-mono text-dashboard-text font-medium">
                {quota.daily_used ?? 0} / {quota.daily_limit} daily limit
              </div>
            )}
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dashboard-muted" />
            <Input
              placeholder="Search recipient email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded border border-dashboard-border bg-dashboard-surface px-3 text-xs text-dashboard-text focus:outline-none"
            >
              <option value="">All statuses</option>
              <option value="sent">Sent</option>
              <option value="queued">Queued</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Email Logs Table */}
        {query.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage(query.error)}</span>
          </Alert>
        ) : logs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-dashboard-border p-12 text-center text-sm text-dashboard-muted">
            No email logs found matching search.
          </div>
        ) : (
          <div className="rounded-lg border border-dashboard-border bg-dashboard-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-dashboard-border bg-dashboard-surface/40 text-dashboard-muted">
                    <th className="py-3 px-4 font-medium">Recipient</th>
                    <th className="py-3 px-4 font-medium">Template</th>
                    <th className="py-3 px-4 font-medium">Subject</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Sent at</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashboard-border">
                  {logs.map((log) => {
                    const isFailed = log.status === "failed";
                    const isQueued = log.status === "queued";

                    return (
                      <tr key={log.id} className="hover:bg-dashboard-surface/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-dashboard-text">
                          {log.to_email}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => setPreviewTemplate(log.template)}
                            className="font-mono text-[11px] text-dashboard-primary hover:underline"
                          >
                            {log.template}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-dashboard-text max-w-xs truncate">
                          {log.subject}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                              isFailed && "bg-rose-500/10 text-rose-500",
                              isQueued && "bg-amber-500/10 text-amber-500",
                              !isFailed && !isQueued && "bg-emerald-500/10 text-emerald-500",
                            )}
                          >
                            {isFailed ? (
                              <XCircle className="h-3 w-3" />
                            ) : isQueued ? (
                              <Clock className="h-3 w-3" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            <span className="capitalize">{log.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-dashboard-muted font-mono text-[11px]">
                          <DateTimeText value={log.sent_at ?? log.created_at} style="short" />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setPreviewTemplate(log.template)}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={resendingId === log.id}
                              onClick={() => handleResend(log.id)}
                            >
                              <RefreshCw
                                className={cn("mr-1 h-3 w-3", resendingId === log.id && "animate-spin")}
                              />
                              Resend
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Email Template Preview Dialog */}
      {previewTemplate && (
        <TemplatePreviewDialog
          templateName={previewTemplate}
          open={Boolean(previewTemplate)}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </>
  );
}

function TemplatePreviewDialog({
  templateName,
  open,
  onClose,
}: {
  templateName: string;
  open: boolean;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["admin", "email-templates", templateName, "preview"],
    queryFn: () => admin<{ html: string; subject?: string }>(`/admin/email-templates/${templateName}/preview`),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Preview: {templateName}</DialogTitle>
          <DialogDescription>
            Sample rendered preview with placeholder test context.
          </DialogDescription>
        </DialogHeader>

        {query.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : query.isError ? (
          <p className="text-xs text-rose-500 py-4">Failed to load preview for this template.</p>
        ) : (
          <div className="rounded-lg border border-dashboard-border overflow-hidden bg-white">
            <iframe
              srcDoc={query.data?.html ?? ""}
              title="Email template preview"
              className="h-96 w-full border-0"
              sandbox="allow-same-origin"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
