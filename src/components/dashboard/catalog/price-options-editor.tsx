"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SortableList, reorderPayload } from "@/components/dashboard/content/sortable-list";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { MoneyText } from "@/components/dashboard/money-text";
import { useUnsavedChanges } from "@/components/dashboard/use-unsaved-changes";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PriceOption, PricingType } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { actionErrorMessage } from "@/lib/client/errors";
import {
  grossPence,
  priceText,
  readPrice,
  STANDARD_VAT_BP,
  VAT_RATES,
  parseLabelWithWas,
  formatLabelWithWas,
} from "@/lib/catalog/price";
import { cleanText } from "@/lib/text/clean";
import { cn } from "@/lib/utils/cn";

import { usePropertyTypes } from "./property-types-panel";

interface Row {
  key: string;
  id: string | null;
  label: string;
  was_price: string;
  price: string;
  vat_rate_bp: number;
  pricing_type: PricingType;
  min_quantity: string;
  max_quantity: string;
  property_type_id: string;
  is_active: boolean;
}

function rowOf(option: PriceOption): Row {
  const { cleanLabel, wasPrice } = parseLabelWithWas(option.label);
  return {
    key: option.id,
    id: option.id,
    label: cleanLabel,
    was_price: wasPrice,
    price: priceText(option.price_pence),
    vat_rate_bp: option.vat_rate_bp,
    pricing_type: option.pricing_type,
    min_quantity: String(option.min_quantity),
    max_quantity: option.max_quantity === null ? "" : String(option.max_quantity),
    property_type_id: option.property_type_id ?? "",
    is_active: option.is_active,
  };
}

function rowErrors(row: Row): Partial<Record<keyof Row, string>> {
  const errors: Partial<Record<keyof Row, string>> = {};
  if (!row.label.trim()) errors.label = "Enter a label";
  const price = readPrice(row.price);
  if (price.error) errors.price = price.error;
  const min = Number(row.min_quantity);
  if (!Number.isInteger(min) || min < 1) errors.min_quantity = "1 or more";
  if (row.max_quantity) {
    const max = Number(row.max_quantity);
    if (!Number.isInteger(max) || max < min) errors.max_quantity = "At least the minimum";
  }
  return errors;
}

function payload(row: Row) {
  const combinedLabel = formatLabelWithWas(row.label.trim(), row.was_price);
  return {
    label: cleanText(combinedLabel),
    price_pence: readPrice(row.price).pence ?? 0,
    vat_rate_bp: row.vat_rate_bp,
    pricing_type: row.pricing_type,
    min_quantity: Number(row.min_quantity),
    max_quantity: row.max_quantity ? Number(row.max_quantity) : null,
    property_type_id: row.property_type_id || null,
    is_active: row.is_active,
  };
}

