"use client";

import * as React from "react";

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
import { Input } from "@/components/ui/input";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** For dangerous actions: the person must type this word before confirming. */
  confirmWord?: string;
  onConfirm: () => Promise<void> | void;
}

/** Confirmation before an action. Dangerous ones ask the person to type a word first. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  confirmWord,
  onConfirm,
}: ConfirmDialogProps) {
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const inputId = React.useId();
  const matches = !confirmWord || typed.trim().toLowerCase() === confirmWord.toLowerCase();

  const close = (next: boolean) => {
    if (!next) setTyped("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {confirmWord ? (
          <FormField id={inputId} label={`Type ${confirmWord} to confirm`}>
            <Input
              id={inputId}
              value={typed}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
            />
          </FormField>
        ) : null}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => close(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "primary" : "accent"}
            size="sm"
            loading={busy}
            disabled={!matches}
            className={destructive ? "bg-error-text hover:bg-error-text" : undefined}
            onClick={() =>
              void (async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  close(false);
                } finally {
                  setBusy(false);
                }
              })()
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
