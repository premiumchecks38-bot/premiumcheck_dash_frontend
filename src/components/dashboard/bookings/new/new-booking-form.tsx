"use client";

import * as React from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { selectClass } from "@/components/dashboard/field-styles";
import { FormSection } from "@/components/dashboard/form-section";
import { MoneyText } from "@/components/dashboard/money-text";
import { usePermission, useSessionUser } from "@/components/dashboard/session-context";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BookingDetail, BookingOptions, CustomerListItem, Quote } from "@/lib/api/schemas";
import { bookingErrorMessage } from "@/lib/bookings/errors";
import { CUSTOMER_TYPE_LABELS, OFFLINE_METHOD_LABELS } from "@/lib/bookings/labels";
import { CERTIFICATE_SERVICE_HINTS, readPrefill } from "@/lib/bookings/prefill";
import { timeOf } from "@/lib/bookings/reschedule";
import { admin, adminPage } from "@/lib/client/api";
import { fieldErrors } from "@/lib/client/errors";
import { londonToday } from "@/lib/dates";

import { useBookingOptions } from "../use-booking-options";
import { WindowPicker } from "../window-picker";

interface Line {
  key: number;
  serviceId: string;
  optionId: string;
  quantity: number;
}

type PaymentChoice = "on_inspection" | "payment_link" | "paid_offline";

type Errors = Partial<Record<string, string>>;

function firstOption(
  options: BookingOptions | undefined,
  serviceId: string,
  propertyTypeId: string,
): string {
  const service = options?.services.find((s) => s.id === serviceId);
  const fitting = service?.options.filter(
    (o) => !o.property_type_id || o.property_type_id === propertyTypeId,
  );
  return fitting?.[0]?.id ?? service?.options[0]?.id ?? "";
}

const REPEATED_OPTION =
  "The same service and option is listed twice. Remove one and raise its quantity instead.";

