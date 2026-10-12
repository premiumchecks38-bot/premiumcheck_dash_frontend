"use client";

import * as React from "react";
import Link from "next/link";

import { CodeInput } from "@/components/dashboard/code-input";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ApiError, request } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { reloadTo } from "@/lib/client/navigate";

import { destinationAfterLogin } from "./login-form";

/** Second sign in step: a 6 digit code from the authenticator app, or a backup code. */
export function TwoFactorForm({ next }: { next: string | null }) {
  const [mode, setMode] = React.useState<"totp" | "backup">("totp");
  const [code, setCode] = React.useState("");
  const [backup, setBackup] = React.useState("");
  const [failure, setFailure] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [expired, setExpired] = React.useState(false);

  const submit = async (value: string) => {
    if (sending) return;
    setFailure(null);
    setSending(true);
    try {
      const { data } = await request<{
        status: "authenticated";
        two_factor_setup_required: boolean;
      }>("/api/auth/2fa/verify", { json: { code: value } });
      reloadTo(destinationAfterLogin(data, next));
    } catch (error) {
      setFailure(errorMessage(error));
      setExpired(
        error instanceof ApiError &&
          (error.code === "TWO_FACTOR_EXPIRED" || error.code === "INVALID_TWO_FACTOR_TOKEN"),
      );
      setCode("");
      setSending(false);
    }
  };

  return (
    <form
      noValidate
      aria-label="Two factor code"
      className="mt-4 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(mode === "totp" ? code : backup.trim());
      }}
    >
      {failure ? (
        <Alert variant="error" data-testid="two-factor-error">
          {failure}{" "}
          {expired ? (
            <Link href="/login" className="font-semibold underline underline-offset-4">
              Sign in again
            </Link>
          ) : null}
        </Alert>
      ) : null}

      {mode === "totp" ? (
        <FormField
          label="Code from your authenticator app"
          hint="Open the app and enter the 6 digit code for Premium Property Checks."
          id="two-factor-code-0"
        >
          <CodeInput
            id="two-factor-code"
            label="6 digit code"
            value={code}
            onChange={setCode}
            onComplete={(value) => void submit(value)}
            invalid={Boolean(failure)}
            focusFirst
          />
        </FormField>
      ) : (
        <FormField
          id="backup-code"
          label="Backup code"
          hint="One of the codes you saved when you set up two factor authentication, like k7m2q-x9p4t. Each code works once."
        >
          <Input
            id="backup-code"
            autoComplete="one-time-code"
            spellCheck={false}
            value={backup}
            onChange={(event) => setBackup(event.target.value)}
            aria-describedby="backup-code-hint"
          />
        </FormField>
      )}

      <Button
        type="submit"
        variant="accent"
        size="md"
        className="w-full"
        loading={sending}
        disabled={mode === "totp" ? code.length !== 6 : backup.trim().length < 6}
      >
        Verify and sign in
      </Button>
      <p className="text-center font-body text-small">
        <Button
          type="button"
          variant="link"
          size="none"
          onClick={() => {
            setMode(mode === "totp" ? "backup" : "totp");
            setFailure(null);
          }}
        >
          {mode === "totp" ? "Use a backup code" : "Use the authenticator app"}
        </Button>
      </p>
    </form>
  );
}
