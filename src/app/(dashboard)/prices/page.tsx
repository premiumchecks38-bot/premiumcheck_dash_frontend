"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import {
  calculatePriceDiscount,
  formatLabelWithWas,
  grossPence,
  parseLabelWithWas,
  priceText,
  readPrice,
  STANDARD_VAT_BP,
  VAT_RATES,
} from "@/lib/catalog/price";
import { cleanText } from "@/lib/text/clean";
import { cn } from "@/lib/utils/cn";

interface PriceOption {
  id: string;
  label: string;
  price_pence: number;
  vat_rate_bp: number;
  pricing_type: string;
  is_active: boolean;
  property_type?: { id: string; name: string } | null;
  property_type_id?: string | null;
}

interface PriceTableService {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  price_options: PriceOption[];
}

interface PriceTableCategory {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  services: PriceTableService[];
}

interface EditedRow {
  priceText: string;
  vatRateBp: number;
  isActive: boolean;
}

interface PropertyTypeRef {
  id: string;
  name: string;
}

export default function PricesPage() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("prices");
  const saveAction = useSave();

  const [search, setSearch] = React.useState("");
  const [edits, setEdits] = React.useState<Record<string, EditedRow>>({});

  // Dialog states for Add, Edit, Delete
  const [addService, setAddService] = React.useState<{ id: string; name: string } | null>(null);
  const [editingOption, setEditingOption] = React.useState<PriceOption | null>(null);
  const [deletingOption, setDeletingOption] = React.useState<{ id: string; label: string } | null>(
    null,
  );

  const isDirty = Object.keys(edits).length > 0;
  useUnsavedChanges(isDirty);

  // Load prices table
  const query = useQuery({
    queryKey: ["admin", "prices"],
    queryFn: () => admin<PriceTableCategory[]>("/admin/prices"),
  });

  // Load property types
  const propertyTypesQuery = useQuery({
    queryKey: ["property-types"],
    queryFn: () => admin<PropertyTypeRef[]>("/property-types"),
  });
  const propertyTypes = propertyTypesQuery.data ?? [];

  const categories = query.data ?? [];

  async function handleActiveToggle(option: PriceOption) {
    try {
      await admin(`/price-options/${option.id}/toggle-active`, {
        method: "POST",
      });
      toast.success(option.is_active ? "Package hidden" : "Package is now live");
      queryClient.invalidateQueries({ queryKey: ["admin", "prices"] });
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  const handleDiscard = () => {
    setEdits({});
  };

  async function handleSave() {
    if (!isDirty) return;

    const items: Array<{
      price_option_id: string;
      price_pence: number;
      vat_rate_bp: number;
      is_active: boolean;
    }> = [];
    for (const [id, edit] of Object.entries(edits)) {
      const parsed = readPrice(edit.priceText);
      const pence = parsed.pence;
      if (pence === null || pence === undefined || pence < 0) {
        toast.error(`Invalid price entered: £${edit.priceText}`);
        return;
      }
      items.push({
        price_option_id: id,
        price_pence: pence,
        vat_rate_bp: edit.vatRateBp,
        is_active: edit.isActive,
      });
    }

    const ok = await saveAction.run(async () => {
      await admin("/admin/prices/bulk", {
        method: "PATCH",
        json: { items },
      });
      setEdits({});
      toast.success("Prices updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "prices"] });
    });

    if (!ok && saveAction.error) {
      toast.error(actionErrorMessage(saveAction.error));
    }
  }

  // Delete an option
  async function handleDeleteOption(id: string) {
    try {
      await admin(`/price-options/${id}`, { method: "DELETE" });
      toast.success("Price option deleted successfully");
      setDeletingOption(null);
      // Clean from pending edits if present
      setEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "prices"] });
    } catch (err) {
      toast.error(actionErrorMessage(err));
    }
  }

  // Filter categories and services by search query
  const filteredCategories = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;

    return categories
      .map((cat) => {
        const catMatches = cat.name.toLowerCase().includes(q);
        const matchingServices = cat.services.filter(
          (s) =>
            catMatches ||
            s.name.toLowerCase().includes(q) ||
            s.price_options.some((o) => o.label.toLowerCase().includes(q)),
        );
        return {
          ...cat,
          services: matchingServices,
        };
      })
      .filter((cat) => cat.services.length > 0);
  }, [categories, search]);

  return (
    <>
      <PageHeader
        title="Prices"
        description="Manage service pricing packages, discounts and VAT rates with instant Add, Edit and Delete."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Catalog" },
          { label: "Prices" },
        ]}
        actions={
          canEdit && isDirty ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={saveAction.busy}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Discard
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSave}
                disabled={saveAction.busy}
                data-testid="save-prices-btn"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saveAction.busy
                  ? "Saving..."
                  : `Save changes (${Object.keys(edits).length})`}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dashboard-muted" />
            <Input
              placeholder="Search category, service or option..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {isDirty && (
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {Object.keys(edits).length} unsaved price change{Object.keys(edits).length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {query.isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage(query.error)}</span>
          </Alert>
        ) : filteredCategories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-dashboard-border p-12 text-center text-sm text-dashboard-muted">
            No prices matching your search filter.
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="rounded-lg border border-dashboard-border bg-dashboard-card overflow-hidden"
              >
                <div className="border-b border-dashboard-border bg-dashboard-surface/50 px-4 py-3">
                  <h2 className="text-sm font-semibold text-dashboard-text uppercase tracking-wider">
                    {category.name}
                  </h2>
                </div>

                <div className="divide-y divide-dashboard-border">
                  {category.services.map((service) => (
                    <div key={service.id} className="p-4">
                      {/* Service Header with Add Price Option Button */}
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-dashboard-text">{service.name}</h3>
                          {!service.is_active && (
                            <span className="rounded bg-rose-500/10 px-2 py-0.5 text-xs text-rose-500 font-medium">
                              Inactive
                            </span>
                          )}
                          <span className="text-xs text-dashboard-muted">
                            ({service.price_options.length} {service.price_options.length === 1 ? "option" : "options"})
                          </span>
                        </div>

                        {canEdit && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setAddService({ id: service.id, name: service.name })}
                            className="text-xs"
                          >
                            <Plus className="mr-1 h-3.5 w-3.5 text-accent" /> Add price option
                          </Button>
                        )}
                      </div>

                      {service.price_options.length === 0 ? (
                        <div className="flex items-center justify-between rounded-md border border-dashed border-dashboard-border p-3 text-xs text-dashboard-muted">
                          <span>No price options configured. Customers cannot book this service without an option.</span>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setAddService({ id: service.id, name: service.name })}
                            >
                              + Create first option
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-dashboard-border text-dashboard-muted whitespace-nowrap">
                                <th className="py-2.5 px-3 font-medium">Package</th>
                                <th className="py-2.5 px-3 font-medium w-28">Property</th>
                                <th className="py-2.5 px-3 font-medium w-24 text-right whitespace-nowrap">Was (£)</th>
                                <th className="py-2.5 px-3 font-medium w-32 text-right whitespace-nowrap">Ex VAT (£)</th>
                                <th className="py-2.5 px-3 font-medium w-24 text-center whitespace-nowrap">VAT</th>
                                <th className="py-2.5 px-4 font-medium w-48 text-right whitespace-nowrap">Inc VAT (£)</th>
                                <th className="py-2.5 px-3 font-medium text-center w-20 whitespace-nowrap">Status</th>
                                <th className="py-2.5 px-3 font-medium text-right w-20 whitespace-nowrap">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-dashboard-border/50">
                              {service.price_options.map((opt) => {
                                const calculatedIncVat = grossPence(opt.price_pence, opt.vat_rate_bp);
                                const discount = calculatePriceDiscount(
                                  opt.label,
                                  opt.price_pence,
                                  opt.vat_rate_bp,
                                );

                                return (
                                  <tr
                                    key={opt.id}
                                    className="hover:bg-dashboard-surface/30 transition-colors"
                                  >
                                    {/* Package Label */}
                                    <td className="py-2.5 px-3 font-medium text-dashboard-text">
                                      <span>{discount.cleanLabel}</span>
                                    </td>

                                    {/* Property Type */}
                                    <td className="py-2.5 px-3 text-dashboard-muted whitespace-nowrap">
                                      {opt.property_type?.name ?? "Any"}
                                    </td>

                                    {/* Was Price (ex VAT) */}
                                    <td className="py-2.5 px-3 font-mono text-right whitespace-nowrap">
                                      {discount.wasPrice ? (
                                        <span className="line-through text-dashboard-muted">
                                          £{discount.wasPrice}
                                        </span>
                                      ) : (
                                        <span className="text-dashboard-muted/40 font-sans">-</span>
                                      )}
                                    </td>

                                    {/* Price Ex VAT (read-only, edited via Edit dialog) */}
                                    <td className="py-2.5 px-3 font-mono text-right text-xs font-semibold text-dashboard-text whitespace-nowrap">
                                      £{priceText(opt.price_pence)}
                                    </td>

                                    {/* VAT Rate (display only, changed via Edit dialog) */}
                                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                      <span className="font-mono text-xs text-dashboard-muted font-medium">
                                        {opt.vat_rate_bp === 0 ? "0%" : `${opt.vat_rate_bp / 100}%`}
                                      </span>
                                    </td>

                                    {/* Total Inc VAT Calculated */}
                                    <td className="py-2.5 px-4 font-mono text-right whitespace-nowrap">
                                      <div className="inline-flex items-center gap-2 justify-end">
                                        {discount.hasDiscount ? (
                                          <>
                                            <span className="line-through text-dashboard-muted text-[11px]">
                                              £{priceText(discount.grossWasPence)}
                                            </span>
                                            <span className="text-dashboard-text font-bold">
                                              £{priceText(calculatedIncVat)}
                                            </span>
                                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                              -{discount.savingsPercent}%
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-dashboard-text font-bold">
                                            £{priceText(calculatedIncVat)}
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Active Live Status */}
                                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                      <button
                                        type="button"
                                        disabled={!canEdit}
                                        onClick={() => handleActiveToggle(opt)}
                                        className={cn(
                                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 cursor-pointer",
                                          opt.is_active
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/20"
                                            : "bg-dashboard-surface text-dashboard-muted hover:text-dashboard-text",
                                        )}
                                      >
                                        {opt.is_active ? "Live" : "Hidden"}
                                      </button>
                                    </td>

                                    {/* Edit & Delete Action Buttons */}
                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                      {canEdit ? (
                                        <div className="flex items-center justify-end gap-1.5">
                                          <Button
                                            variant="ghost"
                                            size="xs"
                                            onClick={() => setEditingOption(opt)}
                                            title="Edit package"
                                            className="h-6 w-6 p-0 text-dashboard-muted hover:text-dashboard-text"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="xs"
                                            onClick={() =>
                                              setDeletingOption({ id: opt.id, label: opt.label })
                                            }
                                            title="Delete package"
                                            className="h-6 w-6 p-0 text-dashboard-muted hover:text-red-500 hover:bg-red-500/10"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : null}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Price Option Dialog */}
      {addService && (
        <AddPriceOptionDialog
          serviceId={addService.id}
          serviceName={addService.name}
          propertyTypes={propertyTypes}
          onClose={() => setAddService(null)}
          onAdded={() => {
            setAddService(null);
            queryClient.invalidateQueries({ queryKey: ["admin", "prices"] });
          }}
        />
      )}

      {/* Edit Price Option Dialog */}
      {editingOption && (
        <EditPriceOptionDialog
          option={editingOption}
          propertyTypes={propertyTypes}
          onClose={() => setEditingOption(null)}
          onUpdated={() => {
            setEdits((prev) => {
              const next = { ...prev };
              delete next[editingOption.id];
              return next;
            });
            setEditingOption(null);
            queryClient.invalidateQueries({ queryKey: ["admin", "prices"] });
          }}
        />
      )}

      {/* Delete Price Option Confirmation */}
      <ConfirmDialog
        open={Boolean(deletingOption)}
        onOpenChange={(open) => !open && setDeletingOption(null)}
        title="Delete price option?"
        description={`"${deletingOption?.label || "This option"}" will be permanently removed. Customers will no longer be able to select or book this package.`}
        confirmLabel="Delete option"
        destructive
        onConfirm={async () => {
          if (deletingOption) await handleDeleteOption(deletingOption.id);
        }}
      />
    </>
  );
}

function AddPriceOptionDialog({
  serviceId,
  serviceName,
  propertyTypes,
  onClose,
  onAdded,
}: {
  serviceId: string;
  serviceName: string;
  propertyTypes: PropertyTypeRef[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [label, setLabel] = React.useState("");
  const [wasPrice, setWasPrice] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [vatRate, setVatRate] = React.useState<number>(STANDARD_VAT_BP);
  const [propertyTypeId, setPropertyTypeId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const parsedNew = readPrice(price);
  const netNewPence = parsedNew.pence ?? 0;
  const grossNewPence = grossPence(netNewPence, vatRate);

  const parsedWas = readPrice(wasPrice);
  const netWasPence = parsedWas.pence ?? 0;
  const grossWasPence = grossPence(netWasPence, vatRate);

  const hasWasEntered = wasPrice.trim().length > 0;
  const hasDiscount = hasWasEntered && netWasPence > netNewPence && netNewPence > 0;
  const savingsGrossPence = hasDiscount ? grossWasPence - grossNewPence : 0;
  const savingsPercent =
    hasDiscount && grossWasPence > 0
      ? Math.round((savingsGrossPence / grossWasPence) * 100)
      : 0;

  async function handleAdd() {
    if (!label.trim()) {
      toast.error("Please enter a package label (e.g. 1-2 Bedroom Flat)");
      return;
    }
    if (parsedNew.pence === null || parsedNew.pence < 0) {
      toast.error("Please enter a valid price in pounds");
      return;
    }

    setBusy(true);
    try {
      const combinedLabel = formatLabelWithWas(label.trim(), wasPrice);
      await admin(`/services/${serviceId}/price-options`, {
        method: "POST",
        json: {
          label: cleanText(combinedLabel),
          price_pence: parsedNew.pence,
          vat_rate_bp: vatRate,
          pricing_type: "fixed",
          min_quantity: 1,
          max_quantity: null,
          property_type_id: propertyTypeId || null,
          is_active: true,
        },
      });
      toast.success("Price option created successfully");
      onAdded();
    } catch (err) {
      toast.error(actionErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add price option</DialogTitle>
          <DialogDescription>New package for {serviceName}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-dashboard-text block mb-1">
              Package Name *
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. 4-5 Bedroom House"
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-dashboard-text">
                  Was Price (£ ex VAT)
                </label>
                <span className="text-[11px] text-dashboard-muted">Optional</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dashboard-muted text-xs">
                  £
                </span>
                <Input
                  value={wasPrice}
                  onChange={(e) => setWasPrice(e.target.value)}
                  placeholder="e.g. 150.00"
                  className="pl-7 text-xs font-mono"
                />
              </div>
              {netWasPence > 0 && (
                <span className="text-[11px] text-dashboard-muted mt-1 block font-mono">
                  £{priceText(grossWasPence)} inc VAT
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-dashboard-text">
                  Price (£ ex VAT) *
                </label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dashboard-text font-bold text-xs">
                  £
                </span>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 129.00"
                  className="pl-7 text-xs font-mono font-bold"
                />
              </div>
              {netNewPence > 0 && (
                <span className="text-[11px] text-dashboard-text font-medium mt-1 block font-mono">
                  £{priceText(grossNewPence)} inc VAT
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-dashboard-text block mb-1">VAT Rate</label>
              <select
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
                className="h-9 w-full rounded-md border border-dashboard-border bg-dashboard-surface px-2.5 text-xs text-dashboard-text focus:outline-none"
              >
                {VAT_RATES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-dashboard-text block mb-1">
                Property Type
              </label>
              <select
                value={propertyTypeId}
                onChange={(e) => setPropertyTypeId(e.target.value)}
                className="h-9 w-full rounded-md border border-dashboard-border bg-dashboard-surface px-2.5 text-xs text-dashboard-text focus:outline-none"
              >
                <option value="">Any property type</option>
                {propertyTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasDiscount && (
            <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 shrink-0" />
                Save £{priceText(savingsGrossPence)}
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold">
                  -{savingsPercent}%
                </span>
              </span>
              <span className="font-mono text-xs whitespace-nowrap">
                <span className="line-through text-dashboard-muted mr-1.5">£{priceText(grossWasPence)}</span>
                <span className="font-bold">£{priceText(grossNewPence)} inc VAT</span>
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleAdd} loading={busy}>
            Create option
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPriceOptionDialog({
  option,
  propertyTypes,
  onClose,
  onUpdated,
}: {
  option: PriceOption;
  propertyTypes: PropertyTypeRef[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { cleanLabel, wasPrice: initialWas } = parseLabelWithWas(option.label);
  const [label, setLabel] = React.useState(cleanLabel);
  const [wasPrice, setWasPrice] = React.useState(initialWas);
  const [price, setPrice] = React.useState(priceText(option.price_pence));
  const [vatRate, setVatRate] = React.useState(option.vat_rate_bp);
  const [propertyTypeId, setPropertyTypeId] = React.useState(
    option.property_type_id ?? option.property_type?.id ?? "",
  );
  const [isActive, setIsActive] = React.useState(option.is_active);
  const [busy, setBusy] = React.useState(false);

  // Live calculations for discount preview
  const parsedNew = readPrice(price);
  const netNewPence = parsedNew.pence ?? 0;
  const grossNewPence = grossPence(netNewPence, vatRate);

  const parsedWas = readPrice(wasPrice);
  const netWasPence = parsedWas.pence ?? 0;
  const grossWasPence = grossPence(netWasPence, vatRate);

  const hasWasEntered = wasPrice.trim().length > 0;
  const hasDiscount = hasWasEntered && netWasPence > netNewPence && netNewPence > 0;
  const savingsGrossPence = hasDiscount ? grossWasPence - grossNewPence : 0;
  const savingsPercent =
    hasDiscount && grossWasPence > 0
      ? Math.round((savingsGrossPence / grossWasPence) * 100)
      : 0;

  async function handleUpdate() {
    if (!label.trim()) {
      toast.error("Please enter a package name");
      return;
    }
    if (parsedNew.pence === null || parsedNew.pence < 0) {
      toast.error("Please enter a valid price in pounds");
      return;
    }

    setBusy(true);
    try {
      const combinedLabel = formatLabelWithWas(label.trim(), wasPrice);
      await admin(`/price-options/${option.id}`, {
        method: "PATCH",
        json: {
          label: cleanText(combinedLabel),
          price_pence: parsedNew.pence,
          vat_rate_bp: vatRate,
          property_type_id: propertyTypeId || null,
          is_active: isActive,
        },
      });
      toast.success("Option updated successfully");
      onUpdated();
    } catch (err) {
      toast.error(actionErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle>Edit price option</DialogTitle>
              <DialogDescription>Update package name, pricing and settings.</DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              title="Click to toggle status"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
                isActive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-dashboard-surface border border-dashboard-border text-dashboard-muted hover:text-dashboard-text",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isActive ? "bg-emerald-500" : "bg-dashboard-muted",
                )}
              />
              {isActive ? "Live" : "Hidden"}
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Package Name */}
          <div>
            <label className="text-xs font-semibold text-dashboard-text block mb-1">
              Package Name *
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Up to 3 bedrooms"
              className="text-xs"
            />
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-dashboard-text">
                  Was Price (£ ex VAT)
                </label>
                <span className="text-[11px] text-dashboard-muted">Optional</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dashboard-muted text-xs">
                  £
                </span>
                <Input
                  value={wasPrice}
                  onChange={(e) => setWasPrice(e.target.value)}
                  placeholder="e.g. 120.00"
                  className="pl-7 text-xs font-mono"
                />
              </div>
              {netWasPence > 0 && (
                <span className="text-[11px] text-dashboard-muted mt-1 block font-mono">
                  £{priceText(grossWasPence)} inc VAT
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-dashboard-text">
                  Price (£ ex VAT) *
                </label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dashboard-text font-bold text-xs">
                  £
                </span>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 99.00"
                  className="pl-7 text-xs font-mono font-bold"
                />
              </div>
              {netNewPence > 0 && (
                <span className="text-[11px] text-dashboard-text font-medium mt-1 block font-mono">
                  £{priceText(grossNewPence)} inc VAT
                </span>
              )}
            </div>
          </div>

          {/* VAT & Property Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-dashboard-text block mb-1">VAT Rate</label>
              <select
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
                className="h-9 w-full rounded-md border border-dashboard-border bg-dashboard-surface px-2.5 text-xs text-dashboard-text focus:outline-none"
              >
                {VAT_RATES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-dashboard-text block mb-1">
                Property Type
              </label>
              <select
                value={propertyTypeId}
                onChange={(e) => setPropertyTypeId(e.target.value)}
                className="h-9 w-full rounded-md border border-dashboard-border bg-dashboard-surface px-2.5 text-xs text-dashboard-text focus:outline-none"
              >
                <option value="">Any property type</option>
                {propertyTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Discount Banner */}
          {hasDiscount && (
            <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 shrink-0" />
                Save £{priceText(savingsGrossPence)}
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold">
                  -{savingsPercent}%
                </span>
              </span>
              <span className="font-mono text-xs whitespace-nowrap">
                <span className="line-through text-dashboard-muted mr-1.5">£{priceText(grossWasPence)}</span>
                <span className="font-bold">£{priceText(grossNewPence)} inc VAT</span>
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleUpdate} loading={busy}>
            Update option
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
