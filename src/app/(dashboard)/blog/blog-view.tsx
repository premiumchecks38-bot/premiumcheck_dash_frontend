"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Copy, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { SlugField } from "@/components/dashboard/content/slug-field";
import { SortableList, reorderPayload } from "@/components/dashboard/content/sortable-list";
import { TextField } from "@/components/dashboard/content/text-field";
import { DataTable } from "@/components/dashboard/data-table";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/dashboard/primitives";
import { usePermission } from "@/components/dashboard/session-context";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useSave } from "@/components/dashboard/use-save";
import { useUrlFilters } from "@/components/dashboard/use-url-filters";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BlogCategory, BlogPostStatus, BlogPostSummary } from "@/lib/api/schemas";
import { admin, adminPage } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { cleanDeep } from "@/lib/text/clean";

const KEYS = ["q", "category", "status", "deleted"] as const;

export function useBlogCategories() {
  return useQuery({
    queryKey: ["blog-categories"],
    queryFn: () => admin<BlogCategory[]>("/blog-categories"),
  });
}

export function BlogView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = params.get("tab") ?? "posts";

  return (
    <div className="space-y-6" data-testid="blog-view">
      <Tabs
        value={tab}
        onValueChange={(val) =>
          router.replace((val === "posts" ? pathname : `${pathname}?tab=${val}`) as Route, {
            scroll: false,
          })
        }
      >
        <TabsList className="mb-4">
          <TabsTrigger value="posts">Blog posts</TabsTrigger>
          <TabsTrigger value="guides">Compliance hub guides</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <PostsList complianceHub={false} />
        </TabsContent>

        <TabsContent value="guides">
          <PostsList complianceHub={true} />
        </TabsContent>

        <TabsContent value="categories">
          <BlogCategoriesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PostsList({ complianceHub }: { complianceHub: boolean }) {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("blogs");
  const [filters, setFilters] = useUrlFilters(KEYS);
  const categoriesQuery = useBlogCategories();
  const [deletingPost, setDeletingPost] = React.useState<BlogPostSummary | null>(null);

  const query = {
    search: filters.q || undefined,
    category_id: filters.category || undefined,
    status: (filters.status as BlogPostStatus) || undefined,
    compliance_hub: complianceHub,
    include_deleted: filters.deleted === "true",
    page_size: 50,
  };

  const list = useQuery({
    queryKey: ["blog-posts", query],
    queryFn: () => adminPage<BlogPostSummary[]>("/blog-posts", { query }),
    placeholderData: keepPreviousData,
  });

  const rows = list.data?.data ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["blog-posts"] });

  const act = async (path: string, message: string, method = "POST") => {
    try {
      await admin(path, { method });
      toast.success(message);
      await refresh();
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  };

  const columns: ColumnDef<BlogPostSummary>[] = [
    {
      id: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link
            href={`/blog/${row.original.id}` as Route}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {row.original.title}
          </Link>
          <span className="text-caption text-text-muted">{row.original.path}</span>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => row.original.category?.name ?? "-",
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          kind="content"
          status={row.original.deleted_at ? "deleted" : row.original.status}
          label={row.original.deleted_at ? "Deleted" : undefined}
        />
      ),
    },
    {
      id: "published_at",
      header: "Date",
      cell: ({ row }) =>
        row.original.published_at ? (
          <DateTimeText value={row.original.published_at} style="date" />
        ) : (
          <span className="text-text-muted">Draft</span>
        ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) =>
        canEdit ? (
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="xs" aria-label={`Actions for ${row.original.title}`}>
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem asChild>
                <Link href={`/blog/${row.original.id}` as Route}>
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Edit post
                </Link>
              </MenuItem>
              <MenuItem
                onSelect={() =>
                  void act(`/blog-posts/${row.original.id}/duplicate`, "Post duplicated.")
                }
              >
                <Copy className="h-4 w-4" aria-hidden="true" /> Duplicate
              </MenuItem>
              {row.original.status === "published" ? (
                <MenuItem
                  onSelect={() =>
                    void act(`/blog-posts/${row.original.id}/unpublish`, "Post unpublished.")
                  }
                >
                  Unpublish
                </MenuItem>
              ) : null}
              <MenuSeparator />
              {row.original.deleted_at ? (
                <MenuItem
                  onSelect={() =>
                    void act(`/blog-posts/${row.original.id}/restore`, "Post restored.")
                  }
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restore
                </MenuItem>
              ) : (
                <MenuItem
                  className="text-error-text"
                  onSelect={() => setDeletingPost(row.original)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                </MenuItem>
              )}
            </MenuContent>
          </Menu>
        ) : null,
    },
  ];

  const categoryOptions = (categoriesQuery.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <>
      <FilterBar
        search={{ value: filters.q, label: "Search", placeholder: "Post title or keyword" }}
        selects={[
          { key: "category", label: "Category", value: filters.category, options: categoryOptions },
          {
            key: "status",
            label: "Status",
            value: filters.status,
            options: [
              { value: "draft", label: "Draft" },
              { value: "scheduled", label: "Scheduled" },
              { value: "published", label: "Published" },
            ],
          },
          {
            key: "deleted",
            label: "Deleted",
            value: filters.deleted,
            options: [{ value: "true", label: "Show deleted" }],
          },
        ]}
        onChange={(k, v) => setFilters({ [k]: v })}
        onReset={() => setFilters(Object.fromEntries(KEYS.map((k) => [k, null])))}
      />

      <DataTable
        caption={complianceHub ? "Compliance Hub Guides" : "Blog Posts"}
        columns={columns}
        data={rows}
        isLoading={list.isPending}
        error={list.isError ? errorMessage(list.error) : null}
        onRetry={() => void list.refetch()}
        getRowId={(p) => p.id}
        emptyTitle="No articles found"
        emptyDescription="Create your first article or clear filters."
        testId="blog-table"
      />

      <ConfirmDialog
        open={deletingPost !== null}
        onOpenChange={(open) => !open && setDeletingPost(null)}
        title={`Delete "${deletingPost?.title}"?`}
        description="The post will be moved to deleted and hidden from the website."
        confirmLabel="Delete post"
        destructive
        onConfirm={async () => {
          if (deletingPost) {
            await act(`/blog-posts/${deletingPost.id}`, "Post deleted.", "DELETE");
          }
          setDeletingPost(null);
        }}
      />
    </>
  );
}

