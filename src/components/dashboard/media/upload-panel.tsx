"use client";

import * as React from "react";
import { CheckCircle2, FileUp, XCircle } from "lucide-react";

import { SelectField } from "@/components/dashboard/content/text-field";
import type { Media, MediaFolder } from "@/lib/api/schemas";
import { errorMessage } from "@/lib/client/errors";
import { fileProblem, fileSize, MEDIA_FOLDERS, uploadImage } from "@/lib/media/upload";
import { cn } from "@/lib/utils/cn";

interface Upload {
  key: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "failed";
  error?: string;
}

/**
 * Drag and drop (or choose) one or more images; each goes straight to Cloudinary into the
 * chosen folder with its own progress bar, then is registered in the media library.
 */
export function UploadPanel({
  defaultFolder = "general",
  onUploaded,
  idPrefix = "upload",
}: {
  defaultFolder?: MediaFolder;
  onUploaded: (items: Media[]) => void;
  idPrefix?: string;
}) {
  const [folder, setFolder] = React.useState<MediaFolder>(defaultFolder);
  const [uploads, setUploads] = React.useState<Upload[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const inputId = `${idPrefix}-files`;

  const patch = (key: string, change: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...change } : u)));

  const start = (files: FileList | File[]) => {
    const list = Array.from(files);
    const fresh: Upload[] = list.map((file, i) => {
      const problem = fileProblem(file);
      return {
        key: `${String(Date.now())}-${String(i)}-${file.name}`,
        file,
        progress: 0,
        status: problem ? "failed" : "uploading",
        error: problem ?? undefined,
      };
    });
    setUploads((current) => [...fresh, ...current]);
    void Promise.all(
      fresh
        .filter((u) => u.status === "uploading")
        .map(async (u) => {
          try {
            const media = await uploadImage(u.file, folder, (p) => patch(u.key, { progress: p }));
            patch(u.key, { status: "done", progress: 1 });
            return media;
          } catch (error) {
            patch(u.key, { status: "failed", error: errorMessage(error) });
            return null;
          }
        }),
    ).then((results) => {
      const done = results.filter((m): m is Media => m !== null);
      if (done.length) onUploaded(done);
    });
  };

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <SelectField
          id={`${idPrefix}-folder`}
          label="Folder"
          value={folder}
          onChange={(v) => setFolder(v as MediaFolder)}
          options={MEDIA_FOLDERS}
        />
      </div>
      <label
        htmlFor={inputId}
        className={cn(
          "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-thick border-dashed border-border p-6 text-center font-body text-small",
          dragging && "border-primary bg-surface",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          start(event.dataTransfer.files);
        }}
        data-testid="upload-dropzone"
      >
        <FileUp className="h-7 w-7 text-text-muted" aria-hidden="true" />
        <span className="font-semibold">Drop images here, or choose files</span>
        <span className="text-caption text-text-muted">
          JPG, PNG, WebP, GIF, SVG or AVIF, up to 20 MB each. You can choose several.
        </span>
        <input
          id={inputId}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
          className="sr-only"
          onChange={(event) => {
            if (event.target.files?.length) start(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {uploads.length ? (
        <ul className="space-y-2" aria-label="Uploads" data-testid="upload-list">
          {uploads.map((u) => (
            <li
              key={u.key}
              className="rounded-md border-thin border-border p-3 font-body text-small"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-semibold">{u.file.name}</span>
                <span className="flex shrink-0 items-center gap-1 text-caption text-text-muted">
                  {fileSize(u.file.size)}
                  {u.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-success-text" aria-label="Uploaded" />
                  ) : u.status === "failed" ? (
                    <XCircle className="h-4 w-4 text-error-text" aria-label="Failed" />
                  ) : null}
                </span>
              </div>
              <progress
                className="mt-2 h-2 w-full accent-primary"
                max={100}
                value={Math.round(u.progress * 100)}
                aria-label={`Upload progress for ${u.file.name}`}
              />
              {u.error ? <p className="mt-1 text-caption text-error-text">{u.error}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
