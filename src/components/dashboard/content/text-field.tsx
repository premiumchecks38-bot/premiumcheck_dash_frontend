"use client";

import * as React from "react";

import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CLEANED_NOTE, cleanText, needsCleaning } from "@/lib/text/clean";
import { cn } from "@/lib/utils/cn";

/**
 * A labelled text input or text area for website copy. Pasted text and the value on leaving
 * the field are cleaned (no em dashes, en dashes or emojis) and a short note says so. The
 * backend cleans again when it saves, so the website never shows them.
 */
export interface TextFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string | null;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  /** Show "12 of 60" under the field. */
  counter?: boolean;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  type?: "text" | "email" | "url" | "tel" | "search";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  className?: string;
  /** Keep exactly what was typed (codes, URLs, verification tokens). */
  raw?: boolean;
  testId?: string;
  onBlur?: () => void;
}

export function TextField({
  id: explicitId,
  label,
  value,
  onChange,
  hint,
  error,
  required,
  multiline,
  rows = 4,
  maxLength,
  counter,
  placeholder,
  disabled,
  readOnly,
  type = "text",
  inputMode,
  autoComplete,
  className,
  raw,
  testId,
  onBlur,
}: TextFieldProps) {
  const autoId = React.useId();
  const id = explicitId ?? autoId;
  const [cleaned, setCleaned] = React.useState(false);
  const noteId = `${id}-cleaned`;
  const counterId = `${id}-count`;

  const paste = (event: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (raw) return;
    const text = event.clipboardData.getData("text/plain");
    if (!needsCleaning(text)) return;
    event.preventDefault();
    const el = event.currentTarget;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const insert = cleanText(text);
    onChange(value.slice(0, start) + insert + value.slice(end));
    setCleaned(true);
    requestAnimationFrame(() => el.setSelectionRange(start + insert.length, start + insert.length));
  };

  const blur = () => {
    if (!raw && needsCleaning(value)) {
      onChange(cleanText(value));
      setCleaned(true);
    }
    onBlur?.();
  };

  const describedBy =
    [cleaned ? noteId : null, counter ? counterId : null].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    value,
    placeholder,
    disabled,
    readOnly,
    maxLength,
    required,
    onPaste: paste,
    onBlur: blur,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "data-testid": testId,
  } as const;

  return (
    <FormField
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {multiline ? (
        <Textarea {...common} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input
          {...common}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {cleaned || counter ? (
        <div className="mt-1 flex flex-wrap justify-between gap-2 font-body text-caption">
          {cleaned ? (
            <p id={noteId} role="status" className="text-text-muted">
              {CLEANED_NOTE}
            </p>
          ) : (
            <span />
          )}
          {counter ? (
            <p
              id={counterId}
              className={cn(
                "tabular-nums",
                maxLength && value.length > maxLength ? "text-error-text" : "text-text-muted",
              )}
            >
              {value.length}
              {maxLength ? ` of ${String(maxLength)}` : ""} characters
            </p>
          ) : null}
        </div>
      ) : null}
    </FormField>
  );
}

/** A labelled checkbox (a switch style toggle for settings like "Active"). */
export function CheckField({
  id: explicitId,
  label,
  checked,
  onChange,
  hint,
  disabled,
  testId,
}: {
  id?: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
  testId?: string;
}) {
  const autoId = React.useId();
  const id = explicitId ?? autoId;
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        data-testid={testId}
      />
      <div>
        <label htmlFor={id} className="cursor-pointer font-body text-small font-semibold text-text">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="font-body text-caption text-text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A labelled native select. */
export function SelectField({
  id: explicitId,
  label,
  value,
  onChange,
  options,
  hint,
  error,
  required,
  disabled,
  placeholder,
  testId,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  testId?: string;
}) {
  const autoId = React.useId();
  const id = explicitId ?? autoId;
  return (
    <FormField id={id} label={label} hint={hint} error={error} required={required}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        data-testid={testId}
        className="h-11 w-full rounded-md border-thin border-border bg-background px-3 font-body text-small text-text focus-visible:outline-focus focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
