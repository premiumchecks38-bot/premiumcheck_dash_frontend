"use client";

import * as React from "react";
import { toast } from "sonner";

import { actionErrorMessage, fieldErrors as fieldErrorsOf } from "@/lib/client/errors";

/**
 * Run a save with a busy flag, a success toast, the error message and, for 422 responses,
 * the field errors. Returns the result, or null when it failed.
 */
export function useSave() {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const run = React.useCallback(
    async <T,>(action: () => Promise<T>, success?: string): Promise<T | null> => {
      setBusy(true);
      setError(null);
      setFieldErrors({});
      try {
        const result = await action();
        if (success) toast.success(success);
        return result;
      } catch (e) {
        setFieldErrors(fieldErrorsOf(e));
        setError(actionErrorMessage(e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return { busy, error, fieldErrors, run, setError, setFieldErrors };
}
