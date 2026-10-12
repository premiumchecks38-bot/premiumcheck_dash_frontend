"use client";

import * as React from "react";
import { AlertTriangle, Check, ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Media } from "@/lib/api/schemas";
import { cn } from "@/lib/utils/cn";

/**
 * Thumbnails of media items. Each is a toggle button (aria-pressed) so keyboard and screen
 * reader users can pick images; the alt text, or the file name when it is missing, is read out.
 */
export function MediaGrid({
  items,
  selected,
  onToggle,
  label,
  testId = "media-grid",
}: {
  items: Media[];
  selected: ReadonlySet<string>;
  onToggle: (item: Media) => void;
  label: string;
  testId?: string;
}) {
  return (
    <ul
      aria-label={label}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      data-testid={testId}
    >
      {items.map((item) => {
        const on = selected.has(item.id);
        const name = item.alt_text ?? item.title ?? item.original_filename ?? item.public_id;
        return (
          <li key={item.id}>
            <Button
              type="button"
              variant="control"
              size="none"
              aria-pressed={on}
              onClick={() => onToggle(item)}
              className={cn(
                "group relative block w-full overflow-hidden rounded-md border-thick bg-surface text-left",
                on ? "border-primary" : "border-transparent hover:border-border-strong",
              )}
              data-testid="media-item"
            >
              <span className="block aspect-square w-full bg-surface-alt">
                {item.is_missing ? (
                  <span className="flex h-full w-full items-center justify-center text-text-muted">
                    <ImageOff className="h-6 w-6" aria-hidden="true" />
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnails are already resized.
                  <img
                    src={item.urls.thumb}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </span>
              <span className="block truncate px-2 py-1.5 font-body text-caption text-text">
                {name}
              </span>
              {!item.alt_text ? (
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-sm bg-warning-bg px-1.5 py-0.5 font-body text-micro font-semibold text-warning-text">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" /> No alt text
                </span>
              ) : null}
              {on ? (
                <span className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
              ) : null}
              <span className="sr-only">{on ? ", selected" : ""}</span>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
