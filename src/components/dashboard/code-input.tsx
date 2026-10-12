"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

export interface CodeInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  invalid?: boolean;
  describedBy?: string;
  /** Focus the first box when shown (the 2FA step, where the code is the only task). */
  focusFirst?: boolean;
  label: string;
}

/**
 * Six separate digit boxes that behave like one field: typing moves forward, Backspace moves
 * back, and pasting a whole code (with or without spaces) fills every box.
 */
export function CodeInput({
  id,
  value,
  onChange,
  onComplete,
  length = 6,
  invalid,
  describedBy,
  focusFirst,
  label,
}: CodeInputProps) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const update = (next: string, focusIndex: number) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    refs.current[Math.min(focusIndex, length - 1)]?.focus();
    if (clean.length === length) onComplete?.(clean);
  };

  return (
    <div role="group" aria-label={label} className="flex gap-2" id={id}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          id={index === 0 ? `${id}-0` : undefined}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={length}
          aria-label={`Digit ${String(index + 1)} of ${String(length)}`}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={focusFirst && index === 0}
          value={digit}
          className={cn(
            "h-touch w-11 rounded-md border-thin border-border bg-background text-center font-heading text-h4 text-text tabular-nums",
            "focus-visible:outline-focus focus-visible:outline-focus-ring",
            invalid && "border-error-border",
          )}
          onChange={(event) => {
            const typed = event.target.value.replace(/\D/g, "");
            if (typed.length > 1) {
              // Pasted or auto filled: fill from this box onwards.
              update(value.slice(0, index) + typed, index + typed.length);
              return;
            }
            const next = value.slice(0, index) + typed + value.slice(index + 1);
            update(next, typed ? index + 1 : index);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digit && index > 0) {
              event.preventDefault();
              update(value.slice(0, index - 1) + value.slice(index), index - 1);
            } else if (event.key === "ArrowLeft" && index > 0) {
              refs.current[index - 1]?.focus();
            } else if (event.key === "ArrowRight" && index < length - 1) {
              refs.current[index + 1]?.focus();
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
            if (!pasted) return;
            event.preventDefault();
            update(pasted, pasted.length);
          }}
        />
      ))}
    </div>
  );
}
