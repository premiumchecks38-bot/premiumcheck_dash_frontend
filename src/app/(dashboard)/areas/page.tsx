"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { CheckField, SelectField, TextField } from "@/components/dashboard/content/text-field";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { Area, PostcodePrefix } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { cleanDeep } from "@/lib/text/clean";

export interface AreaTreeItem extends Area {
  children?: AreaTreeItem[];
}

export default function AreasPage() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("areas");

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [editingArea, setEditingArea] = React.useState<AreaTreeItem | "new" | null>(null);
  const [postcodeArea, setPostcodeArea] = React.useState<AreaTreeItem | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Coverage test tool state
  const [testPostcode, setTestPostcode] = React.useState("");
  const [testResult, setTestResult] = React.useState<{
    covered: boolean;
    area_name?: string;
    in_congestion_zone?: boolean;
    message?: string;
  } | null>(null);
  const [testing, setTesting] = React.useState(false);

  const areasQuery = useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => admin<AreaTreeItem[]>("/admin/areas"),
  });

  const areas = areasQuery.data ?? [];

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function handleToggleActive(area: AreaTreeItem) {
    try {
      await admin(`/admin/areas/${area.id}/toggle-active`, { method: "POST" });
      toast.success(area.is_active ? "Area deactivated" : "Area activated");
      queryClient.invalidateQueries({ queryKey: ["admin", "areas"] });
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  async function handleDelete(id: string) {
    try {
      await admin(`/admin/areas/${id}`, { method: "DELETE" });
      toast.success("Area deleted");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "areas"] });
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  async function handleTestCoverage(e: React.FormEvent) {
    e.preventDefault();
    if (!testPostcode.trim()) return;
    setTesting(true);
    try {
      const res = await admin<{
        covered: boolean;
        area_name?: string;
        in_congestion_zone?: boolean;
        message?: string;
      }>("/public/coverage/check", {
        query: { postcode: testPostcode.trim() },
      });
      setTestResult(res);
    } catch (err) {
      toast.error(actionErrorMessage(err));
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Areas"
        description="Territorial coverage, postcode mapping and regional landing page content."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Catalog" },
          { label: "Areas" },
        ]}
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => setEditingArea("new")}>
              <Plus className="mr-2 h-4 w-4" /> Add area
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-6">
        {/* Coverage test checker card */}
        <div className="rounded-lg border border-dashboard-border bg-dashboard-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-dashboard-text">Test postcode coverage</h2>
              <p className="text-xs text-dashboard-muted">
                Check whether an outward code (e.g. SW1A or E14) is mapped to an active service area.
              </p>
            </div>
            <form onSubmit={handleTestCoverage} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. SW1A 1AA"
                value={testPostcode}
                onChange={(e) => setTestPostcode(e.target.value.toUpperCase())}
                className="h-9 w-36 rounded-md border border-dashboard-border bg-dashboard-surface px-3 text-sm text-dashboard-text uppercase placeholder:normal-case focus:border-dashboard-primary focus:outline-none"
              />
              <Button type="submit" size="sm" variant="outline" disabled={testing}>
                <Search className="mr-1.5 h-3.5 w-3.5" />
                {testing ? "Checking..." : "Check"}
              </Button>
            </form>
          </div>

          {testResult && (
            <div className="mt-3 flex items-center gap-3 rounded-md border border-dashboard-border bg-dashboard-surface px-3 py-2 text-xs">
              {testResult.covered ? (
                <>
                  <span className="flex items-center text-emerald-500 font-medium">
                    <Check className="mr-1 h-3.5 w-3.5" /> Covered: {testResult.area_name}
                  </span>
                  {testResult.in_congestion_zone && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-500 font-medium">
                      Congestion Zone
                    </span>
                  )}
                </>
              ) : (
                <span className="flex items-center text-rose-500 font-medium">
                  <X className="mr-1 h-3.5 w-3.5" /> Not covered by any active area
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 text-xs text-dashboard-muted"
                onClick={() => setTestResult(null)}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Areas Tree View */}
        {areasQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : areasQuery.isError ? (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage(areasQuery.error)}</span>
          </Alert>
        ) : areas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-dashboard-border p-12 text-center">
            <p className="text-sm text-dashboard-muted">No areas created yet.</p>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setEditingArea("new")}
              >
                <Plus className="mr-2 h-4 w-4" /> Add first area
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-dashboard-border rounded-lg border border-dashboard-border bg-dashboard-card overflow-hidden">
            {areas.map((parent) => {
              const isExp = expanded.has(parent.id);
              const hasChildren = parent.children && parent.children.length > 0;

              return (
                <div key={parent.id} className="group">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-dashboard-surface/40 transition-colors">
                    <div className="flex items-center gap-2">
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(parent.id)}
                          className="rounded p-1 text-dashboard-muted hover:bg-dashboard-surface hover:text-dashboard-text"
                          aria-label={isExp ? "Collapse" : "Expand"}
                        >
                          {isExp ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <div className="w-6" />
                      )}

                      <MapPin className="h-4 w-4 text-dashboard-primary" />
                      <span className="font-medium text-dashboard-text">{parent.name}</span>
                      <span className="text-xs text-dashboard-muted font-mono">/{parent.slug}</span>
                      <StatusBadge
                        kind="content"
                        status={parent.is_active ? "published" : "draft"}
                        label={parent.is_active ? "Active" : "Inactive"}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPostcodeArea(parent)}
                        className="text-xs"
                      >
                        Postcodes
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(parent)}
                            className="text-xs text-dashboard-muted hover:text-dashboard-text"
                          >
                            {parent.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingArea(parent)}
                            aria-label="Edit area"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                            onClick={() => setDeleteId(parent.id)}
                            aria-label="Delete area"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Nested child areas */}
                  {hasChildren && isExp && (
                    <div className="border-t border-dashboard-border bg-dashboard-surface/20 divide-y divide-dashboard-border">
                      {parent.children?.map((child: AreaTreeItem) => (
                        <div
                          key={child.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-3 pl-14 hover:bg-dashboard-surface/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-dashboard-text">{child.name}</span>
                            <span className="text-xs text-dashboard-muted font-mono">
                              /{child.slug}
                            </span>
                            <StatusBadge
                              kind="content"
                              status={child.is_active ? "published" : "draft"}
                              label={child.is_active ? "Active" : "Inactive"}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPostcodeArea(child)}
                              className="text-xs"
                            >
                              Postcodes
                            </Button>
                            {canEdit && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleActive(child)}
                                  className="text-xs text-dashboard-muted hover:text-dashboard-text"
                                >
                                  {child.is_active ? "Deactivate" : "Activate"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingArea(child)}
                                  aria-label="Edit area"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                  onClick={() => setDeleteId(child.id)}
                                  aria-label="Delete area"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Area Edit / Create Dialog */}
      {editingArea && (
        <AreaDialog
          area={editingArea === "new" ? null : editingArea}
          allAreas={areas}
          open={Boolean(editingArea)}
          onClose={() => setEditingArea(null)}
          onSaved={() => {
            setEditingArea(null);
            queryClient.invalidateQueries({ queryKey: ["admin", "areas"] });
          }}
        />
      )}

      {/* Postcode Prefixes Sheet */}
      {postcodeArea && (
        <PostcodeSheet
          area={postcodeArea}
          canEdit={canEdit}
          open={Boolean(postcodeArea)}
          onClose={() => setPostcodeArea(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete area"
        description="Are you sure you want to delete this area? Any child areas will become top-level, and associated postcodes will be unmapped."
        confirmLabel="Delete area"
        destructive
        onConfirm={async () => {
          if (deleteId) await handleDelete(deleteId);
        }}
      />
    </>
  );
}

function AreaDialog({
  area,
  allAreas,
  open,
  onClose,
  onSaved,
}: {
  area: AreaTreeItem | null;
  allAreas: AreaTreeItem[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !area;
  const [name, setName] = React.useState(area?.name ?? "");
  const [slug, setSlug] = React.useState(area?.slug ?? "");
  const [intro, setIntro] = React.useState(area?.intro ?? "");
  const [description, setDescription] = React.useState(area?.content ?? area?.intro ?? "");
  const [parentId, setParentId] = React.useState(area?.parent_id ?? "");
  const [isActive, setIsActive] = React.useState(area?.is_active ?? true);

  const saveAction = useSave();

  // Filter possible parents: cannot be itself
  const parentOptions = [
    { value: "", label: "None (Top level area)" },
    ...allAreas
      .filter((a) => !area || a.id !== area.id)
      .map((a) => ({ value: a.id, label: a.name })),
  ];

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Area name is required");
      return;
    }

    const payload = cleanDeep({
      name: name.trim(),
      slug: slug.trim() || undefined,
      intro: intro.trim() || null,
      content: description.trim() || null,
      parent_id: parentId || null,
      is_active: isActive,
    });

    const ok = await saveAction.run(async () => {
      if (isNew) {
        await admin("/admin/areas", {
          method: "POST",
          json: payload,
        });
        toast.success("Area created");
      } else {
        await admin(`/admin/areas/${area.id}`, {
          method: "PATCH",
          json: payload,
        });
        toast.success("Area updated");
      }
      onSaved();
    });

    if (!ok && saveAction.error) {
      toast.error(actionErrorMessage(saveAction.error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add area" : "Edit area"}</DialogTitle>
          <DialogDescription>
            Configure geographic regional page, URL slug and parent hierarchy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <TextField
            label="Area name"
            value={name}
            onChange={(val) => {
              setName(val);
              if (isNew && !slug) {
                setSlug(
                  val
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, ""),
                );
              }
            }}
            placeholder="e.g. Central London"
            required
          />

          <TextField
            label="URL slug"
            value={slug}
            onChange={setSlug}
            placeholder="e.g. central-london"
            required
          />

          <SelectField
            label="Parent area"
            value={parentId}
            onChange={setParentId}
            options={parentOptions}
          />

          <TextField
            label="Introduction"
            value={intro}
            onChange={setIntro}
            placeholder="Brief summary displayed in area cards and meta descriptions..."
            multiline
            rows={2}
          />

          <TextField
            label="Main description / content"
            value={description}
            onChange={setDescription}
            placeholder="Detailed description of coverage and property inspection services in this area..."
            multiline
            rows={4}
          />

          <CheckField
            label="Active area"
            hint="Active areas appear in public navigation and can receive inspection bookings."
            checked={isActive}
            onChange={setIsActive}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saveAction.busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveAction.busy}>
            {saveAction.busy ? "Saving..." : isNew ? "Create area" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PostcodeSheet({
  area,
  canEdit,
  open,
  onClose,
}: {
  area: AreaTreeItem;
  canEdit: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [newPrefix, setNewPrefix] = React.useState("");
  const [bulkInput, setBulkInput] = React.useState("");
  const [bulkMode, setBulkMode] = React.useState(false);

  const query = useQuery({
    queryKey: ["admin", "areas", area.id, "postcodes"],
    queryFn: () => admin<PostcodePrefix[]>(`/admin/areas/${area.id}/postcodes`),
  });

  const postcodes = query.data ?? [];

  async function handleAddSingle(e: React.FormEvent) {
    e.preventDefault();
    const prefix = newPrefix.trim().toUpperCase();
    if (!prefix) return;

    try {
      await admin(`/admin/areas/${area.id}/postcodes`, {
        method: "POST",
        json: { postcode_prefix: prefix },
      });
      setNewPrefix("");
      toast.success(`Prefix ${prefix} added`);
      queryClient.invalidateQueries({ queryKey: ["admin", "areas", area.id, "postcodes"] });
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  async function handleAddBulk(e: React.FormEvent) {
    e.preventDefault();
    const prefixes = bulkInput
      .split(/[\s,]+/)
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);

    if (prefixes.length === 0) return;

    try {
      await admin(`/admin/areas/${area.id}/postcodes/bulk`, {
        method: "POST",
        json: { prefixes },
      });
      setBulkInput("");
      setBulkMode(false);
      toast.success(`${prefixes.length} postcode prefixes added`);
      queryClient.invalidateQueries({ queryKey: ["admin", "areas", area.id, "postcodes"] });
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  async function handleDelete(prefixId: string, prefixText: string) {
    try {
      await admin(`/admin/areas/${area.id}/postcodes/${prefixId}`, { method: "DELETE" });
      toast.success(`Prefix ${prefixText} removed`);
      queryClient.invalidateQueries({ queryKey: ["admin", "areas", area.id, "postcodes"] });
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Postcodes for {area.name}</SheetTitle>
          <SheetDescription>
            Outward codes mapped to this area for booking and coverage calculations.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {canEdit && (
            <div className="rounded-lg border border-dashboard-border bg-dashboard-card p-3">
              {!bulkMode ? (
                <form onSubmit={handleAddSingle} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. SW1 or EC1A"
                      value={newPrefix}
                      onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
                      className="h-9 flex-1 rounded-md border border-dashboard-border bg-dashboard-surface px-3 text-sm text-dashboard-text uppercase placeholder:normal-case focus:border-dashboard-primary focus:outline-none"
                    />
                    <Button type="submit" size="sm">
                      Add
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBulkMode(true)}
                    className="text-xs text-dashboard-primary hover:underline"
                  >
                    Switch to bulk add
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAddBulk} className="space-y-2">
                  <textarea
                    placeholder="Enter prefixes separated by spaces, commas or newlines (e.g. SW1, SW2, SW3)"
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value.toUpperCase())}
                    rows={3}
                    className="w-full rounded-md border border-dashboard-border bg-dashboard-surface p-2 text-xs text-dashboard-text uppercase placeholder:normal-case focus:border-dashboard-primary focus:outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setBulkMode(false)}
                      className="text-xs text-dashboard-muted hover:underline"
                    >
                      Single add
                    </button>
                    <Button type="submit" size="sm">
                      Add all
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-dashboard-muted">
              Mapped prefixes ({postcodes.length})
            </h3>

            {query.isLoading ? (
              <div className="space-y-1">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : postcodes.length === 0 ? (
              <p className="text-xs text-dashboard-muted italic py-4 text-center">
                No postcode prefixes assigned to this area yet.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
                {postcodes.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border border-dashboard-border bg-dashboard-card px-3 py-1.5 text-xs"
                  >
                    <span className="font-mono font-semibold text-dashboard-text">{p.postcode_prefix}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.postcode_prefix)}
                        className="text-dashboard-muted hover:text-red-500"
                        aria-label={`Remove prefix ${p.postcode_prefix}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
