"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, RefreshCw } from "lucide-react";

import { DropdownMenu } from "radix-ui";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Menu, MenuContent, MenuLabel, MenuTrigger } from "@/components/dashboard/primitives";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

export interface ServerPagination {
  /** 1 based. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  /** Accessible table name, also used for the column menu. */
  caption: string;
  columns: ColumnDef<T>[];
  data: T[] | undefined;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  pageSize?: number;
  /** Page number (1 based) and its setter, for keeping the page in the URL. */
  page?: number;
  onPageChange?: (page: number) => void;
  /** The backend paginates: only the current page is in `data`. */
  serverPagination?: ServerPagination;
  initialSorting?: SortingState;
  /** The backend sorts: sorting changes are reported, rows are not reordered here. */
  manualSorting?: { sorting: SortingState; onSortingChange: (sorting: SortingState) => void };
  getRowId?: (row: T) => string;
  /** Adds a checkbox column. Keys are row ids; label names a row for screen readers. */
  selection?: {
    selected: RowSelectionState;
    onChange: (selected: RowSelectionState) => void;
    label?: (row: T) => string;
  };
  /** Pointer shortcut to the row's main link (keyboard users use that link). */
  onRowClick?: (row: T) => void;
  /** Cells for a totals row, keyed by column id. */
  totals?: Partial<Record<string, React.ReactNode>>;
  rowClassName?: (row: T) => string | undefined;
  compact?: boolean;
  testId?: string;
}

const SKELETON_ROWS = 5;
const INTERACTIVE = "a, button, input, select, textarea, label, [role='checkbox']";

/**
 * Table shell for every list: sorting, pagination (in the browser or by the backend), column
 * visibility, row selection, loading skeleton rows, empty and error states, and a totals row.
 * Pages give it columns and rows; filters live in the URL (FilterBar).
 */
