"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Copy, MoreHorizontal, Pencil, Plus, RotateCcw, Star, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SortableList, reorderPayload } from "@/components/dashboard/content/sortable-list";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable } from "@/components/dashboard/data-table";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { MoneyText } from "@/components/dashboard/money-text";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/dashboard/primitives";
import { usePermission } from "@/components/dashboard/session-context";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useUrlFilters } from "@/components/dashboard/use-url-filters";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Category, ServiceSummary } from "@/lib/api/schemas";
import { admin, adminPage } from "@/lib/client/api";
import { actionErrorMessage, errorMessage } from "@/lib/client/errors";

import { CategoriesPanel } from "./categories-panel";
import { PropertyTypesPanel } from "./property-types-panel";
import { ServiceDialog } from "./service-dialog";

const KEYS = ["q", "category", "active", "featured", "bookable", "commercial", "deleted"] as const;

const YES_NO = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

function boolParam(value: string): boolean | undefined {
  return value === "true" ? true : value === "false" ? false : undefined;
}

export function useCategories(includeDeleted = false) {
  return useQuery({
    queryKey: ["categories", includeDeleted],
    queryFn: () =>
      admin<Category[]>("/categories", { query: { include_deleted: includeDeleted, sort: "sort_order" } }),
  });
}

/** Services, categories and property types (page services). */
export function ServicesView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = params.get("tab") ?? "services";
  return (
    <Tabs
      value={tab}
      onValueChange={(value) =>
        router.replace((value === "services" ? pathname : `${pathname}?tab=${value}`) as Route, {
          scroll: false,
        })
      }
    >
      <TabsList className="mb-4">
        <TabsTrigger value="services">Services</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="property-types">Property types</TabsTrigger>
      </TabsList>
      <TabsContent value="services">
        <ServicesList />
      </TabsContent>
      <TabsContent value="categories">
        <CategoriesPanel />
      </TabsContent>
      <TabsContent value="property-types">
        <PropertyTypesPanel />
      </TabsContent>
    </Tabs>
  );
}

