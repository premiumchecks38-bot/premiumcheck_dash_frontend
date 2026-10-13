"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CheckField, SelectField, TextField } from "@/components/dashboard/content/text-field";
import { SlugField } from "@/components/dashboard/content/slug-field";
import { usePermission } from "@/components/dashboard/session-context";
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
import type { Category, ServiceDetail, ServiceSummary } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { cleanDeep } from "@/lib/text/clean";
import { PriceOptionsEditor } from "./price-options-editor";
import { useCategories } from "./services-view";

interface ServiceFormState {
  name: string;
  category_id: string;
  slug: string;
  short_description: string;
  duration_minutes: string;
  who_needs_it: string;
  certificate_validity: string;
  is_bookable: boolean;
  is_commercial: boolean;
  is_active: boolean;
  is_featured: boolean;
}

export function ServiceDialog({
  service: initialService,
  initialTab = "details",
  onClose,
  onSaved,
}: {
  service: ServiceSummary | null;
  initialTab?: "details" | "prices";
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("services");
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];
  const save = useSave();

  const [currentService, setCurrentService] = React.useState<ServiceSummary | null>(initialService);
  const [activeTab, setActiveTab] = React.useState<"details" | "prices">(initialTab);

  // If editing an existing service, fetch its full detail (including price options & extra fields)
  const detailQuery = useQuery({
    queryKey: ["service-detail", currentService?.id],
    queryFn: () => admin<ServiceDetail>(`/services/${currentService!.id}`),
    enabled: Boolean(currentService?.id),
  });

  const detail = detailQuery.data;

  const [form, setForm] = React.useState<ServiceFormState>({
    name: initialService?.name ?? "",
    category_id: initialService?.category?.id ?? "",
    slug: initialService?.slug ?? "",
    short_description: "",
    duration_minutes: "",
    who_needs_it: "",
    certificate_validity: "",
    is_bookable: initialService?.is_bookable ?? true,
    is_commercial: initialService?.is_commercial ?? false,
    is_active: initialService?.is_active ?? true,
    is_featured: initialService?.is_featured ?? false,
  });

  // When detailed service data loads, populate any missing fields
  React.useEffect(() => {
    if (detail) {
      setForm((prev) => ({
        ...prev,
        name: detail.name ?? prev.name,
        category_id: detail.category?.id ?? prev.category_id,
        slug: detail.slug ?? prev.slug,
        short_description: detail.short_description ?? "",
        duration_minutes: detail.duration_minutes ? String(detail.duration_minutes) : "",
        who_needs_it: detail.who_needs_it ?? "",
        certificate_validity: detail.certificate_validity ?? "",
        is_bookable: detail.is_bookable ?? prev.is_bookable,
        is_commercial: detail.is_commercial ?? prev.is_commercial,
        is_active: detail.is_active ?? prev.is_active,
        is_featured: detail.is_featured ?? prev.is_featured,
      }));
    }
  }, [detail]);

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const handleSaveDetails = async () => {
    if (!form.name.trim()) {
      save.setFieldErrors({ name: "Enter a service name" });
      return;
    }
    if (!form.category_id) {
      save.setFieldErrors({ category_id: "Select a category" });
      return;
    }

    const durationNum = form.duration_minutes.trim() ? parseInt(form.duration_minutes, 10) : null;
    if (durationNum !== null && (isNaN(durationNum) || durationNum < 1)) {
      save.setFieldErrors({ duration_minutes: "Duration must be at least 1 minute" });
      return;
    }

    const payload = cleanDeep({
      name: form.name.trim(),
      category_id: form.category_id,
      slug: form.slug.trim() || null,
      short_description: form.short_description.trim() || null,
      duration_minutes: durationNum,
      who_needs_it: form.who_needs_it.trim() || null,
      certificate_validity: form.certificate_validity.trim() || null,
      is_bookable: form.is_bookable,
      is_commercial: form.is_commercial,
      is_active: form.is_active,
      is_featured: form.is_featured,
    });

    const result = await save.run(
      () =>
        currentService
          ? admin(`/services/${currentService.id}`, { method: "PATCH", json: payload })
          : admin<ServiceDetail>("/services", { method: "POST", json: payload }),
      currentService ? "Service updated successfully." : "Service created! Now configure price options below.",
    );

    if (result) {
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      onSaved();
      if (!currentService && result && (result as any).id) {
        setCurrentService(result as any);
        setActiveTab("prices");
        await queryClient.invalidateQueries({ queryKey: ["service-detail", (result as any).id] });
      }
    }
  };

  const isEditing = Boolean(currentService);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Service: ${currentService?.name}` : "Create new service"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update service properties, categories, booking availability and price options."
              : "Add a new compliance or inspection service to the catalog."}
          </DialogDescription>
        </DialogHeader>

        {isEditing && (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "details" | "prices")}
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="details">General details</TabsTrigger>
              <TabsTrigger value="prices">
                Price options ({detail?.price_options?.length ?? 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prices">
              {detailQuery.isLoading ? (
                <div className="space-y-3 py-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : detail ? (
                <div className="space-y-4 py-2">
                  <PriceOptionsEditor
                    serviceId={detail.id}
                    options={detail.price_options ?? []}
                    canEdit={canEdit}
                  />
                </div>
              ) : (
                <Alert variant="error">Unable to load price options for this service.</Alert>
              )}
            </TabsContent>

            <TabsContent value="details">
              <DetailsForm
                form={form}
                setForm={setForm}
                save={save}
                categoryOptions={categoryOptions}
                savedSlug={detail?.slug ?? currentService?.slug ?? null}
                isEditing={isEditing}
              />
            </TabsContent>
          </Tabs>
        )}

        {!isEditing && (
          <DetailsForm
            form={form}
            setForm={setForm}
            save={save}
            categoryOptions={categoryOptions}
            savedSlug={null}
            isEditing={false}
          />
        )}

        {(!isEditing || activeTab === "details") && (
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {canEdit && (
              <Button
                variant="accent"
                size="sm"
                loading={save.busy}
                onClick={() => void handleSaveDetails()}
                data-testid="save-service-btn"
              >
                {isEditing ? "Save changes" : "Create service & Add prices"}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailsForm({
  form,
  setForm,
  save,
  categoryOptions,
  savedSlug,
  isEditing,
}: {
  form: ServiceFormState;
  setForm: React.Dispatch<React.SetStateAction<ServiceFormState>>;
  save: ReturnType<typeof useSave>;
  categoryOptions: { value: string; label: string }[];
  savedSlug: string | null;
  isEditing: boolean;
}) {
  return (
    <div className="space-y-4 py-1">
      {save.error ? <Alert variant="error">{save.error}</Alert> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="service-name"
          label="Service name"
          required
          value={form.name}
          onChange={(name) => setForm((prev) => ({ ...prev, name }))}
          error={save.fieldErrors.name}
          maxLength={200}
          placeholder="e.g. Gas Safety Certificate (CP12)"
        />

        <SelectField
          id="service-category"
          label="Category"
          required
          value={form.category_id}
          onChange={(category_id) => setForm((prev) => ({ ...prev, category_id }))}
          options={categoryOptions}
          placeholder="Select a category"
          error={save.fieldErrors.category_id}
        />
      </div>

      <SlugField
        id="service-slug"
        value={form.slug}
        onChange={(slug) => setForm((prev) => ({ ...prev, slug }))}
        title={form.name}
        prefix="/services/"
        savedSlug={savedSlug}
        error={save.fieldErrors.slug}
      />


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="service-duration"
          label="Estimated duration (minutes)"
          type="text"
          inputMode="numeric"
          value={form.duration_minutes}
          onChange={(duration_minutes) => setForm((prev) => ({ ...prev, duration_minutes }))}
          placeholder="e.g. 60"
          error={save.fieldErrors.duration_minutes}
        />

        <TextField
          id="service-certificate-validity"
          label="Certificate validity"
          value={form.certificate_validity}
          onChange={(certificate_validity) => setForm((prev) => ({ ...prev, certificate_validity }))}
          placeholder="e.g. 1 year, 5 years"
          maxLength={200}
        />
      </div>

      <TextField
        id="service-who-needs-it"
        label="Who needs it?"
        value={form.who_needs_it}
        onChange={(who_needs_it) => setForm((prev) => ({ ...prev, who_needs_it }))}
        placeholder="e.g. Landlords renting residential properties in the UK"
        maxLength={300}
      />

      <div className="grid grid-cols-1 gap-3 rounded-md border border-border bg-subtle/40 p-4 sm:grid-cols-2">
        <CheckField
          id="service-bookable"
          label="Bookable online"
          hint="Customers can book this service directly on the website."
          checked={form.is_bookable}
          onChange={(is_bookable) => setForm((prev) => ({ ...prev, is_bookable }))}
        />

        <CheckField
          id="service-commercial"
          label="Commercial property service"
          hint="Marks this inspection as commercial rather than standard residential."
          checked={form.is_commercial}
          onChange={(is_commercial) => setForm((prev) => ({ ...prev, is_commercial }))}
        />

        <CheckField
          id="service-active"
          label="Active (Live on website)"
          hint="Uncheck to hide this service from public browsing."
          checked={form.is_active}
          onChange={(is_active) => setForm((prev) => ({ ...prev, is_active }))}
        />

        <CheckField
          id="service-featured"
          label="Featured on homepage"
          hint="Highlighted in the 'Popular Services' showcase section."
          checked={form.is_featured}
          onChange={(is_featured) => setForm((prev) => ({ ...prev, is_featured }))}
        />
      </div>
    </div>
  );
}
