"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelect {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
}

export interface FilterBarProps {
  search?: { value: string; label: string; placeholder?: string };
  selects?: FilterSelect[];
  onChange: (key: string, value: string) => void;
  onReset?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/** Search box and select filters above a table. Values come from (and go to) the URL. */
export function FilterBar({
  search,
  selects = [],
  onChange,
  onReset,
  className,
  children,
}: FilterBarProps) {
  const [text, setText] = React.useState(search?.value ?? "");
  const searchId = React.useId();

  // Typing updates the URL after a short pause, not on every key.
  React.useEffect(() => {
    if (!search || text === search.value) return;
    const timer = setTimeout(() => onChange("q", text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text, search, onChange]);

  const active = Boolean(search?.value) || selects.some((s) => s.value);

  return (
    <div
      role="search"
      className={cn(
        "mb-4 flex flex-wrap items-end gap-3 rounded-lg border-thin border-border bg-background p-4",
        className,
      )}
    >
      {search ? (
        <div className="min-w-56 flex-1">
          <Label htmlFor={searchId}>{search.label}</Label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-subtle"
              aria-hidden="true"
            />
            <Input
              id={searchId}
              type="search"
              value={text}
              placeholder={search.placeholder}
              className="pl-9"
              onChange={(event) => setText(event.target.value)}
            />
          </div>
        </div>
      ) : null}
      {selects.map((select) => {
        const id = `filter-${select.key}`;
        return (
          <div key={select.key} className="min-w-40">
            <Label htmlFor={id}>{select.label}</Label>
            <select
              id={id}
              value={select.value}
              onChange={(event) => onChange(select.key, event.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border-thin border-border bg-background px-3 font-body text-small text-text focus-visible:outline-focus focus-visible:outline-focus-ring"
            >
              <option value="">All</option>
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}
      {children}
      {active && onReset ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setText("");
            onReset();
          }}
        >
          <X className="h-4 w-4" aria-hidden="true" /> Clear filters
        </Button>
      ) : null}
    </div>
  );
}
