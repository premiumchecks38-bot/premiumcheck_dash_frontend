"use client";

import * as React from "react";

import { isLeavingClick, LEAVE_MESSAGE } from "@/lib/forms/unsaved";

/**
 * Warn before leaving a page with unsaved changes: the browser prompt on reload or close, and
 * a confirm on in app links (sidebar, breadcrumbs, buttons that are links). Pass false once
 * the form is saved.
 */
export function useUnsavedChanges(dirty: boolean, message = LEAVE_MESSAGE): void {
  React.useEffect(() => {
    if (!dirty) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      // Browsers show their own wording; preventDefault asks them to confirm.
      event.preventDefault();
    };

    const click = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest("a");
      if (!anchor || !isLeavingClick(event, anchor, window.location)) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, message]);
}
