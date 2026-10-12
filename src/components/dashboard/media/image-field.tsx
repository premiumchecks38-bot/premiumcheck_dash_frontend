"use client";

import * as React from "react";
import { ImageIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Media, MediaFolder } from "@/lib/api/schemas";

import { MediaPicker } from "./media-picker";

/** The chosen image as forms keep it: the media id and what is needed to show it. */
export interface ImageValue {
  id: string;
  url: string;
  alt: string | null;
}

export function imageValueOf(media: Media): ImageValue {
  return { id: media.id, url: media.urls.thumb, alt: media.alt_text };
}

/**
 * An image field (hero, featured, OG, avatar, logo): shows the chosen image with its alt text
 * and opens the media picker to choose or change it. Images only ever come from the media
 * library, never as pasted files or data URLs.
 */
export function ImageField({
  id,
  label,
  value,
  onChange,
  folder,
  hint,
  disabled,
  testId,
}: {
  id: string;
  label: string;
  value: ImageValue | null;
  onChange: (value: ImageValue | null) => void;
  folder?: MediaFolder;
  hint?: string;
  disabled?: boolean;
  testId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const labelId = `${id}-label`;
  return (
    <div className="space-y-1.5" data-testid={testId}>
      <p id={labelId} className="font-body text-small font-semibold text-text">
        {label}
      </p>
      {hint ? <p className="font-body text-caption text-text-muted">{hint}</p> : null}
      <div className="flex flex-wrap items-center gap-3 rounded-md border-thin border-border bg-surface p-3">
        {value?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail.
          <img src={value.url} alt="" className="h-16 w-16 rounded-md object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-md bg-surface-alt text-text-subtle">
            <ImageIcon className="h-6 w-6" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1 font-body text-small">
          {value ? (
            <p className="truncate text-text">{value.alt ?? "No alt text"}</p>
          ) : (
            <p className="text-text-muted">No image chosen</p>
          )}
        </div>
        {disabled ? null : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setOpen(true)}
              aria-describedby={labelId}
              data-testid={testId ? `${testId}-choose` : undefined}
            >
              {value ? "Change" : "Choose image"}
            </Button>
            {value ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onChange(null)}
                aria-label={`Remove ${label.toLowerCase()}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        )}
      </div>
      <MediaPicker
        open={open}
        onOpenChange={setOpen}
        folder={folder}
        title={`Choose: ${label.toLowerCase()}`}
        onSelect={(media) => onChange(imageValueOf(media))}
      />
    </div>
  );
}
