"use client";

import * as React from "react";
import { CalendarClock, CheckCircle2, CloudOff, ExternalLink, Loader2 } from "lucide-react";

import { DateTimeText } from "@/components/dashboard/date-time-text";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { isoToLondonLocal, londonLocalToIso } from "@/lib/dates";

export type PublishStatus = "draft" | "scheduled" | "published";
export type AutosaveState = "idle" | "saving" | "saved" | "error";

const STATUS_LABELS: Record<PublishStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
};
const STATUS_TONE: Record<PublishStatus, string> = {
  draft: "draft",
  scheduled: "scheduled",
  published: "published",
};

/**
 * Status and publishing actions for content: Save draft, Publish, Schedule (a London date and
 * time), Unpublish, Preview on the website, the last saved time and the autosave state.
 * Sticks to the bottom of the screen while editing.
 */
export function PublishBar({
  status,
  publishedAt,
  lastSaved,
  autosave = "idle",
  dirty,
  busy,
  canEdit,
  canSchedule = true,
  previewUrl,
  previewLabel,
  onSaveDraft,
  onPublish,
  onUnpublish,
  onSchedule,
  saveLabel = "Save draft",
}: {
  status: PublishStatus;
  publishedAt?: string | null;
  lastSaved?: string | null;
  autosave?: AutosaveState;
  dirty: boolean;
  busy: boolean;
  canEdit: boolean;
  canSchedule?: boolean;
  previewUrl?: string | null;
  previewLabel?: string;
  onSaveDraft: () => void;
  onPublish: () => void;
  onUnpublish?: () => void;
  onSchedule?: (iso: string) => void;
  saveLabel?: string;
}) {
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [when, setWhen] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const openSchedule = () => {
    const start =
      publishedAt && status === "scheduled"
        ? publishedAt
        : new Date(Date.now() + 86_400_000).toISOString();
    setWhen(isoToLondonLocal(start));
    setError(null);
    setScheduleOpen(true);
  };

  const confirmSchedule = () => {
    if (!when) {
      setError("Choose a date and time");
      return;
    }
    const iso = londonLocalToIso(when);
    if (Date.parse(iso) <= Date.now()) {
      setError("Choose a time in the future, or publish now");
      return;
    }
    onSchedule?.(iso);
    setScheduleOpen(false);
  };

  return (
    <div
      className="sticky bottom-0 z-header -mx-dash-gutter mt-8 flex flex-wrap items-center justify-between gap-3 border-t-thin border-border bg-background px-dash-gutter py-3 shadow-lg"
      data-testid="publish-bar"
    >
      <div className="flex flex-wrap items-center gap-3 font-body text-small">
        <StatusBadge kind="content" status={STATUS_TONE[status]} label={STATUS_LABELS[status]} />
        {status === "scheduled" && publishedAt ? (
          <span className="text-text-muted">
            Goes live <DateTimeText value={publishedAt} style="short" />
          </span>
        ) : null}
        {status === "published" && publishedAt ? (
          <span className="text-text-muted">
            Live since <DateTimeText value={publishedAt} style="short" />
          </span>
        ) : null}
        <span
          className="flex items-center gap-1 text-text-muted"
          role="status"
          data-testid="save-state"
        >
          {autosave === "saving" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving...
            </>
          ) : autosave === "error" ? (
            <>
              <CloudOff className="h-4 w-4 text-error-text" aria-hidden="true" /> Not saved
            </>
          ) : dirty ? (
            "Unsaved changes"
          ) : lastSaved ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-success-text" aria-hidden="true" /> Saved{" "}
              <DateTimeText value={lastSaved} style="time" />
            </>
          ) : null}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {previewUrl ? (
          <Button asChild variant="ghost" size="sm">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />{" "}
              {previewLabel ?? (status === "published" ? "View on website" : "Preview")}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        ) : null}
        {canEdit ? (
          <>
            {status !== "draft" && onUnpublish ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={onUnpublish}
                data-testid="unpublish"
              >
                Unpublish
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !dirty}
              onClick={onSaveDraft}
              data-testid="save-draft"
            >
              {status === "published" ? "Save changes" : saveLabel}
            </Button>
            {canSchedule && onSchedule && status !== "published" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={openSchedule}
                data-testid="schedule"
              >
                <CalendarClock className="h-4 w-4" aria-hidden="true" />{" "}
                {status === "scheduled" ? "Reschedule" : "Schedule"}
              </Button>
            ) : null}
            {status !== "published" ? (
              <Button
                variant="accent"
                size="sm"
                loading={busy}
                onClick={onPublish}
                data-testid="publish"
              >
                Publish now
              </Button>
            ) : null}
          </>
        ) : null}
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule publishing</DialogTitle>
            <DialogDescription>
              The time is UK time (Europe/London), whatever time zone your computer is in.
            </DialogDescription>
          </DialogHeader>
          <FormField id="schedule-when" label="Publish on" error={error}>
            <input
              id="schedule-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="h-11 w-full rounded-md border-thin border-border bg-background px-3 font-body text-small text-text tabular-nums focus-visible:outline-focus focus-visible:outline-focus-ring"
              data-testid="schedule-when"
            />
          </FormField>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={confirmSchedule}
              data-testid="schedule-confirm"
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
