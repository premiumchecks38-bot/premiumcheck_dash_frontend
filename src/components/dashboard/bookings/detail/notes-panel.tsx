"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Panel } from "@/components/dashboard/panel";
import { Textarea } from "@/components/ui/textarea";
import type { BookingDetail } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";

type SaveState = "idle" | "saving" | "saved" | "error";

const STATE_TEXT: Record<SaveState, string> = {
  idle: "Changes save automatically.",
  saving: "Saving...",
  saved: "Saved.",
  error: "Not saved.",
};

/** Staff notes on a booking, saved a moment after typing stops. */
export function NotesPanel({ booking, canEdit }: { booking: BookingDetail; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [value, setValue] = React.useState(booking.internal_notes ?? "");
  const [state, setState] = React.useState<SaveState>("idle");
  const [failure, setFailure] = React.useState<string | null>(null);
  const saved = React.useRef(booking.internal_notes ?? "");

  React.useEffect(() => {
    if (!canEdit || value === saved.current) return;
    const timer = setTimeout(() => {
      setState("saving");
      admin<BookingDetail>(`/bookings/${booking.id}`, {
        method: "PATCH",
        json: { internal_notes: value.trim() ? value : null },
      })
        .then((updated) => {
          saved.current = value;
          queryClient.setQueryData(["booking", booking.id], updated);
          setState("saved");
          setFailure(null);
        })
        .catch((error: unknown) => {
          setState("error");
          setFailure(errorMessage(error));
        });
    }, 800);
    return () => clearTimeout(timer);
  }, [value, canEdit, booking.id, queryClient]);

  return (
    <Panel title="Internal notes" id="notes">
      <label htmlFor="internal-notes" className="sr-only">
        Internal notes
      </label>
      <Textarea
        id="internal-notes"
        rows={4}
        value={value}
        readOnly={!canEdit}
        aria-describedby="internal-notes-status"
        placeholder={canEdit ? "Only staff can see these notes." : "No notes."}
        onChange={(event) => setValue(event.target.value)}
      />
      <p
        id="internal-notes-status"
        role="status"
        className="mt-2 font-body text-caption text-text-muted"
        data-testid="notes-status"
      >
        {canEdit ? (failure ? `${STATE_TEXT.error} ${failure}` : STATE_TEXT[state]) : "View only."}
      </p>
    </Panel>
  );
}
