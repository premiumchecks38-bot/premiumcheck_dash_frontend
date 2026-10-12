"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  ExternalLink,
  Laptop,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PublishBar, type PublishStatus } from "@/components/dashboard/content/publish-bar";
import { SeoFields, seoPayload, seoValuesOf, useSeoMeta, type SeoValues } from "@/components/dashboard/content/seo-fields";
import { SlugField } from "@/components/dashboard/content/slug-field";
import { SortableList, reorderPayload } from "@/components/dashboard/content/sortable-list";
import { CheckField, SelectField, TextField } from "@/components/dashboard/content/text-field";
import { RichTextEditor } from "@/components/dashboard/editor";
import { ImageField, type ImageValue } from "@/components/dashboard/media/image-field";
import { usePermission, useSessionUser } from "@/components/dashboard/session-context";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  PageDetail,
  PageSection,
  PageSummary,
  SectionTypeInfo,
} from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import {
  SECTION_LABELS,
  defaultsFor,
  sectionSummary,
  validateSection,
} from "@/lib/sections/schema";
import { cleanDeep } from "@/lib/text/clean";
import { websiteUrl } from "@/lib/website";

export function PageEditor({ pageId }: { pageId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("pages");
  const user = useSessionUser();

  const pageQuery = useQuery({
    queryKey: ["page-detail", pageId],
    queryFn: () => admin<PageDetail>(`/pages/${pageId}`),
  });

  const sectionTypesQuery = useQuery({
    queryKey: ["section-types"],
    queryFn: () => admin<SectionTypeInfo[]>("/pages/section-types"),
  });

  const allPagesQuery = useQuery({
    queryKey: ["pages-list"],
    queryFn: () => admin<PageSummary[]>("/pages"),
  });

  const seoMeta = useSeoMeta("page", pageId);

  // Form states
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [parentId, setParentId] = React.useState("");
  const [seoValues, setSeoValues] = React.useState<SeoValues>(seoValuesOf(null));
  const [dirty, setDirty] = React.useState(false);

  useUnsavedChanges(dirty);

  // Preview iframe state
  const [previewWidth, setPreviewWidth] = React.useState<"desktop" | "mobile">("desktop");
  const [iframeKey, setIframeKey] = React.useState(0);
  const [showLivePreview, setShowLivePreview] = React.useState(false);

  // Section modals
  const [addingSectionOpen, setAddingSectionOpen] = React.useState(false);
  const [editingSection, setEditingSection] = React.useState<PageSection | null>(null);
  const [deletingSection, setDeletingSection] = React.useState<PageSection | null>(null);

  const save = useSave();

  React.useEffect(() => {
    if (pageQuery.data) {
      const p = pageQuery.data;
      setTitle(p.title);
      setSlug(p.slug);
      setParentId(p.parent_id ?? "");
      setDirty(false);
    }
  }, [pageQuery.data]);

  React.useEffect(() => {
    if (seoMeta.data) {
      setSeoValues(seoValuesOf(seoMeta.data.meta));
    }
  }, [seoMeta.data]);

  const page = pageQuery.data;
  const isHomePage = page?.path === "/";
  const sections = page?.sections ?? [];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["page-detail", pageId] });
    await queryClient.invalidateQueries({ queryKey: ["pages-list"] });
    setIframeKey((k) => k + 1);
  };

  const handleSavePageMeta = async () => {
    if (!title.trim()) return;

    await save.run(async () => {
      const updated = await admin<PageDetail>(`/pages/${pageId}`, {
        method: "PATCH",
        json: {
          title: title.trim(),
          slug: isHomePage ? "" : slug.trim() || null,
          parent_id: parentId || null,
        },
      });

      // Save SEO
      const seoBody = seoPayload(seoValues, user.role === "owner" || user.role === "admin");
      if (seoMeta.data?.meta?.id) {
        await admin(`/seo/${seoMeta.data.meta.id}`, { method: "PATCH", json: seoBody });
      } else if (seoValues.meta_title || seoValues.meta_description) {
        await admin("/seo", {
          method: "PUT",
          json: {
            ...seoBody,
            path: updated.path,
            entity_type: "page",
            entity_id: updated.id,
          },
        });
      }

      toast.success("Page settings saved.");
      setDirty(false);
      await refresh();
    });
  };

  const handleReorderSections = async (nextSections: PageSection[]) => {
    queryClient.setQueryData(["page-detail", pageId], (old: PageDetail | undefined) =>
      old ? { ...old, sections: nextSections } : old,
    );

    try {
      await admin(`/pages/${pageId}/sections/reorder`, {
        method: "POST",
        json: reorderPayload(nextSections, (s) => s.id),
      });
      toast.success("Section order saved.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
    await refresh();
  };

  const handleDuplicateSection = async (section: PageSection) => {
    try {
      await admin(`/pages/${pageId}/sections`, {
        method: "POST",
        json: {
          type: section.type,
          data: section.data,
          sort_order: section.sort_order + 1,
          is_active: section.is_active,
        },
      });
      toast.success("Section duplicated.");
      await refresh();
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  };

  const parentOptions = (allPagesQuery.data ?? [])
    .filter((p) => p.id !== pageId && p.path !== "/")
    .map((p) => ({ value: p.id, label: p.title }));

  if (pageQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (pageQuery.isError || !page) {
    return <Alert variant="error">{errorMessage(pageQuery.error)}</Alert>;
  }

  const liveUrl = websiteUrl(page.path);

  return (
    <div className="space-y-6 pb-24" data-testid="page-editor">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={"/pages" as Route}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All pages
            </Link>
          </Button>
          <h1 className="font-heading text-h3 font-bold text-primary">
            {isHomePage ? "Home page (CMS)" : page.title}
          </h1>
          <StatusBadge
            kind="content"
            status={page.is_published ? "published" : "draft"}
            label={page.is_published ? "Published" : "Draft"}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLivePreview(!showLivePreview)}
          >
            {showLivePreview ? "Hide live preview" : "Split live preview"}
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={liveUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open live site
            </a>
          </Button>
          {canEdit ? (
            <Button
              variant="accent"
              size="sm"
              loading={save.busy}
              onClick={handleSavePageMeta}
              data-testid="save-page-btn"
            >
              Save page
            </Button>
          ) : null}
        </div>
      </div>

      {/* Legal Banner Warning */}
      {page.page_type === "legal" ? (
        <Alert variant="warning" title="Client approval requirement">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Legal text must be supplied or approved by the client before live publication.</span>
          </div>
        </Alert>
      ) : null}

      {/* Main split grid */}
      <div className={`grid gap-6 ${showLivePreview ? "lg:grid-cols-12" : "grid-cols-1"}`}>
        {/* Editor column */}
        <div className={showLivePreview ? "lg:col-span-7 space-y-6" : "space-y-6"}>
          <Tabs defaultValue="sections">
            <TabsList className="mb-4">
              <TabsTrigger value="sections">Sections ({sections.length})</TabsTrigger>
              <TabsTrigger value="meta">Page metadata</TabsTrigger>
              <TabsTrigger value="seo">SEO & Schema</TabsTrigger>
            </TabsList>

            {/* Tab: Sections Editor */}
            <TabsContent value="sections" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-h5 font-bold text-primary">Page sections</h2>
                  <p className="font-body text-caption text-text-muted">
                    Reorder and configure modular component bands making up this page.
                  </p>
                </div>
                {canEdit ? (
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => setAddingSectionOpen(true)}
                    data-testid="add-section-btn"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" /> Add section
                  </Button>
                ) : null}
              </div>

              {sections.length === 0 ? (
                <div className="rounded-lg border-thin border-dashed border-border p-8 text-center text-text-muted">
                  <p className="font-semibold text-text">No sections on this page</p>
                  <p className="text-small mb-3">Add a hero banner or rich text section to get started.</p>
                  {canEdit ? (
                    <Button size="sm" variant="outline" onClick={() => setAddingSectionOpen(true)}>
                      <Plus className="h-4 w-4" aria-hidden="true" /> Add first section
                    </Button>
                  ) : null}
                </div>
              ) : (
                <SortableList
                  items={sections}
                  getId={(s) => s.id}
                  getLabel={(s) => `${s.type}: ${sectionSummary(s.type, s.data)}`}
                  onReorder={handleReorderSections}
                  disabled={!canEdit}
                  label="Page sections list"
                  testId="sections-sortable-list"
                  renderItem={(sec, handle) => (
                    <div className="flex items-center justify-between rounded-md border-thin border-border bg-background p-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {handle}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-small text-primary">
                              {SECTION_LABELS[sec.type]?.label ?? sec.type}
                            </span>
                            {!sec.is_active ? (
                              <span className="rounded bg-surface px-1.5 py-0.5 text-micro text-text-muted">
                                Hidden
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-caption text-text-muted">
                            {sectionSummary(sec.type, sec.data)}
                          </p>
                        </div>
                      </div>

                      {canEdit ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setEditingSection(sec)}
                            aria-label={`Edit ${sec.type} section`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => void handleDuplicateSection(sec)}
                            aria-label="Duplicate section"
                          >
                            <Copy className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setDeletingSection(sec)}
                            aria-label="Delete section"
                          >
                            <Trash2 className="h-4 w-4 text-error-text" aria-hidden="true" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
                />
              )}
            </TabsContent>

            {/* Tab: Page Meta */}
            <TabsContent value="meta" className="space-y-4">
              <div className="rounded-lg border-thin border-border bg-background p-5 shadow-sm space-y-4">
                <TextField
                  id="page-title"
                  label="Page title"
                  required
                  value={title}
                  onChange={(v) => {
                    setTitle(v);
                    setDirty(true);
                  }}
                  disabled={!canEdit}
                />

                {!isHomePage ? (
                  <>
                    <SlugField
                      id="page-slug"
                      value={slug}
                      onChange={(v) => {
                        setSlug(v);
                        setDirty(true);
                      }}
                      title={title}
                      prefix="/"
                      savedSlug={page.slug}
                      disabled={!canEdit}
                    />
                    <SelectField
                      id="page-parent"
                      label="Parent page"
                      value={parentId}
                      onChange={(v) => {
                        setParentId(v);
                        setDirty(true);
                      }}
                      options={parentOptions}
                      placeholder="None (Top level page)"
                      disabled={!canEdit}
                    />
                  </>
                ) : (
                  <p className="text-caption text-text-muted">
                    This is the designated Home page (route: /). The URL slug cannot be altered.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Tab: SEO */}
            <TabsContent value="seo">
              <SeoFields
                idPrefix="page-seo"
                values={seoValues}
                onChange={(v) => {
                  setSeoValues(v);
                  setDirty(true);
                }}
                path={page.path}
                fallbackTitle={title || "Page"}
                disabled={!canEdit}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview Column (Split view with reload) */}
        {showLivePreview ? (
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between rounded-t-md bg-surface p-2 border-thin border-border">
              <span className="font-heading text-caption font-bold text-primary">Live website preview</span>
              <div className="flex items-center gap-1">
                <Button
                  variant={previewWidth === "desktop" ? "accent" : "ghost"}
                  size="xs"
                  onClick={() => setPreviewWidth("desktop")}
                >
                  <Laptop className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant={previewWidth === "mobile" ? "accent" : "ghost"}
                  size="xs"
                  onClick={() => setPreviewWidth("mobile")}
                >
                  <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setIframeKey((k) => k + 1)}
                  title="Reload preview"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div
              className={`mx-auto overflow-hidden rounded-b-md border-x-thin border-b-thin border-border bg-background shadow-md transition-all ${
                previewWidth === "mobile" ? "max-w-sm h-[680px]" : "w-full h-[680px]"
              }`}
            >
              <iframe
                key={iframeKey}
                src={liveUrl}
                title="Page live preview"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Floating Bottom Publish Bar */}
      <PublishBar
        status={page.is_published ? "published" : "draft"}
        lastSaved={page.updated_at}
        dirty={dirty}
        busy={save.busy}
        canEdit={canEdit}
        previewUrl={liveUrl}
        onSaveDraft={handleSavePageMeta}
        onPublish={async () => {
          await admin(`/pages/${pageId}`, { method: "PATCH", json: { is_published: true } });
          toast.success("Page published live.");
          await refresh();
        }}
        onUnpublish={
          isHomePage
            ? undefined
            : async () => {
                await admin(`/pages/${pageId}`, { method: "PATCH", json: { is_published: false } });
                toast.success("Page reverted to draft.");
                await refresh();
              }
        }
      />

      {/* Add Section Type Picker Modal */}
      {addingSectionOpen ? (
        <AddSectionModal
          types={sectionTypesQuery.data ?? []}
          onClose={() => setAddingSectionOpen(false)}
          onSelect={async (typeInfo) => {
            setAddingSectionOpen(false);
            const defaultData = defaultsFor(typeInfo.json_schema as any);
            try {
              const created = await admin<PageSection>(`/pages/${pageId}/sections`, {
                method: "POST",
                json: {
                  type: typeInfo.type,
                  data: defaultData,
                  is_active: true,
                },
              });
              toast.success(`Added ${SECTION_LABELS[typeInfo.type]?.label ?? typeInfo.type} section.`);
              await refresh();
              setEditingSection(created);
            } catch (err) {
              toast.error(actionErrorMessage(err));
            }
          }}
        />
      ) : null}

      {/* Edit Section Modal */}
      {editingSection ? (
        <EditSectionModal
          section={editingSection}
          sectionType={
            (sectionTypesQuery.data ?? []).find((t) => t.type === editingSection.type) ?? null
          }
          onClose={() => setEditingSection(null)}
          onSaved={() => {
            setEditingSection(null);
            void refresh();
          }}
        />
      ) : null}

      {/* Delete Section Modal */}
      <ConfirmDialog
        open={deletingSection !== null}
        onOpenChange={(open) => !open && setDeletingSection(null)}
        title="Remove section?"
        description="This content block will be deleted from the page."
        confirmLabel="Delete section"
        destructive
        onConfirm={async () => {
          if (deletingSection) {
            try {
              await admin(`/pages/${pageId}/sections/${deletingSection.id}`, { method: "DELETE" });
              toast.success("Section removed.");
              await refresh();
            } catch (err) {
              toast.error(actionErrorMessage(err));
            }
          }
          setDeletingSection(null);
        }}
      />
    </div>
  );
}

/** Add Section Modal with preview descriptions */
function AddSectionModal({
  types,
  onClose,
  onSelect,
}: {
  types: SectionTypeInfo[];
  onClose: () => void;
  onSelect: (type: SectionTypeInfo) => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-dvh max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a page section</DialogTitle>
          <DialogDescription>
            Choose a component band to insert into the page layout.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          {types.map((t) => {
            const meta = SECTION_LABELS[t.type] ?? { label: t.type, hint: t.description };
            return (
              <button
                key={t.type}
                type="button"
                onClick={() => onSelect(t)}
                className="flex flex-col text-left rounded-md border-thin border-border p-3.5 hover:border-primary hover:bg-surface transition-all group"
              >
                <span className="font-bold text-small text-primary group-hover:underline">
                  {meta.label}
                </span>
                <span className="text-caption text-text-muted mt-1">{meta.hint}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Dynamic Edit Section Modal */
function EditSectionModal({
  section,
  sectionType,
  onClose,
  onSaved,
}: {
  section: PageSection;
  sectionType: SectionTypeInfo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useSave();
  const [data, setData] = React.useState<Record<string, any>>({ ...section.data });
  const [isActive, setIsActive] = React.useState(section.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sectionType) {
      const errors = validateSection(section.type, data, sectionType.json_schema as any);
      if (Object.keys(errors).length > 0) {
        toast.error(Object.values(errors)[0] ?? "Validation error in section");
        return;
      }
    }

    await save.run(async () => {
      await admin(`/pages/sections/${section.id}`, {
        method: "PATCH",
        json: {
          data,
          is_active: isActive,
        },
      });
      toast.success("Section updated.");
      onSaved();
    });
  };

  const updateField = (key: string, val: any) => {
    setData((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-dvh max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit {SECTION_LABELS[section.type]?.label ?? section.type} section
          </DialogTitle>
          <DialogDescription>
            Configure copy and configuration values for this band.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CheckField
            id="sec-active"
            label="Section active (visible on website)"
            checked={isActive}
            onChange={setIsActive}
          />

          {/* Render common fields based on section data keys */}
          {"heading" in data || "title" in data ? (
            <TextField
              id="sec-heading"
              label="Heading"
              value={data.heading ?? data.title ?? ""}
              onChange={(v) => updateField("heading" in data ? "heading" : "title", v)}
            />
          ) : null}

          {"subheading" in data ? (
            <TextField
              id="sec-subheading"
              label="Subheading"
              value={data.subheading ?? ""}
              onChange={(v) => updateField("subheading", v)}
            />
          ) : null}

          {"intro" in data ? (
            <TextField
              id="sec-intro"
              label="Intro text"
              multiline
              rows={2}
              value={data.intro ?? ""}
              onChange={(v) => updateField("intro", v)}
            />
          ) : null}

          {"text" in data ? (
            <TextField
              id="sec-text"
              label="Body copy"
              multiline
              rows={3}
              value={data.text ?? ""}
              onChange={(v) => updateField("text", v)}
            />
          ) : null}

          {/* Raw JSON editor for full flexibility across complex nested schemas */}
          <div className="space-y-1">
            <label className="text-caption font-semibold">Section data properties (JSON)</label>
            <textarea
              rows={8}
              value={JSON.stringify(data, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setData(parsed);
                } catch {
                  // Keep typing
                }
              }}
              className="w-full font-mono text-caption rounded border-thin border-border bg-surface p-2.5"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" size="sm" loading={save.busy}>
              Save section
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
