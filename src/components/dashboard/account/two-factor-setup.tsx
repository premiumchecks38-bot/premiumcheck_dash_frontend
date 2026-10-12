"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { CodeInput } from "@/components/dashboard/code-input";
import { useSessionUser } from "@/components/dashboard/session-context";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Schemas, TwoFactorSetup as SetupData } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";

import { BackupCodes } from "./backup-codes";

/** "JBSWY3DPEHPK3PXP" as "JBSW Y3DP EHPK 3PXP", easier to type into an app. */
export function groupKey(secret: string): string {
  return secret.replace(/(.{4})(?=.)/g, "$1 ");
}

/**
 * Turn on two factor sign in: scan the QR code (or type the key), confirm with a code from
 * the app, then save the backup codes. Used on the security page and the forced setup page.
 */
export function TwoFactorSetupFlow({
  onFinished,
  finishLabel,
}: {
  onFinished: () => void;
  finishLabel: string;
}) {
  const user = useSessionUser();
  const [setup, setSetup] = React.useState<SetupData | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [codes, setCodes] = React.useState<string[] | null>(null);
  const [copied, setCopied] = React.useState(false);
  const started = React.useRef(false);

  const start = React.useCallback(async () => {
    setFailure(null);
    try {
      setSetup(await admin<SetupData>("/auth/2fa/setup", { method: "POST" }));
    } catch (error) {
      setFailure(errorMessage(error));
    }
  }, []);

  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  const verify = async (value: string) => {
    if (busy || value.length !== 6) return;
    setBusy(true);
    setFailure(null);
    try {
      const result = await admin<Schemas["TwoFactorEnableResponse"]>("/auth/2fa/enable", {
        json: { code: value },
      });
      setCodes(result.backup_codes);
    } catch (error) {
      setFailure(errorMessage(error));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const copyKey = async () => {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      toast.success("Setup key copied.");
    } catch {
      toast.error("Copying is blocked in this browser. Type the key instead.");
    }
  };

  if (codes)
    return (
      <BackupCodes codes={codes} email={user.email} onDone={onFinished} doneLabel={finishLabel} />
    );

  return (
    <div className="space-y-6" data-testid="two-factor-setup">
      {failure ? (
        <Alert variant="error" data-testid="two-factor-setup-error">
          {failure}
        </Alert>
      ) : null}
      <ol className="space-y-6 font-body text-small text-text">
        <li className="space-y-3">
          <p className="font-semibold">1. Scan this QR code with an authenticator app</p>
          <p className="text-text-muted">
            For example Google Authenticator, Microsoft Authenticator or 1Password.
          </p>
          {setup ? (
            // eslint-disable-next-line @next/next/no-img-element -- inline SVG from the API, not a remote image
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qr_code_svg)}`}
              alt="QR code for setting up two factor sign in"
              className="h-48 w-48 rounded-md border-thin border-border bg-white p-2"
              data-testid="two-factor-qr"
            />
          ) : (
            <Skeleton className="h-48 w-48" />
          )}
        </li>
        <li className="space-y-2">
          <p className="font-semibold">Or type this key into the app</p>
          <div className="flex flex-wrap items-center gap-2">
            <code
              className="rounded-sm bg-surface px-3 py-2 font-mono text-small tracking-wider"
              data-testid="two-factor-secret"
            >
              {setup ? groupKey(setup.secret) : "Loading..."}
            </code>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={!setup}
              onClick={() => void copyKey()}
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}{" "}
              Copy key
            </Button>
          </div>
        </li>
        <li className="space-y-3">
          <p className="font-semibold">2. Enter the 6 digit code the app shows</p>
          <CodeInput
            id="setup-code"
            label="6 digit code from your app"
            value={code}
            onChange={setCode}
            onComplete={(value) => void verify(value)}
            invalid={Boolean(failure)}
          />
          <Button
            type="button"
            variant="accent"
            size="sm"
            loading={busy}
            disabled={!setup || code.length !== 6}
            onClick={() => void verify(code)}
          >
            Turn on two factor sign in
          </Button>
        </li>
      </ol>
    </div>
  );
}
