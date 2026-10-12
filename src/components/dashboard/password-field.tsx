"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

/** Password input with a show and hide toggle (announced to screen readers). */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-14", className)}
          spellCheck={false}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="none"
          className="absolute inset-y-0 right-0 flex min-w-touch items-center justify-center rounded-md"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={props.id}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
