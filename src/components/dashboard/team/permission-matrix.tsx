"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PAGE_LABELS, type Access } from "@/lib/auth/permissions";
import {
  GRANTABLE_PAGES,
  MATRIX_GROUPS,
  grantedCount,
  sameMatrix,
  setAccess,
  type Matrix,
} from "@/lib/team/matrix";
import { cn } from "@/lib/utils/cn";

const LEVELS: { value: Access; label: string }[] = [
  { value: "none", label: "No access" },
  { value: "view", label: "View" },
  { value: "edit", label: "Edit" },
];

/**
 * Page by page access for a manager or editor: one radio group per page (No access, View,
 * Edit). Team, settings and the audit log are never offered: only owner and admin have them.
 */
export function PermissionMatrix({
  value,
  onChange,
  defaults,
  disabled = false,
}: {
  value: Matrix;
  onChange: (next: Matrix) => void;
  /** The role's defaults, for the reset button. */
  defaults: Matrix | null;
  disabled?: boolean;
}) {
  const isDefault = defaults ? sameMatrix(value, defaults) : true;
  return (
    <fieldset className="space-y-3" data-testid="permission-matrix" disabled={disabled}>
      <legend className="sr-only">Page access</legend>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-hidden="true" className="text-h5 font-heading font-bold text-primary">
          Page access
        </p>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={disabled || !defaults || isDefault}
          onClick={() => defaults && onChange(defaults)}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset to role defaults
        </Button>
      </div>
      <p className="font-body text-caption text-text-muted" aria-live="polite">
        {`${String(grantedCount(value))} of ${String(GRANTABLE_PAGES.length)} pages`}
        {isDefault ? ", the role defaults." : ", customised."}
      </p>
      <div className="overflow-x-auto rounded-md border-thin border-border">
        <table className="w-full border-collapse font-body text-small">
          <caption className="sr-only">Access for each dashboard page</caption>
          <thead className="bg-surface">
            <tr className="border-b-thin border-border">
              <th scope="col" className="px-cell-x py-2 text-left font-semibold text-text-muted">
                Page
              </th>
              {LEVELS.map((level) => (
                <th
                  key={level.value}
                  scope="col"
                  className="px-cell-x py-2 text-center font-semibold text-text-muted"
                >
                  {level.label}
                </th>
              ))}
            </tr>
          </thead>
          {MATRIX_GROUPS.map((group) => (
            <tbody
              key={group.title}
              className="divide-y-thin divide-border border-b-thin border-border"
            >
              <tr className="bg-surface-alt">
                <th
                  scope="colgroup"
                  colSpan={LEVELS.length + 1}
                  className="px-cell-x py-1.5 text-left font-heading text-caption font-bold tracking-wider text-text-muted uppercase"
                >
                  {group.title}
                </th>
              </tr>
              {group.pages.map((page) => {
                const name = `access-${page}`;
                return (
                  <tr key={page} className="h-row-compact" data-page={page}>
                    <th
                      scope="row"
                      id={`${name}-label`}
                      className="px-cell-x text-left font-normal text-text"
                    >
                      {PAGE_LABELS[page]}
                    </th>
                    {LEVELS.map((level) => {
                      const checked = value[page] === level.value;
                      return (
                        <td key={level.value} className="px-cell-x text-center">
                          <label
                            className={cn(
                              "inline-flex min-h-touch min-w-touch cursor-pointer items-center justify-center",
                              disabled && "cursor-not-allowed",
                            )}
                          >
                            <input
                              type="radio"
                              name={name}
                              value={level.value}
                              checked={checked}
                              onChange={() => onChange(setAccess(value, page, level.value))}
                              className="h-4 w-4 accent-primary"
                              aria-label={`${PAGE_LABELS[page]}: ${level.label}`}
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </fieldset>
  );
}
