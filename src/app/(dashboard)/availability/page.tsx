"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { CheckField, TextField } from "@/components/dashboard/content/text-field";
import { usePermission } from "@/components/dashboard/session-context";
import { useSave } from "@/components/dashboard/use-save";
import { useUnsavedChanges } from "@/components/dashboard/use-unsaved-changes";
import { Alert } from "@/components/ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

interface AppointmentWindow {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface AvailabilityRule {
  id: string;
  weekday: number; // 0 = Monday, 6 = Sunday
  window_id: string;
  capacity: number;
  is_active: boolean;
}

interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
  window_id: string | null;
  created_at: string;
}

interface SlotCapacity {
  id: string;
  date: string;
  window_id: string;
  capacity: number;
}

interface PreviewSlot {
  window_id: string;
  code: string;
  capacity: number;
  booked: number;
  available: number;
}

interface PreviewDay {
  date: string;
  is_blocked: boolean;
  slots: PreviewSlot[];
}

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function AvailabilityPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AvailabilityPageContent />
    </Suspense>
  );
}

function AvailabilityPageContent() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("availability");
  const saveAction = useSave();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "schedule";

  const [tab, setTab] = React.useState(initialTab);
  const [gridEdits, setGridEdits] = React.useState<Record<string, number>>({});
  const [blockingDialog, setBlockingDialog] = React.useState<"single" | "range" | null>(null);
  const [unblockId, setUnblockId] = React.useState<string | null>(null);

  const isGridDirty = Object.keys(gridEdits).length > 0;
  useUnsavedChanges(isGridDirty);

  // Queries
  const windowsQuery = useQuery({
    queryKey: ["admin", "availability", "windows"],
    queryFn: () => admin<AppointmentWindow[]>("/admin/availability/windows"),
  });

  const rulesQuery = useQuery({
    queryKey: ["admin", "availability", "rules"],
    queryFn: () => admin<AvailabilityRule[]>("/admin/availability/rules"),
  });

  const blockedQuery = useQuery({
    queryKey: ["admin", "availability", "blocked"],
    queryFn: () => admin<BlockedDate[]>("/admin/availability/blocked-dates"),
  });

  const previewQuery = useQuery({
    queryKey: ["admin", "availability", "preview"],
    queryFn: () => admin<PreviewDay[]>("/admin/availability/preview", { query: { days: 14 } }),
  });

  const windows = windowsQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const blockedDates = blockedQuery.data ?? [];
  const previewDays = previewQuery.data ?? [];

  // Helper to get rule capacity
  const getCapacity = (weekday: number, windowId: string): number => {
    const key = `${weekday}:${windowId}`;
    if (key in gridEdits && gridEdits[key] !== undefined) return gridEdits[key]!;
    const rule = rules.find((r) => r.weekday === weekday && r.window_id === windowId);
    return rule ? rule.capacity : 0;
  };

  const handleCellChange = (weekday: number, windowId: string, val: string) => {
    const num = parseInt(val, 10);
    const safeNum = isNaN(num) || num < 0 ? 0 : num;
    setGridEdits((prev) => ({
      ...prev,
      [`${weekday}:${windowId}`]: safeNum,
    }));
  };

  async function handleSaveWeeklyGrid() {
    if (!isGridDirty) return;

    // Build items for all weekdays and windows
    const items: { weekday: number; window_id: string; capacity: number }[] = [];
    for (let w = 0; w < 7; w++) {
      for (const win of windows) {
        items.push({
          weekday: w,
          window_id: win.id,
          capacity: getCapacity(w, win.id),
        });
      }
    }

    const ok = await saveAction.run(async () => {
      await admin("/admin/availability/rules", {
        method: "PUT",
        json: { items },
      });
      setGridEdits({});
      toast.success("Weekly schedule saved");
      queryClient.invalidateQueries({ queryKey: ["admin", "availability", "rules"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "availability", "preview"] });
    });

    if (!ok && saveAction.error) {
      toast.error(actionErrorMessage(saveAction.error));
    }
  }

  async function handleUnblock(id: string) {
    try {
      await admin(`/admin/availability/blocked-dates/${id}`, { method: "DELETE" });
      toast.success("Date unblocked");
      setUnblockId(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "availability", "blocked"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "availability", "preview"] });
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Availability"
        description="Appointment windows, weekly capacity matrix and blocked calendar dates."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Catalog" },
          { label: "Availability" },
        ]}
        actions={
          isGridDirty && canEdit && tab === "schedule" ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGridEdits({})}
                disabled={saveAction.busy}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Discard
              </Button>
              <Button size="sm" onClick={handleSaveWeeklyGrid} disabled={saveAction.busy}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saveAction.busy ? "Saving..." : "Save schedule"}
              </Button>
            </div>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="schedule">Weekly schedule</TabsTrigger>
          <TabsTrigger value="blocked">Blocked dates ({blockedDates.length})</TabsTrigger>
          <TabsTrigger value="preview">14-Day preview</TabsTrigger>
        </TabsList>

        {/* Weekly Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <div className="rounded-lg border border-dashboard-border bg-dashboard-card p-4">
            <h2 className="text-sm font-semibold text-dashboard-text">Weekly capacity matrix</h2>
            <p className="mt-1 text-xs text-dashboard-muted">
              Specify the maximum number of simultaneous inspection slots available per day and window. A value of 0 closes that slot.
            </p>

            {windowsQuery.isLoading || rulesQuery.isLoading ? (
              <div className="mt-4 space-y-2">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-dashboard-border text-dashboard-muted">
                      <th className="py-2.5 font-medium">Day of week</th>
                      {windows.map((win) => (
                        <th key={win.id} className="py-2.5 font-medium">
                          {win.name} ({win.start_time.slice(0, 5)} - {win.end_time.slice(0, 5)})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashboard-border/60">
                    {WEEKDAYS.map((dayName, weekdayIndex) => (
                      <tr key={dayName} className="hover:bg-dashboard-surface/30">
                        <td className="py-3 font-medium text-dashboard-text">{dayName}</td>
                        {windows.map((win) => {
                          const cap = getCapacity(weekdayIndex, win.id);
                          const isEdited = `${weekdayIndex}:${win.id}` in gridEdits;

                          return (
                            <td key={win.id} className="py-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={50}
                                  disabled={!canEdit}
                                  value={cap}
                                  onChange={(e) =>
                                    handleCellChange(weekdayIndex, win.id, e.target.value)
                                  }
                                  className={cn(
                                    "h-8 w-20 rounded border border-dashboard-border bg-dashboard-surface px-2.5 text-center font-mono text-sm text-dashboard-text focus:border-dashboard-primary focus:outline-none disabled:opacity-50",
                                    isEdited && "border-amber-500 bg-amber-500/10 font-bold",
                                    cap === 0 && "text-dashboard-muted",
                                  )}
                                />
                                <span className="text-[11px] text-dashboard-muted">
                                  {cap === 0 ? "Closed" : "slots"}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Blocked Dates Tab */}
        <TabsContent value="blocked" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-dashboard-text">Blocked dates</h2>
              <p className="text-xs text-dashboard-muted">
                Public holidays, maintenance, or company blackout dates when bookings cannot be accepted.
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
            <div className="rounded-lg border border-dashed border-dashboard-border p-12 text-center text-sm text-dashboard-muted">
              No dates currently blocked. All slots operate according to the weekly schedule.
            </div>
          ) : (
            <div className="rounded-lg border border-dashboard-border bg-dashboard-card divide-y divide-dashboard-border overflow-hidden">
              {blockedDates.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-4 hover:bg-dashboard-surface/30"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-rose-500" />
                    <div>
                      <span className="font-medium text-dashboard-text">
                        {formatDate(b.date, "weekday")}
                      </span>
                      {b.reason && (
                        <p className="text-xs text-dashboard-muted italic">&quot;{b.reason}&quot;</p>
                      )}
                    </div>
                  </div>

                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => setUnblockId(b.id)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Unblock
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 14-Day Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-dashboard-text">Live 14-day slot preview</h2>
            <p className="text-xs text-dashboard-muted">
              Live capacity calculation showing remaining open booking slots for the upcoming fortnight.
            </p>
          </div>

          {previewQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          ) : previewDays.length === 0 ? (
            <p className="text-xs text-dashboard-muted">No preview days available.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              {previewDays.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    "rounded-lg border p-3 text-xs transition-colors",
                    day.is_blocked
                      ? "border-rose-500/30 bg-rose-500/5 text-rose-400"
                      : "border-dashboard-border bg-dashboard-card",
                  )}
                >
                  <div className="font-semibold text-dashboard-text">
                    {formatDate(day.date, "short")}
                  </div>

                  {day.is_blocked ? (
                    <span className="mt-2 block font-medium text-rose-500">Day Blocked</span>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {day.slots.map((s) => (
                        <div
                          key={s.window_id}
                          className="flex items-center justify-between rounded bg-dashboard-surface/60 px-2 py-1 text-[11px]"
                        >
                          <span className="font-medium text-dashboard-text">{s.code}</span>
                          <span
                            className={cn(
                              s.available > 0
                                ? "text-emerald-500 font-medium"
                                : "text-dashboard-muted",
                            )}
                          >
                            {s.available} / {s.capacity} left
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Block Single Date Dialog */}
      {blockingDialog === "single" && (
        <BlockSingleDateDialog
          open={Boolean(blockingDialog)}
          onClose={() => setBlockingDialog(null)}
          onSaved={() => {
            setBlockingDialog(null);
            queryClient.invalidateQueries({ queryKey: ["admin", "availability"] });
          }}
        />
      )}

      {/* Block Range Dialog */}
      {blockingDialog === "range" && (
        <BlockRangeDialog
          open={Boolean(blockingDialog)}
          onClose={() => setBlockingDialog(null)}
          onSaved={() => {
            setBlockingDialog(null);
            queryClient.invalidateQueries({ queryKey: ["admin", "availability"] });
          }}
        />
      )}

      {/* Confirm Unblock */}
      <ConfirmDialog
        open={Boolean(unblockId)}
        onOpenChange={(open) => !open && setUnblockId(null)}
        title="Unblock date"
        description="Are you sure you want to remove this block? Slots will immediately become available according to weekly rules."
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
    if (!date) return;
    const ok = await saveAction.run(async () => {
      await admin("/admin/availability/blocked-dates", {
        method: "POST",
        json: {
          date,
          reason: reason.trim() || null,
        },
      });
      toast.success("Date blocked");
      onSaved();
    });

    if (!ok && saveAction.error) {
      toast.error(actionErrorMessage(saveAction.error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block single date</DialogTitle>
          <DialogDescription>
            Prevent inspection bookings from taking place on this date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-dashboard-muted">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-dashboard-border bg-dashboard-card px-3 py-2 text-sm text-dashboard-text focus:border-dashboard-primary focus:outline-none"
            />
          </div>

          <TextField
            label="Reason (optional)"
            value={reason}
            onChange={setReason}
            placeholder="e.g. Bank holiday or Staff training"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saveAction.busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveAction.busy}>
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
    if (!startDate || !endDate) return;
    if (endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }

    const ok = await saveAction.run(async () => {
      await admin("/admin/availability/blocked-dates/range", {
        method: "POST",
        json: {
          start_date: startDate,
          end_date: endDate,
          reason: reason.trim() || null,
        },
      });
      toast.success("Date range blocked");
      onSaved();
    });

    if (!ok && saveAction.error) {
      toast.error(actionErrorMessage(saveAction.error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block date range</DialogTitle>
          <DialogDescription>
            Block consecutive dates for holiday periods or extended closures.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dashboard-muted">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-dashboard-border bg-dashboard-card px-3 py-2 text-sm text-dashboard-text focus:border-dashboard-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-dashboard-muted">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-dashboard-border bg-dashboard-card px-3 py-2 text-sm text-dashboard-text focus:border-dashboard-primary focus:outline-none"
              />
            </div>
          </div>

          <TextField
            label="Reason (optional)"
            value={reason}
            onChange={setReason}
            placeholder="e.g. Christmas and New Year closure"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saveAction.busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveAction.busy}>
            {saveAction.busy ? "Saving..." : "Block dates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
