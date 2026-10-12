"use client";

import * as React from "react";

import { Spinner } from "@/components/ui/spinner";
import { request } from "@/lib/client/api";

/** Sign out (this device) as soon as the page opens, then show the sign in page. */
export function LogoutRunner() {
  React.useEffect(() => {
    void request("/api/auth/logout", { method: "POST" })
      .catch(() => null)
      .finally(() => window.location.replace("/login"));
  }, []);
  return (
    <p className="mt-4 flex items-center gap-3 font-body text-small text-text-muted" role="status">
      <Spinner size="sm" /> One moment.
    </p>
  );
}
