"use client";

import * as React from "react";

import { TextField } from "@/components/dashboard/content/text-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Media } from "@/lib/api/schemas";
import { cleanText } from "@/lib/text/clean";

/** Asks for the alt text of an image pasted or dropped into the editor before it is added. */
export function AltTextDialog({
  media,
  onDone,
}: {
  media: Media | null;
  onDone: (media: Media | null, alt: string | null) => void;
}) {
  const [alt, setAlt] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [current, setCurrent] = React.useState<string | null>(null);
  if (media && media.id !== current) {
    setCurrent(media.id);
    setAlt(media.alt_text ?? "");
    setError(null);
  }

  const confirm = () => {
    const text = cleanText(alt.trim());
    if (!text) {
      setError("Describe the image before adding it");
      return;
    }
    onDone(media, text);
  };

  return (
    <Dialog open={media !== null} onOpenChange={(open) => !open && onDone(media, null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Describe this image</DialogTitle>
          <DialogDescription>
            It was uploaded to the media library. Alt text is read to people who cannot see the
            image and helps search engines.
          </DialogDescription>
        </DialogHeader>
        {media ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail.
          <img src={media.urls.thumb} alt="" className="h-24 w-24 rounded-md object-cover" />
        ) : null}
        <TextField
          id="editor-alt-text"
          label="Alt text"
          value={alt}
          onChange={setAlt}
          error={error}
          required
          maxLength={500}
        />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onDone(media, null)}>
            Do not add
          </Button>
          <Button variant="accent" size="sm" onClick={confirm}>
            Add image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