export function PriceOptionsEditor({
  serviceId,
  options,
  canEdit,
}: {
  serviceId: string;
  options: PriceOption[];
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const types = usePropertyTypes();
  const [rows, setRows] = React.useState<Row[]>(() => options.map(rowOf));
  const [source, setSource] = React.useState(options);
  const [deleted, setDeleted] = React.useState<string[]>([]);
  const [removing, setRemoving] = React.useState<Row | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [showErrors, setShowErrors] = React.useState(false);

  if (options !== source) {
    setSource(options);
    setRows(options.map(rowOf));
    setDeleted([]);
  }

  const original = new Map(options.map((o) => [o.id, JSON.stringify(payload(rowOf(o)))]));
  const changed = rows.filter((r) => !r.id || original.get(r.id) !== JSON.stringify(payload(r)));
  const orderChanged = rows.filter((r) => r.id).map((r) => r.id).join() !== options.map((o) => o.id).join();
  const dirty = changed.length > 0 || deleted.length > 0 || orderChanged;
  useUnsavedChanges(dirty);

  const update = (key: string, change: Partial<Row>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...change } : r)));

  const add = () =>
    setRows((list) => [
      ...list,
      {
        key: `new-${String(Date.now())}`,
        id: null,
        label: "",
        was_price: "",
        price: "",
        vat_rate_bp: STANDARD_VAT_BP,
        pricing_type: "fixed",
        min_quantity: "1",
        max_quantity: "",
        property_type_id: "",
        is_active: true,
      },
    ]);

  const addBedroomTiers = () => {
    const now = Date.now();
    setRows((list) => [
      ...list,
      {
        key: `new-${now}-1`,
        id: null,
        label: "Studio / 1 Bedroom Property",
        was_price: "120",
        price: "99",
        vat_rate_bp: STANDARD_VAT_BP,
        pricing_type: "fixed",
        min_quantity: "1",
        max_quantity: "",
        property_type_id: "",
        is_active: true,
      },
      {
        key: `new-${now}-2`,
        id: null,
        label: "2-3 Bedroom Property",
        was_price: "150",
        price: "129",
        vat_rate_bp: STANDARD_VAT_BP,
        pricing_type: "fixed",
        min_quantity: "1",
        max_quantity: "",
        property_type_id: "",
        is_active: true,
      },
      {
        key: `new-${now}-3`,
        id: null,
        label: "4-5 Bedroom Property",
        was_price: "199",
        price: "169",
        vat_rate_bp: STANDARD_VAT_BP,
        pricing_type: "fixed",
        min_quantity: "1",
        max_quantity: "",
        property_type_id: "",
        is_active: true,
      },
    ]);
    toast.success("Added 3 bedroom packages with promotional rates.");
  };

  const addFixedPrice = () => {
    setRows((list) => [
      ...list,
      {
        key: `new-${Date.now()}`,
        id: null,
        label: "Standard Compliance Certificate",
        was_price: "95",
        price: "79",
        vat_rate_bp: STANDARD_VAT_BP,
        pricing_type: "fixed",
        min_quantity: "1",
        max_quantity: "",
        property_type_id: "",
        is_active: true,
      },
    ]);
    toast.success("Added fixed price package.");
  };

  const save = async () => {
    setShowErrors(true);
    if (rows.some((r) => Object.keys(rowErrors(r)).length)) {
      setFailure("Some price options need correcting.");
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      for (const id of deleted) await admin(`/price-options/${id}`, { method: "DELETE" });
      const ids: string[] = [];
      for (const row of rows) {
        if (!row.id) {
          const created = await admin<PriceOption>(`/services/${serviceId}/price-options`, { json: payload(row) });
          ids.push(created.id);
        } else {
          if (changed.includes(row)) await admin(`/price-options/${row.id}`, { method: "PATCH", json: payload(row) });
          ids.push(row.id);
        }
      }
      await admin(`/services/${serviceId}/price-options/reorder`, {
        method: "PUT",
        json: reorderPayload(ids, (id) => id),
      });
      toast.success("Price options saved. The website shows the new prices within a minute.");
      setShowErrors(false);
      await queryClient.invalidateQueries({ queryKey: ["service", serviceId] });
      await queryClient.invalidateQueries({ queryKey: ["prices"] });
    } catch (error) {
      setFailure(actionErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const typeOptions = types.data ?? [];

  return (
    <div className="space-y-4" data-testid="price-options">
      {failure ? <Alert variant="error">{failure}</Alert> : null}

      {/* Presets and Add Option Bar */}
      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-dashboard-text">Presets:</span>
            <Button variant="outline" size="xs" onClick={addBedroomTiers}>
              Bedroom tiers
            </Button>
            <Button variant="outline" size="xs" onClick={addFixedPrice}>
              Single fixed price
            </Button>
          </div>
          <Button variant="outline" size="xs" onClick={add}>
            <Plus className="mr-1 h-3.5 w-3.5 text-accent" /> Add custom option
          </Button>
        </div>
      )}

      {/* When Rows Exist: Column Headers */}
      {rows.length > 0 && (
        <div
          className="hidden items-center gap-3 px-3 py-1 text-[11px] font-semibold text-dashboard-muted uppercase tracking-wider lg:flex"
          aria-hidden="true"
        >
          <span className="w-6 shrink-0" />
          <span className="flex-1 min-w-[200px]">Package / Option Label</span>
          <span className="w-24 shrink-0">Was (£)</span>
          <span className="w-28 shrink-0">Price (£ ex VAT)</span>
          <span className="w-24 shrink-0">VAT Rate</span>
          <span className="w-36 shrink-0">Total inc VAT</span>
          <span className="w-32 shrink-0">Property Type</span>
          <span className="w-14 shrink-0 text-center">Live</span>
          <span className="w-7 shrink-0" />
        </div>
      )}

      {/* Drag & Drop Rows List */}
      <SortableList
        items={rows}
        getId={(r) => r.key}
        getLabel={(r) => r.label || "new option"}
        onReorder={setRows}
        disabled={!canEdit}
        label="Price options"
        renderItem={(row, handle, index) => {
          const errors = showErrors ? rowErrors(row) : {};
          const price = readPrice(row.price).pence;
          const wasPriceParsed = readPrice(row.was_price).pence;
          const savingPence =
            wasPriceParsed !== null && price !== null && wasPriceParsed > price
              ? wasPriceParsed - price
              : 0;
          const savingPercent =
            wasPriceParsed && savingPence > 0 ? Math.round((savingPence / wasPriceParsed) * 100) : 0;
          const n = String(index + 1);

          return (
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-dashboard-card p-2.5 transition-colors",
                !row.id || changed.includes(row)
                  ? "border-accent shadow-xs"
                  : "border-dashboard-border hover:border-dashboard-border-strong",
              )}
              data-testid="price-option-row"
            >
              {/* Drag Handle */}
              <div className="w-6 shrink-0 flex items-center justify-center text-dashboard-muted hover:text-dashboard-text cursor-grab active:cursor-grabbing">
                {handle}
              </div>

              {/* Package Label */}
              <div className="flex-1 min-w-[200px]">
                <label className="sr-only" htmlFor={`po-label-${row.key}`}>
                  Label of option {n}
                </label>
                <Input
                  id={`po-label-${row.key}`}
                  className="h-8.5 text-xs font-medium"
                  value={row.label}
                  placeholder="e.g. 1-2 Bedroom Flat"
                  disabled={!canEdit}
                  aria-invalid={errors.label ? true : undefined}
                  onChange={(e) => update(row.key, { label: e.target.value })}
                  onBlur={() => update(row.key, { label: cleanText(row.label) })}
                />
                {errors.label ? <p className="text-[10px] text-error-text mt-0.5">{errors.label}</p> : null}
              </div>

              {/* Was Price */}
              <div className="w-24 shrink-0">
                <label className="sr-only" htmlFor={`po-was-${row.key}`}>
                  Original was price, option {n}
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-dashboard-muted">£</span>
                  <Input
                    id={`po-was-${row.key}`}
                    className="h-8.5 pl-6 text-xs tabular-nums text-dashboard-muted line-through"
                    inputMode="decimal"
                    placeholder="Was"
                    value={row.was_price}
                    disabled={!canEdit}
                    onChange={(e) => update(row.key, { was_price: e.target.value })}
                  />
                </div>
              </div>

              {/* Price ex VAT */}
              <div className="w-28 shrink-0">
                <label className="sr-only" htmlFor={`po-price-${row.key}`}>
                  Price ex VAT, option {n}
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-dashboard-text">£</span>
                  <Input
                    id={`po-price-${row.key}`}
                    className="h-8.5 pl-6 text-xs tabular-nums font-bold text-dashboard-text focus:border-dashboard-primary"
                    inputMode="decimal"
                    placeholder="Price"
                    value={row.price}
                    disabled={!canEdit}
                    aria-invalid={errors.price ? true : undefined}
                    onChange={(e) => update(row.key, { price: e.target.value })}
                    data-testid="po-price"
                  />
                </div>
                {errors.price ? <p className="text-[10px] text-error-text mt-0.5">{errors.price}</p> : null}
              </div>

              {/* VAT Rate */}
              <div className="w-24 shrink-0">
                <select
                  id={`po-vat-${row.key}`}
                  className="h-8.5 w-full rounded-md border border-dashboard-border bg-dashboard-surface px-2 text-xs text-dashboard-text focus:outline-none focus:border-dashboard-primary"
                  value={row.vat_rate_bp}
                  disabled={!canEdit}
                  onChange={(e) => update(row.key, { vat_rate_bp: Number(e.target.value) })}
                >
                  {VAT_RATES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label.split(" ")[0]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Inc VAT & Savings */}
              <div className="w-36 shrink-0 flex flex-col justify-center">
                {price === null ? (
                  <span className="text-xs text-dashboard-muted">-</span>
                ) : (
                  <div>
                    <div className="text-xs font-bold tabular-nums text-dashboard-text">
                      <MoneyText pence={grossPence(price, row.vat_rate_bp)} />
                      <span className="text-[10px] text-dashboard-muted font-normal ml-1">inc VAT</span>
                    </div>
                    {savingPence > 0 ? (
                      <span className="inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10">
                        Save £{priceText(savingPence)} ({savingPercent}% off)
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Property Type Filter */}
              <div className="w-32 shrink-0">
                <select
                  id={`po-pt-${row.key}`}
                  className="h-8.5 w-full rounded-md border border-dashboard-border bg-dashboard-surface px-2 text-xs text-dashboard-text focus:outline-none focus:border-dashboard-primary"
                  value={row.property_type_id}
                  disabled={!canEdit}
                  onChange={(e) => update(row.key, { property_type_id: e.target.value })}
                >
                  <option value="">Any property</option>
                  {typeOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Offered Checkbox */}
              <div className="w-14 shrink-0 flex items-center justify-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    id={`po-active-${row.key}`}
                    type="checkbox"
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                    checked={row.is_active}
                    disabled={!canEdit}
                    onChange={(e) => update(row.key, { is_active: e.target.checked })}
                  />
                  <span className="sr-only">Live</span>
                </label>
              </div>

              {/* Delete Button */}
              <div className="w-7 shrink-0 flex items-center justify-end">
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    aria-label={`Delete option ${n}`}
                    onClick={() => setRemoving(row)}
                    className="text-dashboard-muted hover:text-red-500 hover:bg-red-500/10 h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </div>
          );
        }}
      />

      {/* Clean Empty State */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-dashboard-border bg-dashboard-surface/30 p-8 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Tag className="h-5 w-5" />
          </div>
          <h4 className="font-heading text-sm font-semibold text-dashboard-text">
            No price packages configured yet
          </h4>
          <p className="max-w-md mx-auto text-xs text-dashboard-muted leading-relaxed">
            Customers cannot book a service without at least one price package. Choose a standard template below or create your own custom package.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button variant="accent" size="sm" onClick={addBedroomTiers}>
              Add Bedroom Tiers
            </Button>
            <Button variant="outline" size="sm" onClick={addFixedPrice}>
              Add Single Fixed Package
            </Button>
            <Button variant="ghost" size="sm" onClick={add}>
              + Custom Option
            </Button>
          </div>
        </div>
      ) : null}

      {/* Bottom Actions */}
      {canEdit && rows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashboard-border pt-4">
          <Button variant="outline" size="sm" onClick={add} data-testid="add-price-option">
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Add custom option
          </Button>

          <div className="flex items-center gap-2">
            {dirty ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRows(options.map(rowOf));
                  setDeleted([]);
                  setShowErrors(false);
                }}
              >
                Discard changes
              </Button>
            ) : null}

            <Button
              variant="accent"
              size="sm"
              disabled={!dirty}
              loading={busy}
              onClick={() => void save()}
              data-testid="save-price-options"
            >
              Save price options
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove this price option?"
        description={`"${removing?.label || "New option"}" will be deleted when you save the price options.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          const target = removing;
          if (target) {
            setRows((list) => list.filter((r) => r.key !== target.key));
            if (target.id) setDeleted((d) => [...d, target.id as string]);
          }
          setRemoving(null);
        }}
      />
    </div>
  );
}
