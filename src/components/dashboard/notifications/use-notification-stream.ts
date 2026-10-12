"use client";

import * as React from "react";

import type { Notification } from "@/lib/api/schemas";

/** Reconnect delays after the stream drops: 1s, 2s, 4s ... capped at 30s. */
export function backoffDelay(attempt: number): number {
  return Math.min(30_000, 1000 * 2 ** Math.max(0, attempt));
}

/**
 * Live notifications through the BFF (/api/admin/notifications/stream, Server Sent Events).
 * Reconnects with exponential backoff, and closes while the tab is hidden (reopening, plus a
 * refetch through onResume, when it is visible again).
 */
export function useNotificationStream(
  onNotification: (notification: Notification) => void,
  onResume: () => void,
): void {
  const handlers = React.useRef({ onNotification, onResume });
  React.useEffect(() => {
    handlers.current = { onNotification, onResume };
  });

  React.useEffect(() => {
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let stopped = false;

    const close = () => {
      source?.close();
      source = null;
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const open = () => {
      close();
      if (stopped || document.visibilityState === "hidden") return;
      source = new EventSource("/api/admin/notifications/stream");
      source.addEventListener("open", () => {
        attempt = 0;
      });
      source.addEventListener("notification", (event) => {
        try {
          handlers.current.onNotification(
            JSON.parse((event as MessageEvent<string>).data) as Notification,
          );
        } catch {
          // Ignore a malformed event.
        }
      });
      source.addEventListener("error", () => {
        close();
        timer = setTimeout(open, backoffDelay(attempt));
        attempt += 1;
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        close();
      } else {
        attempt = 0;
        handlers.current.onResume();
        open();
      }
    };

    open();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      close();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
