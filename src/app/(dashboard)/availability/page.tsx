"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { TextField } from "@/components/dashboard/content/text-field";
import { usePermission } from "@/components/dashboard/session-context";
import { useSave } from "@/components/dashboard/use-save";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { admin } from "@/lib/client/api";
import { actionErrorMessage } from "@/lib/client/errors";
import { formatDate } from "@/lib/utils/format";

interface AppointmentWindow {
  id: string;
  code: string;
  label: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
  window: { id: string; code: string; label: string } | null;
}

/**
 * Customers can book either fixed window on any date that is not in the past and not blocked
 * here. There is no limit on bookings per window.
 */
export default function AvailabilityPage() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("availability");
  const [blockingDialog, setBlockingDialog] = React.useState<"single" | "range" | null>(null);
  const [unblockId, setUnblockId] = React.useState<string | null>(null);

  const windowsQuery = useQuery({
    queryKey: ["admin", "availability", "windows"],
    queryFn: () => admin<AppointmentWindow[]>("/admin/availability/windows"),
  });
  const blockedQuery = useQuery({
    queryKey: ["admin", "availability", "blocked"],
    queryFn: () => admin<BlockedDate[]>("/admin/availability/blocked-dates"),
  });

  const windows = (windowsQuery.data ?? []).filter((w) => w.is_active);
  const blockedDates = blockedQuery.data ?? [];

  async function handleUnblock(id: string) {
    try {
      await admin(`/admin/availability/blocked-dates/${id}`, { method: "DELETE" });
      toast.success("Date unblocked");
      setUnblockId(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "availability"] });
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  function onBlocked() {
    setBlockingDialog(null);
    void queryClient.invalidateQueries({ queryKey: ["admin", "availability"] });
  }

  return (
    <>
      <PageHeader
        title="Availability"
        description="Customers can book any date that is not in the past and not blocked."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Catalog" },
          { label: "Availability" },
        ]}
      />

      <div className="space-y-6">
        <div className="border-dashboard-border bg-dashboard-card rounded-lg border p-4">
          <h2 className="text-sm text-dashboard-text font-semibold">Appointment times</h2>
          <p className="text-xs text-dashboard-muted mt-1">
            These times are offered every day. Block a date below to stop bookings on it.
          </p>
          {windowsQuery.isLoading ? (
            <Skeleton className="mt-3 h-9 w-72" />
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {windows.map((w) => (
                <span
                  key={w.id}
                  className="border-dashboard-border bg-dashboard-surface text-xs text-dashboard-text inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5"
                >
                  <Clock className="text-dashboard-muted h-3.5 w-3.5" aria-hidden="true" />
                  {w.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm text-dashboard-text font-semibold">
                Blocked dates ({blockedDates.length})
              </h2>
              <p className="text-xs text-dashboard-muted">
                Bank holidays, closures or days off. Customers cannot book a blocked date.
              </p>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setBlockingDialog("single")}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Block single date
                </Button>
                <Button size="sm" onClick={() => setBlockingDialog("range")}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Block date range
                </Button>
              </div>
            )}
          </div>

          {blockedQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : blockedDates.length === 0 ? (
            <div className="border-dashboard-border text-sm text-dashboard-muted rounded-lg border border-dashed p-12 text-center">
              No dates are blocked. Customers can book any upcoming date.
            </div>
          ) : (
            <div className="divide-dashboard-border border-dashboard-border bg-dashboard-card divide-y overflow-hidden rounded-lg border">
              {blockedDates.map((b) => (
                <div
                  key={b.id}
                  className="hover:bg-dashboard-surface/30 flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="text-rose-500 h-4 w-4" aria-hidden="true" />
                    <div>
                      <span className="text-dashboard-text font-medium">
                        {formatDate(b.date, "weekday")}
                        {b.window ? ` (${b.window.label} only)` : ""}
                      </span>
                      {b.reason && (
                        <p className="text-xs text-dashboard-muted italic">
                          &quot;{b.reason}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
                      onClick={() => setUnblockId(b.id)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Unblock
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {blockingDialog === "single" && (
        <BlockSingleDateDialog open onClose={() => setBlockingDialog(null)} onSaved={onBlocked} />
      )}
      {blockingDialog === "range" && (
        <BlockRangeDialog open onClose={() => setBlockingDialog(null)} onSaved={onBlocked} />
      )}

      <ConfirmDialog
        open={Boolean(unblockId)}
        onOpenChange={(open) => !open && setUnblockId(null)}
        title="Unblock date"
        description="Customers will be able to book this date again straight away."
        confirmLabel="Unblock date"
        onConfirm={async () => {
          if (unblockId) await handleUnblock(unblockId);
        }}
      />
    </>
  );
}

function BlockSingleDateDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = React.useState("");
  const saveAction = useSave();

  async function handleSave() {
    if (!date || !reason.trim()) return;
    const done = await saveAction.run(async () => {
      await admin("/admin/availability/blocked-dates", {
        method: "POST",
        json: { date, reason: reason.trim() },
      });
      return true;
    }, "Date blocked");
    if (done) onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block single date</DialogTitle>
          <DialogDescription>
            Customers cannot book this date. The reason is shown on the booking calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label htmlFor="block-date" className="text-xs text-dashboard-muted font-medium">
              Date
            </label>
            <input
              id="block-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-dashboard-border bg-dashboard-card text-sm text-dashboard-text focus:border-dashboard-primary mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none"
            />
          </div>

          <TextField
            label="Reason"
            required
            maxLength={255}
            value={reason}
            onChange={setReason}
            placeholder="e.g. Bank holiday or Staff training"
          />
          {saveAction.error && (
            <p role="alert" className="text-xs text-red-500">
              {saveAction.error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saveAction.busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saveAction.busy || !reason.trim()}>
            {saveAction.busy ? "Saving..." : "Block date"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BlockRangeDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [startDate, setStartDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = React.useState("");
  const saveAction = useSave();

  async function handleSave() {
    if (!startDate || !endDate || !reason.trim()) return;
    if (endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }

    const done = await saveAction.run(async () => {
      await admin("/admin/availability/blocked-dates/range", {
        method: "POST",
        json: { start_date: startDate, end_date: endDate, reason: reason.trim() },
      });
      return true;
    }, "Date range blocked");
    if (done) onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block date range</DialogTitle>
          <DialogDescription>
            Block consecutive dates for holidays or closures. The reason is shown on the booking
            calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="block-start" className="text-xs text-dashboard-muted font-medium">
                Start date
              </label>
              <input
                id="block-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-dashboard-border bg-dashboard-card text-sm text-dashboard-text focus:border-dashboard-primary mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="block-end" className="text-xs text-dashboard-muted font-medium">
                End date
              </label>
              <input
                id="block-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-dashboard-border bg-dashboard-card text-sm text-dashboard-text focus:border-dashboard-primary mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none"
              />
            </div>
          </div>

          <TextField
            label="Reason"
            required
            maxLength={255}
            value={reason}
            onChange={setReason}
            placeholder="e.g. Christmas and New Year closure"
          />
          {saveAction.error && (
            <p role="alert" className="text-xs text-red-500">
              {saveAction.error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saveAction.busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saveAction.busy || !reason.trim()}>
            {saveAction.busy ? "Saving..." : "Block dates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
