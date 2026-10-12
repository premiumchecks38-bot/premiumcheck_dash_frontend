"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  ExternalLink,
  FileText,
  Home,
  Pencil,
  Plus,
  Scale,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { SlugField } from "@/components/dashboard/content/slug-field";
import { SortableList, reorderPayload } from "@/components/dashboard/content/sortable-list";
import { SelectField, TextField } from "@/components/dashboard/content/text-field";
import { usePermission } from "@/components/dashboard/session-context";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useSave } from "@/components/dashboard/use-save";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { PageSummary, PageType } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { websiteUrl } from "@/lib/website";

export function PagesView() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("pages");

  const pagesQuery = useQuery({
    queryKey: ["pages-list"],
    queryFn: () => admin<PageSummary[]>("/pages"),
  });

  const [creatingOpen, setCreatingOpen] = React.useState(false);
  const [deletingPage, setDeletingPage] = React.useState<PageSummary | null>(null);

  const pages = pagesQuery.data ?? [];
  const topLevel = pages.filter((p) => !p.parent_id);
  const getChildren = (parentId: string) => pages.filter((p) => p.parent_id === parentId);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["pages-list"] });

  const iconForType = (type: PageType, path: string) => {
    if (path === "/") return <Home className="h-4 w-4 text-primary" aria-hidden="true" />;
    if (type === "legal") return <Scale className="h-4 w-4 text-warning-text" aria-hidden="true" />;
    return <FileText className="h-4 w-4 text-text-muted" aria-hidden="true" />;
  };

  return (
    <div className="space-y-6" data-testid="pages-view">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-h5 font-bold text-primary">Content management pages</h2>
          <p className="font-body text-caption text-text-muted">
            Static, legal and modular landing pages. Edit the Home page and manage page sections.
          </p>
        </div>
        {canEdit ? (
          <Button size="sm" variant="accent" onClick={() => setCreatingOpen(true)} data-testid="new-page-btn">
            <Plus className="h-4 w-4" aria-hidden="true" /> Create page
          </Button>
        ) : null}
      </div>

      {pagesQuery.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="rounded-lg border-thin border-border bg-background shadow-sm divide-y divide-border">
          {topLevel.map((page) => {
            const children = getChildren(page.id);
            return (
              <div key={page.id} className="p-3 hover:bg-surface-alt/40 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {iconForType(page.page_type, page.path)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/pages/${page.id}` as Route}
                          className="font-semibold text-text hover:text-primary transition-colors text-small"
                        >
                          {page.title}
                        </Link>
                        {page.page_type === "legal" ? (
                          <span className="rounded bg-warning-bg px-1.5 py-0.5 text-micro font-medium text-warning-text">
                            Legal
                          </span>
                        ) : null}
                        <span className="rounded bg-surface px-1.5 py-0.5 text-micro text-text-muted">
                          {page.section_count} sections
                        </span>
                      </div>
                      <p className="text-caption text-text-muted">{page.path}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge
                      kind="content"
                      status={page.is_published ? "published" : "draft"}
                      label={page.is_published ? "Live" : "Draft"}
                    />
                    <Button asChild variant="ghost" size="xs">
                      <a
                        href={websiteUrl(page.path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View live page"
                      >
                        <ExternalLink className="h-4 w-4 text-text-muted" aria-hidden="true" />
                      </a>
                    </Button>
                    <Button asChild variant="ghost" size="xs">
                      <Link href={`/pages/${page.id}` as Route} aria-label={`Edit ${page.title}`}>
                        <Pencil className="h-4 w-4 text-text-muted" aria-hidden="true" />
                      </Link>
                    </Button>
                    {canEdit && page.path !== "/" ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setDeletingPage(page)}
                        aria-label={`Delete ${page.title}`}
                      >
                        <Trash2 className="h-4 w-4 text-error-text" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Subpages / Children */}
                {children.length > 0 ? (
                  <div className="mt-2 ml-6 pl-4 border-l-thin border-border space-y-2">
                    {children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center justify-between gap-3 py-1 text-small"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronRight className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                          <Link
                            href={`/pages/${child.id}` as Route}
                            className="font-medium text-text hover:text-primary text-small"
                          >
                            {child.title}
                          </Link>
                          <span className="text-caption text-text-muted">{child.path}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusBadge
                            kind="content"
                            status={child.is_published ? "published" : "draft"}
                            label={child.is_published ? "Live" : "Draft"}
                          />
                          <Button asChild variant="ghost" size="xs">
                            <Link href={`/pages/${child.id}` as Route}>
                              <Pencil className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                            </Link>
                          </Button>
                          {canEdit ? (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => setDeletingPage(child)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-error-text" aria-hidden="true" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {creatingOpen ? (
        <CreatePageDialog
          pages={pages}
          onClose={() => setCreatingOpen(false)}
          onCreated={() => {
            setCreatingOpen(false);
            void refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deletingPage !== null}
        onOpenChange={(open) => !open && setDeletingPage(null)}
        title={`Delete "${deletingPage?.title}"?`}
        description="The page and all its modular sections will be permanently removed from the website."
        confirmLabel="Delete page"
        destructive
        onConfirm={async () => {
          if (deletingPage) {
            try {
              await admin(`/pages/${deletingPage.id}`, { method: "DELETE" });
              toast.success("Page deleted.");
              await refresh();
            } catch (err) {
              toast.error(actionErrorMessage(err));
            }
          }
          setDeletingPage(null);
        }}
      />
    </div>
  );
}

function CreatePageDialog({
  pages,
  onClose,
  onCreated,
}: {
  pages: PageSummary[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const save = useSave();
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [parentId, setParentId] = React.useState("");
  const [pageType, setPageType] = React.useState<PageType>("standard");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await save.run(async () => {
      await admin("/pages", {
        method: "POST",
        json: {
          title: title.trim(),
          slug: slug.trim() || null,
          parent_id: parentId || null,
          page_type: pageType,
          is_published: true,
        },
      });
      toast.success("Page created.");
      onCreated();
    });
  };

  const parentOptions = pages
    .filter((p) => p.path !== "/")
    .map((p) => ({ value: p.id, label: p.title }));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new CMS page</DialogTitle>
          <DialogDescription>
            Choose the page title, address and structure type.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField id="new-page-title" label="Page title" required value={title} onChange={setTitle} />
          <SlugField
            id="new-page-slug"
            value={slug}
            onChange={setSlug}
            title={title}
            prefix="/"
            savedSlug={null}
          />
          <SelectField
            id="new-page-parent"
            label="Parent page"
            value={parentId}
            onChange={setParentId}
            options={parentOptions}
            placeholder="None (Top level page)"
          />
          <SelectField
            id="new-page-type"
            label="Page type"
            value={pageType}
            onChange={(v) => setPageType(v as PageType)}
            options={[
              { value: "standard", label: "Standard CMS page" },
              { value: "legal", label: "Legal (Terms, Privacy, Cookies)" },
              { value: "landing", label: "Marketing landing page" },
            ]}
          />

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" size="sm" loading={save.busy}>
              Create page
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
