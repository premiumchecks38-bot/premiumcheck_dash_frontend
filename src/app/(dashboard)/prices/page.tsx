"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, RotateCcw, Save, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { usePermission } from "@/components/dashboard/session-context";
import { useSave } from "@/components/dashboard/use-save";
import { useUnsavedChanges } from "@/components/dashboard/use-unsaved-changes";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { admin } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";
import { grossPence, priceText, readPrice, VAT_RATES } from "@/lib/catalog/price";
import { cn } from "@/lib/utils/cn";

interface PriceOption {
  id: string;
  label: string;
  price_pence: number;
  vat_rate_bp: number;
  pricing_type: string;
  is_active: boolean;
  property_type?: { id: string; name: string } | null;
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

export default function PricesPage() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("prices");
  const saveAction = useSave();

  const [search, setSearch] = React.useState("");
  const [edits, setEdits] = React.useState<Record<string, EditedRow>>({});

  const isDirty = Object.keys(edits).length > 0;
  useUnsavedChanges(isDirty);

  const query = useQuery({
    queryKey: ["admin", "prices"],
    queryFn: () => admin<PriceTableCategory[]>("/admin/prices"),
  });

  const categories = query.data ?? [];

  const handlePriceChange = (option: PriceOption, newText: string) => {
    setEdits((prev) => {
      const current = prev[option.id] ?? {
        priceText: priceText(option.price_pence),
        vatRateBp: option.vat_rate_bp,
        isActive: option.is_active,
      };
      return {
        ...prev,
        [option.id]: {
          ...current,
          priceText: newText,
        },
      };
    });
  };

  const handleVatChange = (option: PriceOption, vatBp: number) => {
    setEdits((prev) => {
      const current = prev[option.id] ?? {
        priceText: priceText(option.price_pence),
        vatRateBp: option.vat_rate_bp,
        isActive: option.is_active,
      };
      return {
        ...prev,
        [option.id]: {
          ...current,
          vatRateBp: vatBp,
        },
      };
    });
  };

  const handleActiveToggle = (option: PriceOption) => {
    setEdits((prev) => {
      const current = prev[option.id] ?? {
        priceText: priceText(option.price_pence),
        vatRateBp: option.vat_rate_bp,
        isActive: option.is_active,
      };
      return {
        ...prev,
        [option.id]: {
          ...current,
          isActive: !current.isActive,
        },
      };
    });
  };

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
        description="Price options for every service, with live VAT calculation and bulk updates."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Catalog" },
          { label: "Prices" },
        ]}
        actions={
          isDirty && canEdit ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={saveAction.busy}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saveAction.busy}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saveAction.busy ? "Saving..." : `Save changes (${Object.keys(edits).length})`}
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
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
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
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-medium text-dashboard-text">{service.name}</h3>
                        {!service.is_active && (
                          <span className="rounded bg-rose-500/10 px-2 py-0.5 text-xs text-rose-500">
                            Service Inactive
                          </span>
                        )}
                      </div>

                      {service.price_options.length === 0 ? (
                        <p className="text-xs italic text-dashboard-muted">
                          No price options configured for this service.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-dashboard-border text-dashboard-muted">
                                <th className="pb-2 font-medium">Option label</th>
                                <th className="pb-2 font-medium">Property type</th>
                                <th className="pb-2 font-medium">Type</th>
                                <th className="pb-2 font-medium w-32">Price (ex VAT)</th>
                                <th className="pb-2 font-medium w-28">VAT rate</th>
                                <th className="pb-2 font-medium w-28">Price (inc VAT)</th>
                                <th className="pb-2 font-medium text-right w-20">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-dashboard-border/50">
                              {service.price_options.map((opt) => {
                                const edit = edits[opt.id];
                                const currentText = edit ? edit.priceText : priceText(opt.price_pence);
                                const currentVat = edit ? edit.vatRateBp : opt.vat_rate_bp;
                                const currentActive = edit ? edit.isActive : opt.is_active;

                                const parsedPence = readPrice(currentText).pence ?? opt.price_pence;
                                const calculatedIncVat = grossPence(parsedPence, currentVat);
                                const isModified = Boolean(edit);

                                return (
                                  <tr
                                    key={opt.id}
                                    className={cn(
                                      "hover:bg-dashboard-surface/30 transition-colors",
                                      isModified && "bg-amber-500/5",
                                    )}
                                  >
                                    <td className="py-2.5 font-medium text-dashboard-text">
                                      {opt.label}
                                    </td>
                                    <td className="py-2.5 text-dashboard-muted">
                                      {opt.property_type?.name ?? "Any"}
                                    </td>
                                    <td className="py-2.5 uppercase font-mono text-[11px] text-dashboard-muted">
                                      {opt.pricing_type}
                                    </td>
                                    <td className="py-2.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-dashboard-muted">£</span>
                                        <input
                                          type="text"
                                          disabled={!canEdit}
                                          value={currentText}
                                          onChange={(e) => handlePriceChange(opt, e.target.value)}
                                          className="h-7 w-24 rounded border border-dashboard-border bg-dashboard-surface px-2 text-xs font-mono text-dashboard-text focus:border-dashboard-primary focus:outline-none disabled:opacity-50"
                                        />
                                      </div>
                                    </td>
                                    <td className="py-2.5">
                                      <select
                                        disabled={!canEdit}
                                        value={currentVat}
                                        onChange={(e) => handleVatChange(opt, Number(e.target.value))}
                                        className="h-7 rounded border border-dashboard-border bg-dashboard-surface px-2 text-xs text-dashboard-text focus:border-dashboard-primary focus:outline-none disabled:opacity-50"
                                      >
                                        {VAT_RATES.map((rate) => (
                                          <option key={rate.value} value={rate.value}>
                                            {rate.label}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-2.5 font-mono text-dashboard-text font-medium">
                                      £{priceText(calculatedIncVat)}
                                    </td>
                                    <td className="py-2.5 text-right">
                                      <button
                                        type="button"
                                        disabled={!canEdit}
                                        onClick={() => handleActiveToggle(opt)}
                                        className={cn(
                                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50",
                                          currentActive
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                            : "bg-dashboard-surface text-dashboard-muted",
                                        )}
                                      >
                                        {currentActive ? "Active" : "Inactive"}
                                      </button>
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
    </>
  );
}
