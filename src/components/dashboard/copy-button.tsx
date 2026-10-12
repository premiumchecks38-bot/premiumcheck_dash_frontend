"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Copies a value to the clipboard, with a short confirmation. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      aria-label={label}
      onClick={() =>
        void navigator.clipboard.writeText(value).then(
          () => {
            setCopied(true);
            toast.success("Copied.");
            setTimeout(() => setCopied(false), 1500);
          },
          () => toast.error("Copying is blocked in this browser."),
        )
      }
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
