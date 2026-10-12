"use client";

import * as React from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import { toast } from "sonner";

import { SelectField } from "@/components/dashboard/content/text-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { BrowsePage, Media, MediaFolder, MediaImportResult } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { MEDIA_FOLDERS } from "@/lib/media/upload";
import { cn } from "@/lib/utils/cn";

/**
 * Browse the Cloudinary account (inside this site's root folder) for images uploaded there
 * directly, pick some and import them into the media library.
 */
export function ImportPanel({ onImported }: { onImported: (items: Media[]) => void }) {
  const queryClient = useQueryClient();
  const [folder, setFolder] = React.useState<MediaFolder | "">("");
  const [search, setSearch] = React.useState("");
  const [term, setTerm] = React.useState("");
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const browse = useInfiniteQuery({
    queryKey: ["cloudinary-browse", folder, term],
    queryFn: ({ pageParam }) =>
      admin<BrowsePage>("/media/cloudinary-browse", {
        query: { folder: folder || undefined, search: term || undefined, cursor: pageParam },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
  const items = browse.data?.pages.flatMap((p) => p.items) ?? [];

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const importSelected = async () => {
    setBusy(true);
    try {
      const result = await admin<MediaImportResult>("/media/import", {
        json: { public_ids: [...picked] },
      });
      const parts = [`${String(result.imported.length)} imported`];
      if (result.skipped.length)
        parts.push(`${String(result.skipped.length)} already in the library`);
      if (result.failed.length) parts.push(`${String(result.failed.length)} failed`);
      toast.success(`${parts.join(", ")}.`);
      setPicked(new Set());
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await queryClient.invalidateQueries({ queryKey: ["cloudinary-browse"] });
      if (result.imported.length) onImported(result.imported);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <SelectField
            id="import-folder"
            label="Folder"
            value={folder}
            onChange={(v) => setFolder(v as MediaFolder | "")}
            options={MEDIA_FOLDERS}
            placeholder="Every folder"
          />
        </div>
        <div className="min-w-56 flex-1">
          <Label htmlFor="import-search">Search</Label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-subtle"
              aria-hidden="true"
            />
            <Input
              id="import-search"
              type="search"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="File name"
            />
          </div>
        </div>
        <Button
          variant="accent"
          size="sm"
          disabled={picked.size === 0}
          loading={busy}
          onClick={() => void importSelected()}
          data-testid="import-selected"
        >
          Import {picked.size ? String(picked.size) : ""} selected
        </Button>
      </div>

      {browse.isError ? <Alert variant="error">{errorMessage(browse.error)}</Alert> : null}
      {browse.isPending ? (
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="font-body text-small text-text-muted">
          Nothing found in Cloudinary for this folder and search.
        </p>
      ) : (
        <ul
          aria-label="Images in Cloudinary"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          data-testid="cloudinary-grid"
        >
          {items.map((item) => {
            const on = picked.has(item.public_id);
            const name = item.public_id.split("/").pop() ?? item.public_id;
            return (
              <li key={item.public_id}>
                <Button
                  type="button"
                  variant="control"
                  size="none"
                  disabled={item.registered}
                  aria-pressed={on}
                  onClick={() => toggle(item.public_id)}
                  className={cn(
                    "relative block w-full overflow-hidden rounded-md border-thick bg-surface text-left",
                    on ? "border-primary" : "border-transparent hover:border-border-strong",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail. */}
                  <img
                    src={item.thumb_url}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  <span className="block truncate px-2 py-1.5 font-body text-caption">
                    {name}
                    {item.registered ? ", already in the library" : ""}
                  </span>
                  {on ? (
                    <span className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </span>
                  ) : null}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {browse.hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          loading={browse.isFetchingNextPage}
          onClick={() => void browse.fetchNextPage()}
        >
          Load more
        </Button>
      ) : null}
    </div>
  );
}
