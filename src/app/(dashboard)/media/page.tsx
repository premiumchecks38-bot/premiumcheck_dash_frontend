"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Copy,
  ExternalLink,
  Folder,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { CopyButton } from "@/components/dashboard/copy-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { TextField } from "@/components/dashboard/content/text-field";
import { ImportPanel } from "@/components/dashboard/media/import-panel";
import { MediaGrid } from "@/components/dashboard/media/media-grid";
import { UploadPanel } from "@/components/dashboard/media/upload-panel";
import { usePermission } from "@/components/dashboard/session-context";
import { useSave } from "@/components/dashboard/use-save";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FolderCount, Media, MediaFolder, MediaUsage } from "@/lib/api/schemas";
import { admin, adminPage } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { fileSize, MEDIA_FOLDERS } from "@/lib/media/upload";
import { cleanDeep } from "@/lib/text/clean";
import { cn } from "@/lib/utils/cn";

export default function MediaPage() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("media");

  const [tab, setTab] = React.useState("library");
  const [selectedFolder, setSelectedFolder] = React.useState<MediaFolder | "all">("all");
  const [search, setSearch] = React.useState("");
  const [selectedItem, setSelectedItem] = React.useState<Media | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState(false);

  // Folders query
  const foldersQuery = useQuery({
    queryKey: ["admin", "media", "folders"],
    queryFn: () => admin<FolderCount[]>("/admin/media/folders"),
  });

  // Media list query
  const mediaQuery = useQuery({
    queryKey: ["admin", "media", selectedFolder, search],
    queryFn: async () => {
      const res = await adminPage<Media[]>("/admin/media", {
        query: {
          folder: selectedFolder === "all" ? undefined : selectedFolder,
          search: search.trim() || undefined,
          page_size: 100,
        },
      });
      return res.data;
    },
  });

  const folders = foldersQuery.data ?? [];
  const mediaItems = mediaQuery.data ?? [];

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await admin<{ registered: number; marked_missing: number }>("/admin/media/sync", {
        method: "POST",
      });
      toast.success(
        `Cloudinary sync complete: ${res.registered} imported, ${res.marked_missing} missing`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
    } catch (err) {
      toast.error(actionErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await admin(`/admin/media/${id}`, { method: "DELETE" });
      toast.success("Media asset deleted");
      setDeleteId(null);
      if (selectedItem?.id === id) setSelectedItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Media library"
        description="High-resolution assets, documents and image management hosted on Cloudinary."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Content" },
          { label: "Media" },
        ]}
        actions={
          canEdit ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", syncing && "animate-spin")} />
              {syncing ? "Syncing..." : "Sync Cloudinary"}
            </Button>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="library">Library ({mediaItems.length})</TabsTrigger>
          {canEdit && <TabsTrigger value="upload">Upload images</TabsTrigger>}
          {canEdit && <TabsTrigger value="import">Cloudinary browser</TabsTrigger>}
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          {/* Filter bar and folder chips */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dashboard-muted" />
              <Input
                placeholder="Search alt text or filename..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedFolder("all")}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition-colors",
                  selectedFolder === "all"
                    ? "bg-dashboard-primary text-dashboard-primary-foreground"
                    : "bg-dashboard-surface text-dashboard-muted hover:text-dashboard-text",
                )}
              >
                All folders
              </button>
              {folders.map((f) => (
                <button
                  key={f.folder}
                  type="button"
                  onClick={() => setSelectedFolder(f.folder)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors",
                    selectedFolder === f.folder
                      ? "bg-dashboard-primary text-dashboard-primary-foreground"
                      : "bg-dashboard-surface text-dashboard-muted hover:text-dashboard-text",
                  )}
                >
                  <span className="capitalize">{f.folder}</span>
                  <span className="opacity-70">({f.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid display */}
          {mediaQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : mediaQuery.isError ? (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage(mediaQuery.error)}</span>
            </Alert>
          ) : mediaItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-dashboard-border p-12 text-center text-sm text-dashboard-muted">
              No media found. Use the Upload tab to add image assets.
            </div>
          ) : (
            <MediaGrid
              items={mediaItems}
              selected={new Set(selectedItem ? [selectedItem.id] : [])}
              onToggle={(item) => setSelectedItem(item)}
              label="Media library images"
            />
          )}
        </TabsContent>

        {canEdit && (
          <TabsContent value="upload" className="space-y-4">
            <UploadPanel
              onUploaded={() => {
                toast.success("Images uploaded and registered");
                setTab("library");
                queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
              }}
            />
          </TabsContent>
        )}

        {canEdit && (
          <TabsContent value="import" className="space-y-4">
            <ImportPanel
              onImported={() => {
                setTab("library");
                queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
              }}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Asset Details Drawer */}
      {selectedItem && (
        <MediaDetailSheet
          media={selectedItem}
          canEdit={canEdit}
          open={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          onDelete={() => setDeleteId(selectedItem.id)}
          onUpdated={(updated) => {
            setSelectedItem(updated);
            queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
          }}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete media asset"
        description="Are you sure you want to delete this asset? If it is currently used on any page or service, it cannot be deleted."
        confirmLabel="Delete asset"
        onConfirm={async () => {
          if (deleteId) await handleDelete(deleteId);
        }}
      />
    </>
  );
}

function MediaDetailSheet({
  media,
  canEdit,
  open,
  onClose,
  onDelete,
  onUpdated,
}: {
  media: Media;
  canEdit: boolean;
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  onUpdated: (m: Media) => void;
}) {
  const [altText, setAltText] = React.useState(media.alt_text ?? "");
  const [title, setTitle] = React.useState(media.title ?? "");
  const [caption, setCaption] = React.useState(media.caption ?? "");
  const [targetFolder, setTargetFolder] = React.useState<MediaFolder>((media.folder as MediaFolder) ?? "general");
  const saveAction = useSave();

  // Usage query
  const usageQuery = useQuery({
    queryKey: ["admin", "media", media.id, "usage"],
    queryFn: () => admin<MediaUsage[]>(`/admin/media/${media.id}/usage`),
  });

  const usage = usageQuery.data;

  async function handleSaveDetails() {
    const payload = cleanDeep({
      alt_text: altText.trim() || null,
      title: title.trim() || null,
      caption: caption.trim() || null,
    });

    const ok = await saveAction.run(async () => {
      const res = await admin<Media>(`/admin/media/${media.id}`, {
        method: "PATCH",
        json: payload,
      });
      toast.success("Image metadata updated");
      onUpdated(res);
    });

    if (!ok && saveAction.error) {
      toast.error(actionErrorMessage(saveAction.error));
    }
  }

  async function handleMoveFolder() {
    if (targetFolder === media.folder) return;
    try {
      const res = await admin<Media>(`/admin/media/${media.id}/move`, {
        method: "POST",
        json: { folder: targetFolder },
      });
      toast.success(`Moved to folder ${targetFolder}`);
      onUpdated(res);
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Asset details</SheetTitle>
          <SheetDescription className="font-mono text-xs truncate">
            {media.original_filename ?? media.public_id}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Image Preview */}
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-dashboard-border bg-dashboard-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media.urls.thumb ?? media.urls.original}
              alt={media.alt_text ?? "Preview"}
              className="h-full w-full object-contain"
            />
          </div>

          {/* Quick info metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-dashboard-border bg-dashboard-surface/40 p-2">
              <span className="text-dashboard-muted">Dimensions:</span>{" "}
              <span className="font-medium text-dashboard-text">
                {media.width} x {media.height} px
              </span>
            </div>
            <div className="rounded border border-dashboard-border bg-dashboard-surface/40 p-2">
              <span className="text-dashboard-muted">Size:</span>{" "}
              <span className="font-medium text-dashboard-text">{fileSize(media.bytes)}</span>
            </div>
            <div className="rounded border border-dashboard-border bg-dashboard-surface/40 p-2">
              <span className="text-dashboard-muted">Format:</span>{" "}
              <span className="font-medium uppercase text-dashboard-text">{media.format}</span>
            </div>
            <div className="rounded border border-dashboard-border bg-dashboard-surface/40 p-2">
              <span className="text-dashboard-muted">Folder:</span>{" "}
              <span className="font-medium capitalize text-dashboard-text">{media.folder}</span>
            </div>
          </div>

          {/* Copy URLs */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-dashboard-muted">Public URLs</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={media.urls.original}
                className="h-8 flex-1 rounded border border-dashboard-border bg-dashboard-surface px-2 text-xs font-mono text-dashboard-muted truncate"
              />
              <CopyButton value={media.urls.original} label="Copy original URL" />
            </div>
          </div>

          {/* Editable Metadata Fields */}
          <div className="space-y-4">
            <TextField
              label="Alt text (for accessibility & SEO)"
              value={altText}
              onChange={setAltText}
              placeholder="Describe the image content..."
              disabled={!canEdit}
            />

            <TextField
              label="Title"
              value={title}
              onChange={setTitle}
              placeholder="Internal title or tooltip..."
              disabled={!canEdit}
            />

            <TextField
              label="Caption"
              value={caption}
              onChange={setCaption}
              placeholder="Optional caption..."
              disabled={!canEdit}
            />

            {canEdit && (
              <Button size="sm" onClick={handleSaveDetails} disabled={saveAction.busy}>
                {saveAction.busy ? "Saving..." : "Save metadata"}
              </Button>
            )}
          </div>

          {/* Move Folder */}
          {canEdit && (
            <div className="border-t border-dashboard-border pt-4">
              <label className="text-xs font-medium text-dashboard-muted">Move to folder</label>
              <div className="mt-1.5 flex items-center gap-2">
                <select
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value as MediaFolder)}
                  className="h-8 flex-1 rounded border border-dashboard-border bg-dashboard-surface px-2 text-xs text-dashboard-text focus:border-dashboard-primary focus:outline-none"
                >
                  {MEDIA_FOLDERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMoveFolder}
                  disabled={targetFolder === media.folder}
                >
                  Move
                </Button>
              </div>
            </div>
          )}

          {/* Usage Report */}
          <div className="border-t border-dashboard-border pt-4 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-dashboard-muted">
              Usage in website
            </h4>

            {usageQuery.isLoading ? (
              <Skeleton className="h-6 w-32" />
            ) : usage && usage.length > 0 ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                <p className="font-semibold">This asset is currently in use ({usage.length} reference{usage.length > 1 ? "s" : ""}):</p>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  {usage.map((u, i) => (
                    <li key={`${u.entity_id}-${i}`}>{u.label} ({u.entity_type} {u.field})</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-emerald-500">Not currently in use on any page or service.</p>
            )}
          </div>

          {/* Danger zone delete */}
          {canEdit && (
            <div className="border-t border-dashboard-border pt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-red-500 hover:bg-red-500/10"
                onClick={onDelete}
                disabled={Boolean(usage && usage.length > 0)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {usage && usage.length > 0 ? "Cannot delete while in use" : "Delete asset"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