export function DataTable<T>({
  caption,
  columns,
  data,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = "Nothing to show yet",
  emptyDescription,
  pageSize = 20,
  page = 1,
  onPageChange,
  serverPagination,
  initialSorting = [],
  manualSorting,
  getRowId,
  selection,
  onRowClick,
  totals,
  rowClassName,
  compact = false,
  testId,
}: DataTableProps<T>) {
  // TanStack Table manages its own state object; the React Compiler must not memoise it.
  "use no memo";
  const [localSorting, setLocalSorting] = React.useState<SortingState>(initialSorting);
  const [visibility, setVisibility] = React.useState<VisibilityState>({});
  const [localPage, setLocalPage] = React.useState(page);
  const sorting = manualSorting?.sorting ?? localSorting;
  const size = serverPagination?.pageSize ?? pageSize;
  const pageIndex = (serverPagination?.page ?? (onPageChange ? page : localPage)) - 1;

  const allColumns = React.useMemo<ColumnDef<T>[]>(() => {
    if (!selection) return columns;
    const select: ColumnDef<T> = {
      id: "select",
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          aria-label="Select all rows on this page"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => {
            if (el) el.indeterminate = table.getIsSomePageRowsSelected();
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          aria-label={`Select ${selection.label?.(row.original) ?? `row ${row.id}`}`}
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    };
    return [select, ...columns];
  }, [columns, selection]);

  // eslint-disable-next-line react-hooks/incompatible-library -- opted out above with "use no memo"
  const table = useReactTable({
    data: data ?? [],
    columns: allColumns,
    getRowId,
    state: {
      sorting,
      columnVisibility: visibility,
      pagination: { pageIndex, pageSize: size },
      rowSelection: selection?.selected ?? {},
    },
    enableRowSelection: Boolean(selection),
    onRowSelectionChange: (updater) => {
      if (!selection) return;
      selection.onChange(typeof updater === "function" ? updater(selection.selected) : updater);
    },
    manualSorting: Boolean(manualSorting),
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      if (manualSorting) manualSorting.onSortingChange(next);
      else setLocalSorting(next);
    },
    onColumnVisibilityChange: setVisibility,
    manualPagination: Boolean(serverPagination),
    pageCount: serverPagination ? Math.max(1, Math.ceil(serverPagination.total / size)) : undefined,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize: size }) : updater;
      if (serverPagination) serverPagination.onPageChange(next.pageIndex + 1);
      else if (onPageChange) onPageChange(next.pageIndex + 1);
      else setLocalPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getPaginationRowModel: serverPagination ? undefined : getPaginationRowModel(),
  });

  const rowHeight = compact ? "h-row-compact" : "h-row";
  const visibleColumns = table.getVisibleLeafColumns();
  const pageCount = Math.max(table.getPageCount(), 1);
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide());
  const totalRows = serverPagination?.total ?? data?.length ?? 0;

  if (error) {
    return (
      <Alert variant="error" title="This list could not be loaded" data-testid="table-error">
        <span className="block">{error}</span>
        {onRetry ? (
          <Button variant="outline" size="xs" className="mt-3" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
          </Button>
        ) : null}
      </Alert>
    );
  }

  if (!isLoading && data?.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div
      className="rounded-lg border-thin border-border bg-background"
      data-testid={testId}
    >
      {hideable.length > 0 ? (
        <div className="flex items-center justify-between gap-3 border-b-thin border-border px-3 py-2">
          <p className="px-1 font-body text-caption text-text-muted" aria-live="polite">
            {isLoading
              ? "Loading..."
              : `${totalRows.toLocaleString("en-GB")} ${totalRows === 1 ? "result" : "results"}`}
          </p>
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="xs" aria-label={`Choose columns for ${caption}`}>
                <Columns3 className="h-4 w-4" aria-hidden="true" /> Columns
              </Button>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuLabel>
                <span className="font-body text-caption font-semibold text-text-muted">
                  Show columns
                </span>
              </MenuLabel>
              {hideable.map((column) => (
                <DropdownMenu.CheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(value)}
                  onSelect={(event) => event.preventDefault()}
                  className="flex min-h-touch cursor-pointer items-center gap-2 rounded-sm px-3 font-body text-small outline-none data-[highlighted]:bg-surface-alt"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 rounded-sm border-thin border-border",
                      column.getIsVisible() && "border-primary bg-primary",
                    )}
                  />
                  {typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id}
                </DropdownMenu.CheckboxItem>
              ))}
            </MenuContent>
          </Menu>
        </div>
      ) : null}
      {/* relative: absolutely positioned screen reader text stays inside the scroll area. */}
      <div className="relative overflow-x-auto">
        <table
          className="w-full border-collapse text-left font-body text-small"
          aria-busy={isLoading}
        >
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b-thin border-border">
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : undefined
                      }
                      className="px-cell-x py-3 font-heading text-caption font-bold tracking-wider whitespace-nowrap text-text-muted uppercase"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <Button
                          variant="ghost"
                          size="none"
                          className="-mx-2 inline-flex items-center gap-1 rounded-sm px-2 py-1 font-heading text-caption font-bold tracking-wider uppercase"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
                          )}
                        </Button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y-thin divide-border">
            {isLoading
              ? Array.from({ length: SKELETON_ROWS }, (_, row) => (
                  <tr key={row} className={rowHeight} data-testid="skeleton-row">
                    {visibleColumns.map((column) => (
                      <td key={column.id} className="px-cell-x">
                        <Skeleton className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-row-id={row.id}
                    data-selected={row.getIsSelected() || undefined}
                    className={cn(
                      rowHeight,
                      "hover:bg-surface data-[selected]:bg-surface",
                      onRowClick && "cursor-pointer",
                      rowClassName?.(row.original),
                    )}
                    onClick={
                      onRowClick
                        ? (event) => {
                            if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
                            onRowClick(row.original);
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-cell-x py-2 align-middle text-text">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
          {totals && !isLoading ? (
            <tfoot className="border-t-thick border-border bg-surface font-semibold">
              <tr className={rowHeight} data-testid="table-totals">
                {visibleColumns.map((column, index) => (
                  <td key={column.id} className="px-cell-x py-2 align-middle text-text">
                    {totals[column.id] ??
                      (index === 0 ? <span className="sr-only">Totals</span> : null)}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      {!isLoading && pageCount > 1 ? (
        <nav
          aria-label={`${caption} pages`}
          className="flex items-center justify-between gap-3 border-t-thin border-border px-cell-x py-3 font-body text-small text-text-muted"
        >
          <span>
            Page {pageIndex + 1} of {pageCount}
          </span>
          <span className="flex gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </span>
        </nav>
      ) : null}
    </div>
  );
}
