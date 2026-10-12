"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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
import { grossPence, priceText, readPrice, STANDARD_VAT_BP, VAT_RATES, vatPence } from "@/lib/catalog/price";
import { cleanText } from "@/lib/text/clean";
import { cn } from "@/lib/utils/cn";

import { usePropertyTypes } from "./property-types-panel";

interface Row {
  key: string;
  id: string | null;
  label: string;
  price: string;
  vat_rate_bp: number;
  pricing_type: PricingType;
  min_quantity: string;
  max_quantity: string;
  property_type_id: string;
  is_active: boolean;
}

function rowOf(option: PriceOption): Row {
  return {
    key: option.id,
    id: option.id,
    label: option.label,
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
  return {
    label: cleanText(row.label.trim()),
    price_pence: readPrice(row.price).pence ?? 0,
    vat_rate_bp: row.vat_rate_bp,
    pricing_type: row.pricing_type,
    min_quantity: Number(row.min_quantity),
    max_quantity: row.max_quantity ? Number(row.max_quantity) : null,
    property_type_id: row.property_type_id || null,
    is_active: row.is_active,
  };
}

const cellInput = "min-h-9 px-2 py-1 text-small";

/**
 * Price options of a service as an editable table: label, price excluding VAT typed in
 * pounds (stored in pence), VAT rate, the price including VAT worked out live, pricing type,
 * quantities, property type and whether it is offered. Rows can be added, removed and dragged
 * into order; "Save price options" sends every change.
 */
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
        price: "",
        vat_rate_bp: STANDARD_VAT_BP,
        pricing_type: "fixed",
        min_quantity: "1",
        max_quantity: "",
        property_type_id: "",
        is_active: true,
      },
    ]);

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
      <div className="hidden grid-cols-12 gap-2 px-11 font-body text-caption font-semibold text-text-muted lg:grid" aria-hidden="true">
        <span className="col-span-3">Label</span>
        <span className="col-span-1">Ex VAT (£)</span>
        <span className="col-span-2">VAT</span>
        <span className="col-span-1">Inc VAT</span>
        <span className="col-span-1">Pricing</span>
        <span className="col-span-1">Min / max</span>
        <span className="col-span-2">Property type</span>
        <span className="col-span-1">Offered</span>
      </div>
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
          const n = String(index + 1);
          return (
            <div
              className={cn(
                "flex items-start gap-2 rounded-md border-thin bg-background p-2 font-body text-small",
                !row.id || changed.includes(row) ? "border-accent" : "border-border",
              )}
              data-testid="price-option-row"
            >
              {handle}
              <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-12">
                <div className="col-span-2 lg:col-span-3">
                  <label className="sr-only" htmlFor={`po-label-${row.key}`}>Label of option {n}</label>
                  <Input
                    id={`po-label-${row.key}`}
                    className={cellInput}
                    value={row.label}
                    placeholder="For example Up to 3 bedrooms"
                    disabled={!canEdit}
                    aria-invalid={errors.label ? true : undefined}
                    onChange={(e) => update(row.key, { label: e.target.value })}
                    onBlur={() => update(row.key, { label: cleanText(row.label) })}
                  />
                  {errors.label ? <p className="text-caption text-error-text">{errors.label}</p> : null}
                </div>
                <div className="lg:col-span-1">
                  <label className="sr-only" htmlFor={`po-price-${row.key}`}>Price excluding VAT in pounds, option {n}</label>
                  <Input
                    id={`po-price-${row.key}`}
                    className={cn(cellInput, "tabular-nums")}
                    inputMode="decimal"
                    value={row.price}
                    disabled={!canEdit}
                    aria-invalid={errors.price ? true : undefined}
                    onChange={(e) => update(row.key, { price: e.target.value })}
                    data-testid="po-price"
                  />
                  {errors.price ? <p className="text-caption text-error-text">{errors.price}</p> : null}
                </div>
                <div className="lg:col-span-2">
                  <label className="sr-only" htmlFor={`po-vat-${row.key}`}>VAT rate, option {n}</label>
                  <select
                    id={`po-vat-${row.key}`}
                    className="h-9 w-full rounded-md border-thin border-border bg-background px-2 text-small"
                    value={row.vat_rate_bp}
                    disabled={!canEdit}
                    onChange={(e) => update(row.key, { vat_rate_bp: Number(e.target.value) })}
                  >
                    {VAT_RATES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <p className="flex items-center font-semibold tabular-nums lg:col-span-1" aria-live="polite" data-testid="po-inc-vat">
                  {price === null ? (
                    <span className="text-text-muted">-</span>
                  ) : (
                    <span title={`VAT ${priceText(vatPence(price, row.vat_rate_bp))}`}>
                      <span className="sr-only">Including VAT </span>
                      <MoneyText pence={grossPence(price, row.vat_rate_bp)} />
                    </span>
                  )}
                </p>
                <div className="lg:col-span-1">
                  <label className="sr-only" htmlFor={`po-type-${row.key}`}>Pricing, option {n}</label>
                  <select
                    id={`po-type-${row.key}`}
                    className="h-9 w-full rounded-md border-thin border-border bg-background px-2 text-small"
                    value={row.pricing_type}
                    disabled={!canEdit}
                    onChange={(e) => update(row.key, { pricing_type: e.target.value as PricingType })}
                  >
                    <option value="fixed">Fixed</option>
                    <option value="per_item">Per item</option>
                  </select>
                </div>
                <div className="flex gap-1 lg:col-span-1">
                  <label className="sr-only" htmlFor={`po-min-${row.key}`}>Minimum quantity, option {n}</label>
                  <Input
                    id={`po-min-${row.key}`}
                    className={cn(cellInput, "w-full tabular-nums")}
                    inputMode="numeric"
                    value={row.min_quantity}
                    disabled={!canEdit}
                    aria-invalid={errors.min_quantity ? true : undefined}
                    onChange={(e) => update(row.key, { min_quantity: e.target.value })}
                  />
                  <label className="sr-only" htmlFor={`po-max-${row.key}`}>Maximum quantity, option {n}</label>
                  <Input
                    id={`po-max-${row.key}`}
                    className={cn(cellInput, "w-full tabular-nums")}
                    inputMode="numeric"
                    placeholder="Any"
                    value={row.max_quantity}
                    disabled={!canEdit}
                    aria-invalid={errors.max_quantity ? true : undefined}
                    onChange={(e) => update(row.key, { max_quantity: e.target.value })}
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="sr-only" htmlFor={`po-pt-${row.key}`}>Property type, option {n}</label>
                  <select
                    id={`po-pt-${row.key}`}
                    className="h-9 w-full rounded-md border-thin border-border bg-background px-2 text-small"
                    value={row.property_type_id}
                    disabled={!canEdit}
                    onChange={(e) => update(row.key, { property_type_id: e.target.value })}
                  >
                    <option value="">Any property</option>
                    {typeOptions.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 lg:col-span-1">
                  <input
                    id={`po-active-${row.key}`}
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={row.is_active}
                    disabled={!canEdit}
                    onChange={(e) => update(row.key, { is_active: e.target.checked })}
                  />
                  <label htmlFor={`po-active-${row.key}`} className="text-caption">
                    <span className="sr-only">Option {n} </span>Offered
                  </label>
                </div>
              </div>
              {canEdit ? (
                <Button variant="ghost" size="xs" aria-label={`Delete option ${n}`} onClick={() => setRemoving(row)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          );
        }}
      />
      {rows.length === 0 ? (
        <p className="font-body text-small text-text-muted">
          No price options yet. Customers cannot book a service without one.
        </p>
      ) : null}
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={add} data-testid="add-price-option">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add a price option
          </Button>
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
        </div>
      ) : null}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove this price option?"
        description={`"${removing?.label || "New option"}" is removed when you save the price options.`}
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
