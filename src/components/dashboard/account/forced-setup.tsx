"use client";

import { reloadTo } from "@/lib/client/navigate";

import { TwoFactorSetupFlow } from "./two-factor-setup";

/** Setup flow that opens the dashboard when finished (a full load, so the menu appears). */
export function ForcedSetup() {
  return (
    <div className="max-w-2xl rounded-lg border-thin border-border bg-background p-6">
      <TwoFactorSetupFlow
        finishLabel="Continue to the dashboard"
        onFinished={() => reloadTo("/")}
      />
    </div>
  );
}
