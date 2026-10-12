"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { TextField } from "@/components/dashboard/content/text-field";
import { SortableList, reorderPayload } from "@/components/dashboard/content/sortable-list";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { usePermission } from "@/components/dashboard/session-context";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropertyType } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { cleanText } from "@/lib/text/clean";

export function usePropertyTypes() {
  return useQuery({
    queryKey: ["property-types"],
    queryFn: () => admin<PropertyType[]>("/property-types"),
  });
}

/** Property types (house, flat, HMO...) used by price options and the booking form. */
export function PropertyTypesPanel() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("services");
  const types = usePropertyTypes();
  const [adding, setAdding] = React.useState("");
  const [editing, setEditing] = React.useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = React.useState<PropertyType | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["property-types"] });
  const act = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message);
      await refresh();
      return true;
    } catch (error) {
      toast.error(actionErrorMessage(error));
      return false;
    }
  };

  return (
    <div className="max-w-2xl space-y-4" data-testid="property-types-panel">
      <p className="font-body text-small text-text-muted">
        Property types set which price applies (for example a house or a flat) and are offered on
        the booking form in this order.
      </p>
      {types.isError ? <Alert variant="error">{errorMessage(types.error)}</Alert> : null}
      {types.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <SortableList
          items={types.data ?? []}
          getId={(t) => t.id}
          getLabel={(t) => t.name}
          disabled={!canEdit}
          label="Property types"
          onReorder={(next) =>
            void act(
              () => admin("/property-types/reorder", { method: "PUT", json: reorderPayload(next, (t) => t.id) }),
              "Order saved.",
            )
          }
          renderItem={(t, handle) => (
            <div className="flex items-center gap-3 rounded-md border-thin border-border bg-background px-3 py-2 font-body text-small">
              {handle}
              {editing?.id === t.id ? (
                <form
                  className="flex flex-1 items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(
                      () => admin(`/property-types/${t.id}`, { method: "PATCH", json: { name: cleanText(editing.name.trim()) } }),
                      "Property type renamed.",
                    ).then((ok) => ok && setEditing(null));
                  }}
                >
                  <TextField
                    id={`type-${t.id}`}
                    label={`New name for ${t.name}`}
                    value={editing.name}
                    onChange={(name) => setEditing({ id: t.id, name })}
                    className="flex-1"
                  />
                  <Button type="submit" variant="ghost" size="xs" aria-label="Save name">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" size="xs" aria-label="Cancel" onClick={() => setEditing(null)}>
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </form>
              ) : (
                <>
                  <span className="flex-1 font-semibold">{t.name}</span>
                  {canEdit ? (
                    <>
                      <Button variant="ghost" size="xs" aria-label={`Rename ${t.name}`} onClick={() => setEditing({ id: t.id, name: t.name })}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="xs" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </>
                  ) : null}
                </>
              )}
            </div>
          )}
        />
      )}
      {canEdit ? (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!adding.trim()) return;
            void act(() => admin("/property-types", { json: { name: cleanText(adding.trim()) } }), "Property type added.").then(
              (ok) => ok && setAdding(""),
            );
          }}
        >
          <TextField id="new-property-type" label="New property type" value={adding} onChange={setAdding} className="max-w-sm" />
          <Button type="submit" variant="outline" size="sm">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add
          </Button>
        </form>
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "this property type"}?`}
        description="Price options for it must be moved or deleted first; the server refuses otherwise."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const target = deleting;
          if (target) await act(() => admin(`/property-types/${target.id}`, { method: "DELETE" }), "Property type deleted.");
          setDeleting(null);
        }}
      />
    </div>
  );
}