function BlogCategoriesPanel() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("blogs");
  const categoriesQuery = useBlogCategories();
  const [editingCat, setEditingCat] = React.useState<BlogCategory | "new" | null>(null);
  const [deletingCat, setDeletingCat] = React.useState<BlogCategory | null>(null);

  const categories = categoriesQuery.data ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["blog-categories"] });

  const reorder = async (next: BlogCategory[]) => {
    queryClient.setQueryData(["blog-categories"], next);
    try {
      await admin("/blog-categories/reorder", {
        method: "POST",
        json: reorderPayload(next, (c) => c.id),
      });
      toast.success("Order saved.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
    await refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-small text-text-muted">Categories for organising blog posts and compliance guides.</p>
        {canEdit ? (
          <Button size="sm" variant="accent" onClick={() => setEditingCat("new")} data-testid="new-blog-cat-btn">
            <Plus className="h-4 w-4" aria-hidden="true" /> New category
          </Button>
        ) : null}
      </div>

      <SortableList
        items={categories}
        getId={(c) => c.id}
        getLabel={(c) => c.name}
        onReorder={reorder}
        disabled={!canEdit}
        label="Blog categories"
        renderItem={(c, handle) => (
          <div className="flex items-center justify-between rounded-md border-thin border-border bg-background p-3">
            <div className="flex items-center gap-3">
              {handle}
              <div>
                <p className="font-semibold text-text">{c.name}</p>
                <p className="text-caption text-text-muted">
                  /blog/category/{c.slug} ({c.post_count} posts)
                </p>
              </div>
            </div>

            {canEdit ? (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="xs" onClick={() => setEditingCat(c)}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="xs" onClick={() => setDeletingCat(c)}>
                  <Trash2 className="h-4 w-4 text-error-text" aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </div>
        )}
      />

      {editingCat ? (
        <BlogCategoryDialog
          category={editingCat === "new" ? null : editingCat}
          onClose={() => setEditingCat(null)}
          onSaved={() => {
            setEditingCat(null);
            void refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deletingCat !== null}
        onOpenChange={(open) => !open && setDeletingCat(null)}
        title={`Delete category "${deletingCat?.name}"?`}
        description="Posts in this category will become uncategorised."
        confirmLabel="Delete category"
        destructive
        onConfirm={async () => {
          if (deletingCat) {
            try {
              await admin(`/blog-categories/${deletingCat.id}`, { method: "DELETE" });
              toast.success("Category deleted.");
              await refresh();
            } catch (err) {
              toast.error(actionErrorMessage(err));
            }
          }
          setDeletingCat(null);
        }}
      />
    </div>
  );
}

function BlogCategoryDialog({
  category,
  onClose,
  onSaved,
}: {
  category: BlogCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useSave();
  const [name, setName] = React.useState(category?.name ?? "");
  const [slug, setSlug] = React.useState(category?.slug ?? "");
  const [description, setDescription] = React.useState(category?.description ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = cleanDeep({
      name: name.trim(),
      slug: slug.trim() || null,
      description: description.trim() || null,
    });

    await save.run(async () => {
      if (category) {
        await admin(`/blog-categories/${category.id}`, { method: "PATCH", json: payload });
        toast.success("Category updated.");
      } else {
        await admin("/blog-categories", { method: "POST", json: payload });
        toast.success("Category created.");
      }
      onSaved();
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? `Edit ${category.name}` : "New blog category"}</DialogTitle>
          <DialogDescription>Group posts by topic or compliance requirement.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField id="cat-name" label="Name" required value={name} onChange={setName} />
          <SlugField
            id="cat-slug"
            value={slug}
            onChange={setSlug}
            title={name}
            prefix="/blog/category/"
            savedSlug={category?.slug ?? null}
          />
          <TextField
            id="cat-desc"
            label="Description"
            multiline
            rows={2}
            value={description}
            onChange={setDescription}
          />

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" size="sm" loading={save.busy}>
              {category ? "Save category" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