function ServicesList() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermission("services");
  const [filters, setFilters] = useUrlFilters(KEYS);
  const categories = useCategories();
  const [reordering, setReordering] = React.useState(false);
  const [deleting, setDeleting] = React.useState<ServiceSummary | null>(null);
  const [editingService, setEditingService] = React.useState<ServiceSummary | "new" | null>(null);
  const [editTab, setEditTab] = React.useState<"details" | "prices">("details");

  const query = {
    search: filters.q || undefined,
    category_id: filters.category || undefined,
    is_active: boolParam(filters.active),
    is_featured: boolParam(filters.featured),
    is_bookable: boolParam(filters.bookable),
    is_commercial: boolParam(filters.commercial),
    include_deleted: filters.deleted === "true",
    sort: "sort_order",
    page_size: 100,
  };
  const list = useQuery({
    queryKey: ["services", query],
    queryFn: () => adminPage<ServiceSummary[]>("/services", { query }),
    placeholderData: keepPreviousData,
  });
  const rows = list.data?.data ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["services"] });

  const act = async (path: string, message: string, method = "POST") => {
    try {
      await admin(path, { method });
      toast.success(message);
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (error) {
      toast.error(actionErrorMessage(error));
    }
  };

  const reorder = async (items: ServiceSummary[]) => {
    queryClient.setQueryData(["services", query], { ...list.data, data: items });
    try {
      await admin("/services/reorder", { method: "PUT", json: reorderPayload(items, (s) => s.id) });
      toast.success("Order saved.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
    await refresh();
  };

  const columns: ColumnDef<ServiceSummary>[] = [
    {
      id: "name",
      header: "Service",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => {
            if (canEdit) {
              setEditTab("details");
              setEditingService(row.original);
            }
          }}
          className="flex flex-col text-left group focus-visible:outline-focus"
          aria-label={canEdit ? `Edit ${row.original.name}` : row.original.name}
        >
          <span className="font-semibold text-primary underline-offset-4 group-hover:underline">
            {row.original.name}
          </span>
          <span className="text-caption text-text-muted">/services/{row.original.slug}</span>
        </button>
      ),
    },
    { id: "category", header: "Category", cell: ({ row }) => row.original.category.name },
    {
      id: "price",
      header: "From (ex VAT)",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.from_price_pence === null ? (
            <span className="text-text-muted">No prices</span>
          ) : (
            <MoneyText pence={row.original.from_price_pence} />
          )}
          {canEdit && !row.original.deleted_at ? (
            <button
              type="button"
              onClick={() => {
                setEditTab("prices");
                setEditingService(row.original);
              }}
              className="text-[11px] font-semibold text-accent hover:underline px-1.5 py-0.5 rounded bg-accent-soft/40 transition-colors"
              title="Edit price packages for this service"
            >
              Prices
            </button>
          ) : null}
        </div>
      ),
    },
    {
      id: "flags",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-caption text-text-muted">
          {[row.original.is_bookable ? "Bookable" : "Quote only", row.original.is_commercial ? "Commercial" : null]
            .filter(Boolean)
            .join(", ")}
        </span>
      ),
    },
    {
      id: "active",
      header: "Active",
      cell: ({ row }) =>
        row.original.deleted_at ? (
          <StatusBadge kind="content" status="deleted" label="Deleted" />
        ) : canEdit ? (
          <label className="inline-flex min-h-touch cursor-pointer items-center gap-2 text-small">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={row.original.is_active}
              onChange={() =>
                void act(
                  `/services/${row.original.id}/toggle-active`,
                  row.original.is_active ? `${row.original.name} hidden from the website.` : `${row.original.name} is live.`,
                )
              }
              aria-label={`${row.original.name} active`}
            />
            {row.original.is_active ? "Active" : "Hidden"}
          </label>
        ) : (
          <StatusBadge kind="content" status={row.original.is_active ? "active" : "inactive"} label={row.original.is_active ? "Active" : "Hidden"} />
        ),
    },
    {
      id: "featured",
      header: "Featured",
      cell: ({ row }) =>
        canEdit && !row.original.deleted_at ? (
          <Button
            variant="ghost"
            size="xs"
            aria-pressed={row.original.is_featured}
            aria-label={`Feature ${row.original.name} on the home page`}
            onClick={() =>
              void act(
                `/services/${row.original.id}/toggle-featured`,
                row.original.is_featured ? "No longer featured." : "Featured on the website.",
              )
            }
          >
            <Star
              className={row.original.is_featured ? "h-4 w-4 fill-accent text-accent" : "h-4 w-4 text-text-muted"}
              aria-hidden="true"
            />
          </Button>
        ) : row.original.is_featured ? (
          "Yes"
        ) : (
          "No"
        ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) =>
        canEdit ? (
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="xs" aria-label={`Actions for ${row.original.name}`}>
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </MenuTrigger>
            <MenuContent align="end">
              {row.original.deleted_at ? (
                <MenuItem onSelect={() => void act(`/services/${row.original.id}/restore`, "Service restored.")}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restore
                </MenuItem>
              ) : (
                <>
                  <MenuItem
                    onSelect={() => {
                      setEditTab("details");
                      setEditingService(row.original);
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit service details
                  </MenuItem>
                  <MenuItem
                    onSelect={() => {
                      setEditTab("prices");
                      setEditingService(row.original);
                    }}
                  >
                    <Tag className="h-4 w-4" aria-hidden="true" /> Manage price options
                  </MenuItem>
                  <MenuItem
                    onSelect={() =>
                      void act(`/services/${row.original.id}/duplicate`, "Copy created (hidden until you activate it).")
                    }
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" /> Duplicate
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem className="text-error-text" onSelect={() => setDeleting(row.original)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                  </MenuItem>
                </>
              )}
            </MenuContent>
          </Menu>
        ) : null,
    },
  ];

  const categoryOptions = (categories.data ?? []).map((c) => ({ value: c.id, label: c.name }));
  const canReorder = canEdit && Boolean(filters.category) && !filters.q && filters.deleted !== "true";

  return (
    <>
      <FilterBar
        search={{ value: filters.q, label: "Search", placeholder: "Service name" }}
        selects={[
          { key: "category", label: "Category", value: filters.category, options: categoryOptions },
          { key: "active", label: "Active", value: filters.active, options: YES_NO },
          { key: "featured", label: "Featured", value: filters.featured, options: YES_NO },
          { key: "bookable", label: "Bookable online", value: filters.bookable, options: YES_NO },
          { key: "commercial", label: "Commercial", value: filters.commercial, options: YES_NO },
          { key: "deleted", label: "Deleted", value: filters.deleted, options: [{ value: "true", label: "Show deleted" }] },
        ]}
        onChange={(key, value) => setFilters({ [key]: value })}
        onReset={() => setFilters(Object.fromEntries(KEYS.map((k) => [k, null])))}
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-body text-small text-text-muted">
          {canEdit
            ? canReorder
              ? "Drag services (or use the handles with the keyboard) to set their order on the website."
              : "Choose a category to reorder its services."
            : "You can view services. Ask an owner or admin for edit access to change them."}
        </p>
        <div className="flex items-center gap-2">
          {canReorder ? (
            <Button variant="outline" size="sm" onClick={() => setReordering((r) => !r)} aria-pressed={reordering}>
              {reordering ? "Done reordering" : "Reorder"}
            </Button>
          ) : null}
          {canEdit ? (
            <Button
              size="sm"
              variant="accent"
              onClick={() => setEditingService("new")}
              data-testid="new-service-btn"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> New service
            </Button>
          ) : null}
        </div>
      </div>
      {reordering && canReorder ? (
        <SortableList
          items={rows}
          getId={(s) => s.id}
          getLabel={(s) => s.name}
          onReorder={(items) => void reorder(items)}
          label="Services in order"
          testId="services-sortable"
          renderItem={(s, handle) => (
            <div className="flex items-center gap-3 rounded-md border-thin border-border bg-background px-3 py-2 font-body text-small">
              {handle}
              <span className="font-semibold">{s.name}</span>
              {!s.is_active ? <StatusBadge kind="content" status="inactive" label="Hidden" /> : null}
            </div>
          )}
        />
      ) : (
        <DataTable
          caption="Services"
          columns={columns}
          data={rows}
          isLoading={list.isPending}
          error={list.isError ? errorMessage(list.error) : null}
          onRetry={() => void list.refetch()}
          getRowId={(s) => s.id}
          pageSize={50}
          emptyTitle="No services match"
          emptyDescription="Try another search or clear the filters."
          testId="services-table"
        />
      )}
      {editingService ? (
        <ServiceDialog
          service={editingService === "new" ? null : editingService}
          initialTab={editTab}
          onClose={() => {
            setEditingService(null);
            setEditTab("details");
          }}
          onSaved={() => void refresh()}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "this service"}?`}
        description="It disappears from the website and booking form. You can restore it later from Show deleted."
        confirmLabel="Delete service"
        destructive
        onConfirm={async () => {
          if (deleting) await act(`/services/${deleting.id}`, "Service deleted.", "DELETE");
          setDeleting(null);
        }}
      />
      {categories.isError ? <Alert variant="error">{errorMessage(categories.error)}</Alert> : null}
    </>
  );
}
