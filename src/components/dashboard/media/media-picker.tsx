"use client";

import * as React from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { SelectField, TextField } from "@/components/dashboard/content/text-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Media, MediaFolder } from "@/lib/api/schemas";
import { admin, adminPage } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { MEDIA_FOLDERS } from "@/lib/media/upload";

import { ImportPanel } from "./import-panel";
import { MediaGrid } from "./media-grid";
import { UploadPanel } from "./upload-panel";

const PAGE_SIZE = 24;

/** The media library: folder filter, search and "Load more". */
export function LibraryBrowser({
  folder: initialFolder = "",
  selected,
  onToggle,
}: {
  folder?: MediaFolder | "";
  selected: ReadonlySet<string>;
  onToggle: (item: Media) => void;
}) {
  const [folder, setFolder] = React.useState<MediaFolder | "">(initialFolder);
  const [search, setSearch] = React.useState("");
  const [term, setTerm] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const library = useInfiniteQuery({
    queryKey: ["media", "picker", folder, term],
    queryFn: ({ pageParam }) =>
      adminPage<Media[]>("/media", {
        query: {
          folder: folder || undefined,
          search: term || undefined,
          page: pageParam,
          page_size: PAGE_SIZE,
        },
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.total_pages ? last.meta.page + 1 : undefined,
  });
  const items = library.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <SelectField
            id="picker-folder"
            label="Folder"
            value={folder}
            onChange={(v) => setFolder(v as MediaFolder | "")}
            options={MEDIA_FOLDERS}
            placeholder="Every folder"
          />
        </div>
        <div className="min-w-56 flex-1">
          <Label htmlFor="picker-search">Search</Label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-subtle"
              aria-hidden="true"
            />
            <Input
              id="picker-search"
              type="search"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Alt text, title or file name"
            />
          </div>
        </div>
      </div>
      {library.isError ? <Alert variant="error">{errorMessage(library.error)}</Alert> : null}
      {library.isPending ? (
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="font-body text-small text-text-muted">
          No images here yet. Upload one from the next tab.
        </p>
      ) : (
        <MediaGrid items={items} selected={selected} onToggle={onToggle} label="Media library" />
      )}
      {library.hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          loading={library.isFetchingNextPage}
          onClick={() => void library.fetchNextPage()}
        >
          Load more
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Choose an image for public content: from the library, uploaded from the computer or imported
 * from Cloudinary. Images on the website need alt text, so a picked image without it asks for
 * it (and saves it to the library) before it can be used.
 */
export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  folder = "general",
  title = "Choose an image",
  requireAlt = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: Media) => void;
  folder?: MediaFolder;
  title?: string;
  requireAlt?: boolean;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState("library");
  const [chosen, setChosen] = React.useState<Media | null>(null);
  const [alt, setAlt] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);

  const reset = () => {
    setChosen(null);
    setAlt("");
    setFailure(null);
    setTab("library");
  };

  const pick = (item: Media) => {
    setChosen((current) => (current?.id === item.id ? null : item));
    setAlt(item.alt_text ?? "");
    setFailure(null);
  };

  const use = async () => {
    if (!chosen) return;
    const text = alt.trim();
    if (requireAlt && !text) {
      setFailure("Describe the image for people who cannot see it before using it.");
      return;
    }
    setBusy(true);
    try {
      let media = chosen;
      if (text !== (chosen.alt_text ?? "")) {
        media = await admin<Media>(`/media/${chosen.id}`, {
          method: "PATCH",
          json: { alt_text: text || null },
        });
        await queryClient.invalidateQueries({ queryKey: ["media"] });
      }
      onSelect(media);
      reset();
      onOpenChange(false);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const uploaded = (items: Media[]) => {
    void queryClient.invalidateQueries({ queryKey: ["media"] });
    const first = items[0];
    if (first) pick(first);
    setTab("library");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-dvh max-w-5xl overflow-y-auto" data-testid="media-picker">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Pick from the library, upload from your computer or import from Cloudinary.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="library">Media library</TabsTrigger>
            <TabsTrigger value="upload">Upload from computer</TabsTrigger>
            <TabsTrigger value="import">Import from Cloudinary</TabsTrigger>
          </TabsList>
          <TabsContent value="library">
            <LibraryBrowser
              folder=""
              selected={new Set(chosen ? [chosen.id] : [])}
              onToggle={pick}
            />
          </TabsContent>
          <TabsContent value="upload">
            <UploadPanel defaultFolder={folder} onUploaded={uploaded} idPrefix="picker-upload" />
          </TabsContent>
          <TabsContent value="import">
            <ImportPanel onImported={uploaded} />
          </TabsContent>
        </Tabs>

        {chosen ? (
          <div className="mt-4 flex flex-wrap items-start gap-4 rounded-md border-thin border-border bg-surface p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail. */}
            <img src={chosen.urls.thumb} alt="" className="h-20 w-20 rounded-md object-cover" />
            <div className="min-w-64 flex-1">
              <TextField
                id="picker-alt"
                label="Alt text"
                hint="Say what the image shows, as you would to someone on the phone. Saved to the library for every use."
                value={alt}
                onChange={setAlt}
                required={requireAlt}
                maxLength={500}
                testId="picker-alt"
              />
            </div>
          </div>
        ) : null}
        {failure ? (
          <Alert variant="error" className="mt-3" data-testid="picker-error">
            {failure}
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            disabled={!chosen}
            loading={busy}
            onClick={() => void use()}
            data-testid="picker-use"
          >
            Use this image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