export function NewBookingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useSessionUser();
  const customersAccess = usePermission("customers");
  const paymentsAccess = usePermission("payments");
  const options = useBookingOptions();
  const prefill = React.useMemo(
    () => readPrefill(new URLSearchParams(params.toString())),
    [params],
  );
  const mayOverride = user.role === "owner" || user.role === "admin";

  // Customer
  const [mode, setMode] = React.useState<"existing" | "new">("new");
  const [search, setSearch] = React.useState(prefill.email || prefill.phone);
  const [term, setTerm] = React.useState(search);
  const [customerId, setCustomerId] = React.useState("");
  const [customer, setCustomer] = React.useState({
    full_name: prefill.name,
    email: prefill.email,
    phone: prefill.phone,
    company_name: "",
    customer_type: "landlord",
    marketing_opt_in: false,
  });

  // Property
  const [property, setProperty] = React.useState({
    address_line1: prefill.addressLine1,
    address_line2: "",
    city: prefill.city,
    postcode: prefill.postcode,
    property_type_id: "",
    property_number: "",
    parking: "" as "" | "yes" | "no",
    in_congestion_zone: false,
    key_collection_details: "",
    engineer_instructions: "",
    access_notes: "",
  });

  // Services
  const nextKey = React.useRef(1);
  const [lines, setLines] = React.useState<Line[]>([]);
  const [seeded, setSeeded] = React.useState(false);

  // Date and payment
  const [date, setDate] = React.useState(londonToday());
  const [windowCode, setWindowCode] = React.useState<string | null>(null);
  const [windowStart, setWindowStart] = React.useState<string | null>(null);
  const [override, setOverride] = React.useState(false);
  const [payment, setPayment] = React.useState<PaymentChoice>("on_inspection");
  const [offlineMethod, setOfflineMethod] = React.useState("bank_transfer");
  const [offlineReference, setOfflineReference] = React.useState("");
  const [notes, setNotes] = React.useState(prefill.notes);

  const [errors, setErrors] = React.useState<Errors>({});
  const [failure, setFailure] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Defaults once the options arrive: property type, and prefilled services.
  if (options.data && !seeded) {
    setSeeded(true);
    const propertyTypeId = options.data.property_types[0]?.id ?? "";
    setProperty((p) => ({ ...p, property_type_id: p.property_type_id || propertyTypeId }));
    // Seeded lines take negative keys; lines added later count up from nextKey.
    const fromItems: Line[] = prefill.items
      .map((item, index) => {
        const service = options.data.services.find((s) =>
          s.options.some((o) => o.id === item.optionId),
        );
        return service
          ? {
              key: -(index + 1),
              serviceId: service.id,
              optionId: item.optionId,
              quantity: item.quantity,
            }
          : null;
      })
      .filter((line): line is Line => line !== null);
    if (fromItems.length) setLines(fromItems);
    else if (prefill.certificateType) {
      const hints = CERTIFICATE_SERVICE_HINTS[prefill.certificateType] ?? [];
      const service = options.data.services.find((s) =>
        hints.some((h) => s.name.toLowerCase().includes(h)),
      );
      if (service) {
        setLines([
          {
            key: -1,
            serviceId: service.id,
            optionId: firstOption(options.data, service.id, propertyTypeId),
            quantity: 1,
          },
        ]);
      }
    }
  }

  // Existing customer search (needs the customers page).
  React.useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const found = useQuery({
    queryKey: ["customer-search", term],
    queryFn: () =>
      adminPage<CustomerListItem[]>("/customers", { query: { search: term, page_size: 8 } }),
    enabled: customersAccess.canView && term.length >= 3,
  });
  const matches = found.data?.data ?? [];
  const [autoPicked, setAutoPicked] = React.useState(false);
  if (!autoPicked && prefill.email && matches.length) {
    const exact = matches.find((c) => c.email.toLowerCase() === prefill.email.toLowerCase());
    setAutoPicked(true);
    if (exact) {
      setMode("existing");
      setCustomerId(exact.id);
    }
  }

  // Live quote.
  const items = lines
    .filter((l) => l.optionId)
    .map((l) => ({ price_option_id: l.optionId, quantity: l.quantity }));
  // The same price option twice is one line with a higher quantity (the API refuses repeats).
  const repeated = new Set(items.map((i) => i.price_option_id)).size !== items.length;
  const quoteKey = JSON.stringify([items, property.property_type_id, property.in_congestion_zone]);
  const [quoteInput, setQuoteInput] = React.useState(quoteKey);
  React.useEffect(() => {
    const timer = setTimeout(() => setQuoteInput(quoteKey), 300);
    return () => clearTimeout(timer);
  }, [quoteKey]);
  const quote = useQuery({
    queryKey: ["staff-quote", quoteInput],
    queryFn: () => {
      const [quoteItems, propertyTypeId, congestion] = JSON.parse(quoteInput) as [
        typeof items,
        string,
        boolean,
      ];
      return admin<Quote>("/bookings/quote", {
        json: {
          items: quoteItems,
          property_type_id: propertyTypeId,
          in_congestion_zone: congestion,
        },
      });
    },
    enabled:
      items.length > 0 &&
      !repeated &&
      Boolean(property.property_type_id) &&
      quoteInput === quoteKey,
  });

  // Changing the services clears an earlier "add a service" message.
  const changeLines = (change: (current: Line[]) => Line[]) => {
    setLines(change);
    setErrors(({ items: _items, ...rest }) => rest);
  };
  const addLine = () => {
    // The first service not already on the booking.
    const used = new Set(lines.map((l) => l.optionId));
    const all = options.data?.services ?? [];
    const pick = (s: { id: string }) => firstOption(options.data, s.id, property.property_type_id);
    const service = all.find((s) => !used.has(pick(s))) ?? all[0];
    const key = nextKey.current++;
    changeLines((current) => [
      ...current,
      { key, serviceId: service?.id ?? "", optionId: service ? pick(service) : "", quantity: 1 },
    ]);
  };
  const updateLine = (key: number, change: Partial<Line>) =>
    changeLines((current) => current.map((l) => (l.key === key ? { ...l, ...change } : l)));

  const validate = (): Errors => {
    const e: Errors = {};
    if (mode === "existing" && !customerId) e.customer = "Choose a customer, or create a new one.";
    if (mode === "new") {
      if (!customer.full_name.trim()) e.full_name = "Enter the customer's name";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim()))
        e.email = "Enter a valid email address";
      if (customer.phone.trim().length < 10) e.phone = "Enter a UK phone number";
    }
    if (!property.address_line1.trim()) e.address_line1 = "Enter the first line of the address";
    if (!property.city.trim()) e.city = "Enter the town or city";
    if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(property.postcode.trim()))
      e.postcode = "Enter a full UK postcode";
    if (!property.property_type_id) e.property_type_id = "Choose the property type";
    if (items.length === 0) e.items = "Add at least one service";
    else if (repeated) e.items = REPEATED_OPTION;
    if (!windowCode || !windowStart) e.window = "Choose a date and window";
    return e;
  };

  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) {
      setFailure("Some details need correcting.");
      return;
    }
    setBusy(true);
    try {
      const created = await admin<{ booking: BookingDetail }>("/bookings", {
        json: {
          ...(mode === "existing"
            ? { customer_id: customerId }
            : {
                customer: {
                  ...customer,
                  full_name: customer.full_name.trim(),
                  email: customer.email.trim(),
                  phone: customer.phone.trim(),
                  company_name: customer.company_name.trim() || null,
                },
              }),
          address_line1: property.address_line1.trim(),
          address_line2: property.address_line2.trim() || null,
          city: property.city.trim(),
          postcode: property.postcode.trim(),
          access_notes: property.access_notes.trim() || null,
          property_type_id: property.property_type_id,
          property_number: property.property_number.trim() || null,
          parking_available: property.parking === "" ? null : property.parking === "yes",
          key_collection_details: property.key_collection_details.trim() || null,
          in_congestion_zone: property.in_congestion_zone,
          engineer_instructions: property.engineer_instructions.trim() || null,
          items,
          date,
          start: timeOf(windowStart ?? ""),
          status: payment === "payment_link" ? "pending_payment" : "confirmed",
          payment_due: payment !== "payment_link",
          override_capacity: mayOverride && override,
          internal_notes: notes.trim() || null,
        },
      });
      const booking = created.booking;
      if (payment === "paid_offline") {
        await admin(`/bookings/${booking.id}/mark-paid`, {
          json: {
            method: offlineMethod,
            reference: offlineReference.trim() || null,
            amount_pence: booking.totals.total_pence,
          },
        });
      }
      if (payment === "payment_link") {
        await admin(`/bookings/${booking.id}/payment-link`, { method: "POST" });
      }
      toast.success(`Booking ${booking.reference} created.`);
      router.push(`/bookings/${booking.id}` as Route);
    } catch (error) {
      const fields = fieldErrors(error);
      if (Object.keys(fields).length) setErrors(fields);
      setFailure(bookingErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const services = options.data?.services ?? [];
  const field = (name: string) => ({
    error: errors[name] ?? null,
    "aria-invalid": Boolean(errors[name]) || undefined,
  });

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="space-y-8"
      aria-label="New booking"
    >
      {failure ? (
        <Alert variant="error" data-testid="new-booking-error">
          {failure}
        </Alert>
      ) : null}

      <FormSection
        title="Customer"
        description="Find someone who has booked before, or add a new customer."
      >
        <div className="space-y-4">
          <fieldset>
            <legend className="sr-only">Customer</legend>
            <div className="flex flex-wrap gap-4 font-body text-small">
              {customersAccess.canView ? (
                <label className="flex min-h-touch cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="customer-mode"
                    className="h-4 w-4 accent-primary"
                    checked={mode === "existing"}
                    onChange={() => setMode("existing")}
                  />
                  Existing customer
                </label>
              ) : null}
              <label className="flex min-h-touch cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="customer-mode"
                  className="h-4 w-4 accent-primary"
                  checked={mode === "new"}
                  onChange={() => setMode("new")}
                />
                New customer
              </label>
            </div>
          </fieldset>
          {mode === "existing" ? (
            <div className="space-y-3">
              <FormField
                id="customer-search"
                label="Search by email, phone or name"
                error={errors.customer ?? null}
              >
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-subtle"
                    aria-hidden="true"
                  />
                  <Input
                    id="customer-search"
                    type="search"
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </FormField>
              {term.length >= 3 ? (
                matches.length ? (
                  <fieldset className="space-y-2" data-testid="customer-matches">
                    <legend className="sr-only">Matching customers</legend>
                    {matches.map((c) => (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md border-thin border-border p-3 font-body text-small has-[:checked]:border-primary has-[:checked]:bg-surface"
                      >
                        <input
                          type="radio"
                          name="customer-id"
                          className="mt-1 h-4 w-4 accent-primary"
                          checked={customerId === c.id}
                          onChange={() => setCustomerId(c.id)}
                        />
                        <span className="font-semibold">
                          {c.full_name}
                          <span className="block text-caption font-normal text-text-muted">
                            {c.email}
                            {c.phone ? `, ${c.phone}` : ""}, {c.booking_count}{" "}
                            {c.booking_count === 1 ? "booking" : "bookings"}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ) : found.isFetching ? (
                  <p className="font-body text-small text-text-muted">Searching...</p>
                ) : (
                  <p className="font-body text-small text-text-muted">
                    No customer found. Choose New customer to add them.
                  </p>
                )
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="customer-name"
                label="Full name"
                required
                error={errors.full_name ?? null}
              >
                <Input
                  id="customer-name"
                  autoComplete="off"
                  value={customer.full_name}
                  {...field("full_name")}
                  onChange={(e) => setCustomer({ ...customer, full_name: e.target.value })}
                />
              </FormField>
              <FormField id="customer-email" label="Email" required error={errors.email ?? null}>
                <Input
                  id="customer-email"
                  type="email"
                  autoComplete="off"
                  value={customer.email}
                  {...field("email")}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                />
              </FormField>
              <FormField id="customer-phone" label="Phone" required error={errors.phone ?? null}>
                <Input
                  id="customer-phone"
                  type="tel"
                  autoComplete="off"
                  value={customer.phone}
                  {...field("phone")}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                />
              </FormField>
              <FormField id="customer-company" label="Company (optional)">
                <Input
                  id="customer-company"
                  value={customer.company_name}
                  onChange={(e) => setCustomer({ ...customer, company_name: e.target.value })}
                />
              </FormField>
              <div>
                <Label htmlFor="customer-type">Customer type</Label>
                <select
                  id="customer-type"
                  className={`mt-1.5 ${selectClass}`}
                  value={customer.customer_type}
                  onChange={(e) => setCustomer({ ...customer, customer_type: e.target.value })}
                >
                  {Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex min-h-touch cursor-pointer items-center gap-3 self-end font-body text-small">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={customer.marketing_opt_in}
                  onChange={(e) => setCustomer({ ...customer, marketing_opt_in: e.target.checked })}
                />
                Happy to receive marketing emails
              </label>
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Property" description="Where the inspection happens.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="address-line1"
            label="Address line 1"
            required
            error={errors.address_line1 ?? null}
          >
            <Input
              id="address-line1"
              value={property.address_line1}
              {...field("address_line1")}
              onChange={(e) => setProperty({ ...property, address_line1: e.target.value })}
            />
          </FormField>
          <FormField id="address-line2" label="Address line 2 (optional)">
            <Input
              id="address-line2"
              value={property.address_line2}
              onChange={(e) => setProperty({ ...property, address_line2: e.target.value })}
            />
          </FormField>
          <FormField id="address-city" label="Town or city" required error={errors.city ?? null}>
            <Input
              id="address-city"
              value={property.city}
              {...field("city")}
              onChange={(e) => setProperty({ ...property, city: e.target.value })}
            />
          </FormField>
          <FormField
            id="address-postcode"
            label="Postcode"
            required
            error={errors.postcode ?? null}
          >
            <Input
              id="address-postcode"
              value={property.postcode}
              {...field("postcode")}
              onChange={(e) => setProperty({ ...property, postcode: e.target.value.toUpperCase() })}
            />
          </FormField>
          <div>
            <Label htmlFor="property-type" required>
              Property type
            </Label>
            <select
              id="property-type"
              className={`mt-1.5 ${selectClass}`}
              value={property.property_type_id}
              onChange={(e) => setProperty({ ...property, property_type_id: e.target.value })}
            >
              {(options.data?.property_types ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <FormField id="property-number" label="Flat or house number (optional)">
            <Input
              id="property-number"
              value={property.property_number}
              onChange={(e) => setProperty({ ...property, property_number: e.target.value })}
            />
          </FormField>
          <fieldset>
            <legend className="font-body text-small font-semibold">Parking provided</legend>
            <div className="mt-1.5 flex gap-4 font-body text-small">
              {(["yes", "no", ""] as const).map((value) => (
                <label
                  key={value || "unknown"}
                  className="flex min-h-touch cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="parking"
                    className="h-4 w-4 accent-primary"
                    checked={property.parking === value}
                    onChange={() => setProperty({ ...property, parking: value })}
                  />
                  {value === "yes" ? "Yes" : value === "no" ? "No" : "Not sure"}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex min-h-touch cursor-pointer items-center gap-3 self-end font-body text-small">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={property.in_congestion_zone}
              onChange={(e) => setProperty({ ...property, in_congestion_zone: e.target.checked })}
            />
            In the London Congestion Charge zone
          </label>
          <FormField id="key-collection" label="Key collection details (optional)">
            <Input
              id="key-collection"
              value={property.key_collection_details}
              onChange={(e) => setProperty({ ...property, key_collection_details: e.target.value })}
            />
          </FormField>
          <FormField id="engineer-instructions" label="Instructions for the engineer (optional)">
            <Input
              id="engineer-instructions"
              value={property.engineer_instructions}
              onChange={(e) => setProperty({ ...property, engineer_instructions: e.target.value })}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Services"
        description="Prices are calculated by the server as you choose."
      >
        <div className="space-y-3" data-testid="booking-lines">
          {lines.map((line, index) => {
            const service = services.find((s) => s.id === line.serviceId);
            const fitting =
              service?.options.filter(
                (o) => !o.property_type_id || o.property_type_id === property.property_type_id,
              ) ?? [];
            const option = service?.options.find((o) => o.id === line.optionId);
            return (
              <div
                key={line.key}
                className="grid items-end gap-3 rounded-md border-thin border-border p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_6rem_auto]"
              >
                <div>
                  <Label htmlFor={`line-service-${String(line.key)}`}>Service {index + 1}</Label>
                  <select
                    id={`line-service-${String(line.key)}`}
                    className={`mt-1.5 ${selectClass}`}
                    value={line.serviceId}
                    onChange={(e) =>
                      updateLine(line.key, {
                        serviceId: e.target.value,
                        optionId: firstOption(
                          options.data,
                          e.target.value,
                          property.property_type_id,
                        ),
                      })
                    }
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`line-option-${String(line.key)}`}>Option</Label>
                  <select
                    id={`line-option-${String(line.key)}`}
                    className={`mt-1.5 ${selectClass}`}
                    value={line.optionId}
                    onChange={(e) => updateLine(line.key, { optionId: e.target.value })}
                  >
                    {(fitting.length ? fitting : (service?.options ?? [])).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <FormField id={`line-qty-${String(line.key)}`} label="Quantity">
                  <Input
                    id={`line-qty-${String(line.key)}`}
                    type="number"
                    min={option?.min_quantity ?? 1}
                    max={option?.max_quantity ?? 50}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </FormField>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove service ${String(index + 1)}`}
                  onClick={() =>
                    changeLines((current) => current.filter((l) => l.key !== line.key))
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            );
          })}
          {errors.items ? (
            <p className="font-body text-small text-error-text">{errors.items}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLine}
            disabled={!services.length}
            data-testid="add-service"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Add a service
          </Button>
          <QuoteSummary
            quote={quote.data}
            loading={items.length > 0 && (quote.isFetching || quoteInput !== quoteKey)}
            error={
              repeated ? REPEATED_OPTION : quote.isError ? bookingErrorMessage(quote.error) : null
            }
          />
        </div>
      </FormSection>

      <FormSection
        title="Date and window"
        description="Places left include bookings held by customers paying online."
      >
        <div className="space-y-3">
          <WindowPicker
            idPrefix="new-booking"
            date={date}
            onDateChange={setDate}
            code={windowCode}
            onCodeChange={(code, start) => {
              setWindowCode(code);
              setWindowStart(start);
            }}
            serviceIds={[...new Set(lines.map((l) => l.serviceId).filter(Boolean))]}
            override={override}
          />
          {errors.window ? (
            <p className="font-body text-small text-error-text">{errors.window}</p>
          ) : null}
          {mayOverride ? (
            <label className="flex min-h-touch cursor-pointer items-center gap-3 font-body text-small">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={override}
                onChange={(e) => setOverride(e.target.checked)}
              />
              Allow a full or closed window (override capacity)
            </label>
          ) : null}
        </div>
      </FormSection>

      <FormSection title="Payment" description="How the customer pays for this booking.">
        <fieldset className="space-y-2">
          <legend className="sr-only">Payment</legend>
          {(
            [
              {
                value: "on_inspection",
                label: "Pay on inspection",
                hint: "The engineer or office collects payment on the day.",
              },
              {
                value: "payment_link",
                label: "Send a payment link",
                hint: "The booking waits for card payment on a secure Stripe page.",
                needs: true,
              },
              {
                value: "paid_offline",
                label: "Already paid offline",
                hint: "Record a payment taken by bank transfer, cash or card terminal.",
                needs: true,
              },
            ] as const
          ).map((choice) => {
            const disabled = "needs" in choice && !paymentsAccess.canEdit;
            return (
              <label
                key={choice.value}
                className="flex cursor-pointer items-start gap-3 rounded-md border-thin border-border p-3 font-body text-small has-[:checked]:border-primary has-[:checked]:bg-surface has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
              >
                <input
                  type="radio"
                  name="payment"
                  className="mt-1 h-4 w-4 accent-primary"
                  checked={payment === choice.value}
                  disabled={disabled}
                  onChange={() => setPayment(choice.value)}
                />
                <span className="font-semibold">
                  {choice.label}
                  <span className="block text-caption font-normal text-text-muted">
                    {disabled ? "Needs edit access to the Payments page." : choice.hint}
                  </span>
                </span>
              </label>
            );
          })}
          {payment === "paid_offline" ? (
            <div className="grid gap-4 pt-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="offline-method">Method</Label>
                <select
                  id="offline-method"
                  className={`mt-1.5 ${selectClass}`}
                  value={offlineMethod}
                  onChange={(e) => setOfflineMethod(e.target.value)}
                >
                  {Object.entries(OFFLINE_METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <FormField id="offline-reference" label="Reference (optional)">
                <Input
                  id="offline-reference"
                  value={offlineReference}
                  onChange={(e) => setOfflineReference(e.target.value)}
                />
              </FormField>
            </div>
          ) : null}
        </fieldset>
      </FormSection>

      <FormSection title="Internal notes" description="Only staff can see these.">
        <label htmlFor="new-booking-notes" className="sr-only">
          Internal notes
        </label>
        <Textarea
          id="new-booking-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </FormSection>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {quote.data ? (
          <p className="font-body text-small text-text-muted">
            Total <MoneyText pence={quote.data.total_pence} className="font-semibold text-text" />
          </p>
        ) : null}
        <Button
          type="submit"
          variant="accent"
          size="md"
          loading={busy}
          data-testid="create-booking"
        >
          Create booking
        </Button>
      </div>
    </form>
  );
}

function QuoteSummary({
  quote,
  loading,
  error,
}: {
  quote: Quote | undefined;
  loading: boolean;
  error: string | null;
}) {
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!quote)
    return loading ? <p className="font-body text-small text-text-muted">Pricing...</p> : null;
  return (
    <div
      className="rounded-md border-thin border-border bg-surface p-4"
      data-testid="live-quote"
      aria-live="polite"
      aria-busy={loading}
    >
      <ul className="space-y-1 font-body text-small">
        {quote.lines.map((line, index) => (
          <li key={`${line.service_name}-${String(index)}`} className="flex justify-between gap-3">
            <span>
              {line.item_type === "surcharge" ? "Surcharge: " : ""}
              {line.service_name} ({line.option_label}) x {line.quantity}
            </span>
            <MoneyText pence={line.line_subtotal_pence + line.line_vat_pence} />
          </li>
        ))}
      </ul>
      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t-thin border-border pt-3 font-body text-small">
        <dt>Subtotal</dt>
        <dd className="text-right">
          <MoneyText pence={quote.subtotal_pence} />
        </dd>
        <dt>VAT</dt>
        <dd className="text-right">
          <MoneyText pence={quote.vat_pence} />
        </dd>
        <dt className="font-semibold">Total</dt>
        <dd className="text-right font-semibold" data-testid="quote-total">
          <MoneyText pence={quote.total_pence} />
        </dd>
      </dl>
    </div>
  );
}
