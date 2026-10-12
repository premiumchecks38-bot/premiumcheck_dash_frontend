"use client";

import * as React from "react";
import { ChevronDown, Search, X } from "lucide-react";

import { dateInputClass, selectClass } from "@/components/dashboard/field-styles";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BookingOptions } from "@/lib/api/schemas";
import { BOOKING_STATUS_LABELS, PAYMENT_STATE_LABELS } from "@/lib/bookings/badges";
import {
  activeFilterCount,
  DATE_PRESETS,
  PAYMENT_FILTERS,
  PRESET_LABELS,
  type BookingFilters,
  type BookingStatus,
} from "@/lib/bookings/filters";

interface Props {
  filters: BookingFilters;
  onChange: (changes: Partial<BookingFilters>) => void;
  options: BookingOptions | undefined;
  statuses: readonly BookingStatus[];
  /** Past bookings: certificate filters. */
  past?: boolean;
}

/** Filters above a bookings table. Every value lives in the URL (useBookingFilters). */
export function BookingFilterBar({ filters, onChange, options, statuses, past = false }: Props) {
  const [text, setText] = React.useState(filters.q);
  const [lastQ, setLastQ] = React.useState(filters.q);
  if (filters.q !== lastQ) {
    // The URL changed elsewhere (for example "Clear filters").
    setLastQ(filters.q);
    setText(filters.q);
  }

  React.useEffect(() => {
    if (text === filters.q) return;
    const timer = setTimeout(() => onChange({ q: text.trim() }), 300);
    return () => clearTimeout(timer);
  }, [text, filters.q, onChange]);

  const custom = !filters.preset && Boolean(filters.from || filters.to);
  const [showCustom, setShowCustom] = React.useState(custom);
  const dateValue = filters.preset || (custom || showCustom ? "custom" : "");

  const statusText =
    filters.statuses.length === 0
      ? "All statuses"
      : filters.statuses.length === 1
        ? (BOOKING_STATUS_LABELS[filters.statuses[0] ?? ""] ?? "1 selected")
        : `${String(filters.statuses.length)} statuses`;

  const toggleStatus = (status: BookingStatus, on: boolean) => {
    const next = on ? [...filters.statuses, status] : filters.statuses.filter((s) => s !== status);
    onChange({ statuses: statuses.filter((s) => next.includes(s)) });
  };

  const active = activeFilterCount(filters);

  return (
    <div
      role="search"
      aria-label="Filter bookings"
      className="mb-4 grid gap-3 rounded-lg border-thin border-border bg-background p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
    >
      <div className="sm:col-span-2">
        <Label htmlFor="booking-search">Search</Label>
        <div className="relative mt-1.5">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-subtle"
            aria-hidden="true"
          />
          <Input
            id="booking-search"
            type="search"
            value={text}
            placeholder="Reference, name, email, phone or postcode"
            className="pl-9"
            onChange={(event) => setText(event.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="booking-dates">Dates</Label>
        <select
          id="booking-dates"
          className={`mt-1.5 ${selectClass}`}
          value={dateValue}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "custom") {
              setShowCustom(true);
              onChange({ preset: "" });
            } else {
              setShowCustom(false);
              onChange({ preset: value as BookingFilters["preset"], from: "", to: "" });
            }
          }}
        >
          <option value="">Any date</option>
          {DATE_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {PRESET_LABELS[preset]}
            </option>
          ))}
          <option value="custom">Custom range</option>
        </select>
      </div>

      {dateValue === "custom" ? (
        <>
          <div>
            <Label htmlFor="booking-from">From</Label>
            <input
              id="booking-from"
              type="date"
              className={`mt-1.5 ${dateInputClass}`}
              value={filters.from}
              onChange={(event) => onChange({ from: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="booking-to">To</Label>
            <input
              id="booking-to"
              type="date"
              className={`mt-1.5 ${dateInputClass}`}
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => onChange({ to: event.target.value })}
            />
          </div>
        </>
      ) : null}

      <div>
        <span id="booking-status-label" className="font-body text-small font-semibold text-text">
          Status
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="control"
              size="none"
              type="button"
              aria-labelledby="booking-status-label booking-status-value"
              className={`mt-1.5 flex items-center justify-between gap-2 text-left ${selectClass}`}
              data-testid="status-filter"
            >
              <span id="booking-status-value">{statusText}</span>
              <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <fieldset>
              <legend className="sr-only">Statuses to show</legend>
              {statuses.map((status) => (
                <label
                  key={status}
                  className="flex min-h-touch cursor-pointer items-center gap-3 rounded-sm px-2 font-body text-small hover:bg-surface-alt"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={filters.statuses.includes(status)}
                    onChange={(event) => toggleStatus(status, event.target.checked)}
                  />
                  {BOOKING_STATUS_LABELS[status]}
                </label>
              ))}
            </fieldset>
          </PopoverContent>
        </Popover>
      </div>

      <FilterSelect
        id="booking-payment"
        label="Payment"
        value={filters.payment}
        onChange={(value) => onChange({ payment: value as BookingFilters["payment"] })}
        options={PAYMENT_FILTERS.map((p) => ({ value: p, label: PAYMENT_STATE_LABELS[p] }))}
      />
      <FilterSelect
        id="booking-service"
        label="Service"
        value={filters.service}
        onChange={(value) => onChange({ service: value })}
        options={(options?.services ?? []).map((s) => ({ value: s.id, label: s.name }))}
      />
      <FilterSelect
        id="booking-area"
        label="Area"
        value={filters.area}
        onChange={(value) => onChange({ area: value })}
        options={(options?.areas ?? []).map((a) => ({ value: a.id, label: a.name }))}
      />
      <FilterSelect
        id="booking-engineer"
        label="Engineer"
        value={filters.engineer}
        onChange={(value) => onChange({ engineer: value })}
        options={(options?.engineers ?? []).map((e) => ({ value: e.id, label: e.name }))}
      />
      <FilterSelect
        id="booking-window"
        label="Window"
        value={filters.window}
        onChange={(value) => onChange({ window: value })}
        options={(options?.windows ?? []).map((w) => ({
          value: w.code,
          label: `${w.code} (${w.label})`,
        }))}
      />
      {past ? (
        <>
          <FilterSelect
            id="booking-certificate"
            label="Certificate"
            value={filters.hasCertificate}
            onChange={(value) =>
              onChange({ hasCertificate: value as BookingFilters["hasCertificate"] })
            }
            options={[
              { value: "yes", label: "Has a certificate" },
              { value: "no", label: "No certificate" },
            ]}
          />
          <FilterSelect
            id="booking-expiring"
            label="Certificate expiring"
            allLabel="Any time"
            value={filters.expiringWithin}
            onChange={(value) => onChange({ expiringWithin: value })}
            options={["30", "60", "90", "180"].map((d) => ({
              value: d,
              label: `Within ${d} days`,
            }))}
          />
        </>
      ) : null}

      {active > 0 ? (
        <div className="flex items-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowCustom(false);
              setText("");
              onChange({
                q: "",
                statuses: [],
                service: "",
                area: "",
                engineer: "",
                payment: "",
                window: "",
                from: "",
                to: "",
                preset: "",
                attention: false,
                unassigned: false,
                hasCertificate: "",
                expiringWithin: "",
              });
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" /> Clear filters ({active})
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  allLabel = "All",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className={`mt-1.5 ${selectClass}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
