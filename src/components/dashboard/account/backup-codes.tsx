"use client";

import * as React from "react";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** The backup codes file: one code per line, with a short note. */
export function backupCodesText(codes: readonly string[], email: string): string {
  return [
    "Premium Property Checks dashboard: two factor backup codes",
    `Account: ${email}`,
    "Each code works once. Keep this file somewhere safe.",
    "",
    ...codes,
    "",
  ].join("\n");
}

/** Shown once, right after two factor sign in is turned on. The codes cannot be shown again. */
export function BackupCodes({
  codes,
  email,
  onDone,
  doneLabel,
}: {
  codes: string[];
  email: string;
  onDone: () => void;
  doneLabel: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const text = backupCodesText(codes, email);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setSaved(true);
      toast.success("Backup codes copied.");
    } catch {
      toast.error("Copying is blocked in this browser. Download the file instead.");
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "premiumchecks-backup-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  };

  return (
    <div className="space-y-4" data-testid="backup-codes">
      <Alert variant="warning" title="Save your backup codes now">
        If you lose your phone, each code lets you sign in once. They will not be shown again.
      </Alert>
      <ol className="grid max-w-md grid-cols-2 gap-2 rounded-md border-thin border-border bg-surface p-4 font-mono text-small text-text">
        {codes.map((code) => (
          <li key={code} className="tabular-nums" data-testid="backup-code">
            {code}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
          {copied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}{" "}
          Copy codes
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={download}
          data-testid="download-backup-codes"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Download as .txt
        </Button>
        <Button
          type="button"
          variant="accent"
          size="sm"
          onClick={onDone}
          disabled={!saved}
          data-testid="backup-codes-done"
        >
          {doneLabel}
        </Button>
      </div>
      {saved ? null : (
        <p className="font-body text-caption text-text-muted">
          Copy or download the codes to continue.
        </p>
      )}
    </div>
  );
}
