"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SelectField, TextField, CheckField } from "@/components/dashboard/content/text-field";
import { SlugField } from "@/components/dashboard/content/slug-field";
import { SortableList, reorderPayload } from "@/components/dashboard/content/sortable-list";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { ImageField, type ImageValue } from "@/components/dashboard/media/image-field";
import { useImageById } from "@/components/dashboard/media/use-image";
import { usePermission } from "@/components/dashboard/session-context";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useSave } from "@/components/dashboard/use-save";
import { useUnsavedChanges } from "@/components/dashboard/use-unsaved-changes";
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
import type { Category } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { ICON_KEYS, iconLabel } from "@/lib/catalog/icons";
import { isDirty } from "@/lib/forms/unsaved";
import { cleanDeep } from "@/lib/text/clean";

import { useCategories } from "./services-view";

/** Service categories: order, create, edit, hide, delete (blocked while they have services). */
export function CategoriesPanel() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("services");
  const [showDeleted, setShowDeleted] = React.useState(false);
  const categories = useCategories(showDeleted);
  const [editing, setEditing] = React.useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<Category | null>(null);
  const items = categories.data ?? [];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["categories"] });
    await queryClient.invalidateQueries({ queryKey: ["services"] });
  };

  const act = async (path: string, message: string, method = "POST", json?: unknown) => {
    try {
      await admin(path, { method, json });
      toast.success(message);
      await refresh();
    } catch (error) {
      toast.error(actionErrorMessage(error));
    }
  };

  const reorder = async (next: Category[]) => {
    queryClient.setQueryData(["categories", showDeleted], next);
    try {
      await admin("/categories/reorder", {
        method: "PUT",
        json: reorderPayload(next.filter((c) => !c.deleted_at), (c) => c.id),
      });
      toast.success("Order saved.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
    await refresh();
  };

  return (
    <div className="space-y-4" data-testid="categories-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CheckField id="categories-deleted" label="Show deleted categories" checked={showDeleted} onChange={setShowDeleted} />
        {canEdit ? (
          <Button size="sm" variant="accent" onClick={() => setEditing("new")} data-testid="new-category">
            <Plus className="h-4 w-4" aria-hidden="true" /> New category
          </Button>
        ) : null}
      </div>
      {categories.isError ? <Alert variant="error">{errorMessage(categories.error)}</Alert> : null}
      {categories.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <SortableList
          items={items}
          getId={(c) => c.id}
          getLabel={(c) => c.name}
          onReorder={(next) => void reorder(next)}
          disabled={!canEdit || showDeleted}
          label="Categories in website order"
          testId="categories-list"
          renderItem={(c, handle) => (
            <div className="flex flex-wrap items-center gap-3 rounded-md border-thin border-border bg-background px-3 py-2 font-body text-small">
              {handle}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text">{c.name}</p>
                <p className="text-caption text-text-muted">
                  /services/category/{c.slug}, {c.service_count} {c.service_count === 1 ? "service" : "services"}, {iconLabel(c.icon_key)}
                </p>
              </div>
              {c.deleted_at ? (
                <StatusBadge kind="content" status="deleted" label="Deleted" />
              ) : (
                <StatusBadge kind="content" status={c.is_active ? "active" : "inactive"} label={c.is_active ? "Active" : "Hidden"} />
              )}
              {canEdit ? (
                <div className="flex gap-1">
                  {c.deleted_at ? (
                    <Button variant="ghost" size="xs" onClick={() => void act(`/categories/${c.id}/restore`, "Category restored.")}>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restore
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          void act(`/categories/${c.id}`, c.is_active ? "Category hidden." : "Category active.", "PATCH", {
                            is_active: !c.is_active,
                          })
                        }
                      >
                        {c.is_active ? "Hide" : "Activate"}
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )}
        />
      )}
      {editing ? (
        <CategoryDialog
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => void refresh()}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "this category"}?`}
        description={
          deleting && deleting.service_count > 0
            ? `It still has ${String(deleting.service_count)} services. Move or delete them first.`
            : "It disappears from the website. You can restore it later."
        }
        confirmLabel="Delete category"
        destructive
        onConfirm={async () => {
          if (deleting) await act(`/categories/${deleting.id}`, "Category deleted.", "DELETE");
          setDeleting(null);
        }}
      />
    </div>
  );
}

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  icon_key: string;
  image: ImageValue | null;
}

function CategoryDialog({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const image = useImageById(category?.image_id);
  const initial: CategoryForm = {
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    description: category?.description ?? "",
    icon_key: category?.icon_key ?? "",
    image: null,
  };
  const [form, setForm] = React.useState<CategoryForm>(initial);
  const [imageTouched, setImageTouched] = React.useState(false);
  const save = useSave();
  const currentImage = imageTouched ? form.image : image;
  const dirty = isDirty({ ...initial, image: null }, { ...form, image: null }) || imageTouched;
  useUnsavedChanges(dirty);

  const submit = async () => {
    if (!form.name.trim()) {
      save.setFieldErrors({ name: "Enter a name" });
      return;
    }
    const body = {
      ...cleanDeep({ name: form.name.trim(), description: form.description.trim() || null }),
      slug: form.slug || null,
      icon_key: form.icon_key || null,
      image_id: currentImage?.id ?? null,
    };
    const result = await save.run(
      () =>
        category
          ? admin(`/categories/${category.id}`, { method: "PATCH", json: body })
          : admin("/categories", { json: body }),
      category ? "Category saved." : "Category created.",
    );
    if (result) {
      onSaved();
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-dvh max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{category ? `Edit ${category.name}` : "New category"}</DialogTitle>
          <DialogDescription>Categories group services on the website and in the menus.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {save.error ? <Alert variant="error">{save.error}</Alert> : null}
          <TextField
            id="category-name"
            label="Name"
            required
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
            error={save.fieldErrors.name}
            maxLength={200}
          />
          <SlugField
            id="category-slug"
            value={form.slug}
            onChange={(slug) => setForm((f) => ({ ...f, slug }))}
            title={form.name}
            prefix="/services/category/"
            savedSlug={category?.slug ?? null}
            error={save.fieldErrors.slug}
          />
          <TextField
            id="category-description"
            label="Description"
            multiline
            rows={3}
            value={form.description}
            onChange={(description) => setForm({ ...form, description })}
          />
          <SelectField
            id="category-icon"
            label="Icon"
            value={form.icon_key}
            onChange={(icon_key) => setForm({ ...form, icon_key })}
            options={ICON_KEYS.map((i) => ({ value: i.value, label: i.label }))}
            placeholder="No icon"
          />
          <ImageField
            id="category-image"
            label="Image"
            folder="categories"
            value={currentImage}
            onChange={(value) => {
              setImageTouched(true);
              setForm({ ...form, image: value });
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" size="sm" loading={save.busy} onClick={() => void submit()} data-testid="category-save">
            {category ? "Save category" : "Create category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
