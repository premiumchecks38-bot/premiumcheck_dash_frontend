"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { isValidSlug, slugify } from "@/lib/text/slug";
import { websiteUrl } from "@/lib/website";

/**
 * The URL slug. New items follow the title until the slug is edited by hand. The full website
 * address is shown, and changing the slug of something already live warns that the old address
 * will redirect (the backend adds the 301 automatically).
 */
export function SlugField({
  id,
  value,
  onChange,
  title,
  prefix,
  savedSlug,
  disabled,
  error,
}: {
  id: string;
  value: string;
  onChange: (slug: string) => void;
  title: string;
  /** The path before the slug, like "/services/". */
  prefix: string;
  /** The slug as stored (null for something new). */
  savedSlug: string | null;
  disabled?: boolean;
  error?: string | null;
}) {
  const [manual, setManual] = React.useState(savedSlug !== null);
  const [lastTitle, setLastTitle] = React.useState(title);
  if (!manual && title !== lastTitle) {
    setLastTitle(title);
    const next = slugify(title);
    if (next !== value) onChange(next);
  }
  const changed = savedSlug !== null && value !== savedSlug;
  const invalid = value !== "" && !isValidSlug(value);
  const path = `${prefix}${value || "..."}`;

  return (
    <FormField
      id={id}
      label="URL slug"
      hint="Lower case letters, numbers and hyphens."
      error={error ?? (invalid ? "Use lower case letters, numbers and single hyphens only" : null)}
    >
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setManual(true);
            onChange(e.target.value.toLowerCase().replace(/\s+/g, "-"));
          }}
          aria-describedby={`${id}-url`}
          data-testid="slug-input"
        />
        {!disabled && manual && savedSlug === null ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setManual(false);
              setLastTitle(title);
              onChange(slugify(title));
            }}
          >
            Match the title
          </Button>
        ) : null}
      </div>
      <p id={`${id}-url`} className="mt-1 font-body text-caption break-all text-text-muted">
        {websiteUrl(path)}
      </p>
      {changed ? (
        <p
          className="mt-1 flex items-start gap-1.5 font-body text-caption text-warning-text"
          role="status"
          data-testid="slug-redirect-warning"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Changing the slug moves the page. The old address {prefix}
          {savedSlug} will redirect here (301), so existing links keep working.
        </p>
      ) : null}
    </FormField>
  );
}
