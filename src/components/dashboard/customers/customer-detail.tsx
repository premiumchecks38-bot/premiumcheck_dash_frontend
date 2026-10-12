"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarPlus, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

import { BookingStatusBadge } from "@/components/dashboard/bookings/booking-badges";
import { CopyButton } from "@/components/dashboard/copy-button";
import { DataTable } from "@/components/dashboard/data-table";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { selectClass } from "@/components/dashboard/field-styles";
import { MoneyText, formatMoney } from "@/components/dashboard/money-text";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { usePermission } from "@/components/dashboard/session-context";
import { StatCard } from "@/components/dashboard/stat-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerDetail } from "@/lib/api/schemas";
import { CERTIFICATE_TYPE_LABELS, CUSTOMER_TYPE_LABELS } from "@/lib/bookings/labels";
import { admin } from "@/lib/client/api";
import { errorMessage, fieldErrors } from "@/lib/client/errors";
import { londonToday } from "@/lib/dates";

type Booking = CustomerDetail["bookings"][number];
type Certificate = NonNullable<CustomerDetail["certificates"]>[number];

const bookingColumns: ColumnDef<Booking>[] = [
  {
    id: "reference",
    header: "Reference",
    enableHiding: false,
    cell: ({ row }) => (
      <Link
        href={`/bookings/${row.original.id}` as Route}
        className="font-semibold text-primary underline-offset-4 hover:underline"
      >
        {row.original.reference}
      </Link>
    ),
  },
  {
    id: "appointment",
    header: "Appointment",
    cell: ({ row }) => (
      <DateTimeText value={row.original.appointment_start} style="short" fallback="Not set" />
    ),
  },
  { id: "services", header: "Services", cell: ({ row }) => row.original.services.join(", ") },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <BookingStatusBadge status={row.original.status} />,
  },
  {
    id: "total",
    header: "Total",
    cell: ({ row }) => <MoneyText pence={row.original.total_pence} />,
  },
];

function expiryText(expires: string | null): React.ReactNode {
  if (!expires) return "No expiry";
  const today = londonToday();
  const date = expires.slice(0, 10);
  return (
    <span className={date < today ? "text-status-negative-text" : undefined}>
      <DateTimeText value={expires} style="date" />
      {date < today ? " (expired)" : ""}
    </span>
  );
}

const certificateColumns: ColumnDef<Certificate>[] = [
  {
    id: "type",
    header: "Certificate",
    cell: ({ row }) =>
      CERTIFICATE_TYPE_LABELS[row.original.certificate_type] ?? row.original.certificate_name,
  },
  {
    id: "booking",
    header: "Booking",
    cell: ({ row }) => (
      <Link
        href={`/bookings/${row.original.booking_id}` as Route}
        className="text-primary underline-offset-4 hover:underline"
      >
        {row.original.booking_reference}
      </Link>
    ),
  },
  {
    id: "issued",
    header: "Issued",
    cell: ({ row }) => (
      <DateTimeText value={row.original.issued_at} style="date" fallback="Not recorded" />
    ),
  },
  { id: "expires", header: "Expires", cell: ({ row }) => expiryText(row.original.expires_at) },
];

export function CustomerDetailView({
  id,
  initial,
}: {
  id: string;
  initial: CustomerDetail | null;
}) {
  const { canEdit } = usePermission("customers");
  const bookingsAccess = usePermission("bookings_upcoming");
  const [loadedAt] = React.useState(() => Date.now());
  const query = useQuery({
    queryKey: ["customer", id],
    queryFn: () => admin<CustomerDetail>(`/customers/${id}`),
    initialData: initial ?? undefined,
    initialDataUpdatedAt: loadedAt,
  });
  const customer = query.data;

  if (!customer) {
    return query.isError ? (
      <Alert variant="error" title="This customer could not be loaded">
        {errorMessage(query.error)}
      </Alert>
    ) : (
      <Skeleton className="h-64 w-full" />
    );
  }

  const newBooking = `/bookings/new?${new URLSearchParams({
    email: customer.email,
    name: customer.full_name,
    ...(customer.phone ? { phone: customer.phone } : {}),
  }).toString()}` as Route;

  return (
    <>
      <PageHeader
        title={customer.full_name}
        description={`${CUSTOMER_TYPE_LABELS[customer.customer_type] ?? customer.customer_type}, customer since ${new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Europe/London" }).format(new Date(customer.created_at))}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Customers", href: "/customers" },
          { label: customer.full_name },
        ]}
        actions={
          bookingsAccess.canEdit ? (
            <Button asChild variant="accent" size="sm">
              <Link href={newBooking} data-testid="customer-new-booking">
                <CalendarPlus className="h-4 w-4" aria-hidden="true" /> New booking for this
                customer
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Bookings" value={customer.booking_count} />
        <StatCard
          label="Total spent"
          value={formatMoney(customer.total_spent_pence)}
          hint="Confirmed and completed bookings"
        />
        <StatCard
          label="Last booking"
          valueClassName="text-xl sm:text-2xl whitespace-nowrap"
          value={
            customer.last_booking_at ? (
              <DateTimeText value={customer.last_booking_at} style="date" />
            ) : (
              "None"
            )
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Bookings" id="customer-bookings">
            <DataTable
              caption="Bookings"
              columns={bookingColumns}
              data={customer.bookings}
              getRowId={(row) => row.id}
              emptyTitle="No bookings yet"
              compact
            />
          </Panel>
          <Panel title="Certificates" id="customer-certificates">
            <DataTable
              caption="Certificates"
              columns={certificateColumns}
              data={customer.certificates ?? []}
              getRowId={(row) => row.id}
              emptyTitle="No certificates yet"
              compact
              testId="customer-certificates"
            />
          </Panel>
        </div>
        <div className="space-y-6">
          <ProfilePanel customer={customer} canEdit={canEdit} />
          <CustomerNotes customer={customer} canEdit={canEdit} />
        </div>
      </div>
    </>
  );
}

interface ProfileValues {
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  customer_type: string;
  marketing_opt_in: boolean;
  reminders_opt_out: boolean;
}

function ProfilePanel({ customer, canEdit }: { customer: CustomerDetail; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [values, setValues] = React.useState<ProfileValues>({
    full_name: customer.full_name,
    email: customer.email,
    phone: customer.phone ?? "",
    company_name: customer.company_name ?? "",
    customer_type: customer.customer_type,
    marketing_opt_in: customer.marketing_opt_in,
    reminders_opt_out: customer.reminders_opt_out,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  const save = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const updated = await admin<CustomerDetail>(`/customers/${customer.id}`, {
        method: "PATCH",
        json: {
          full_name: values.full_name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim() || null,
          company_name: values.company_name.trim() || null,
          customer_type: values.customer_type,
          marketing_opt_in: values.marketing_opt_in,
          reminders_opt_out: values.reminders_opt_out,
        },
      });
      queryClient.setQueryData(["customer", customer.id], updated);
      toast.success("Customer details saved.");
      setEditing(false);
    } catch (error) {
      const fields = fieldErrors(error);
      if (Object.keys(fields).length) setErrors(fields);
      else toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <Panel
        title="Profile"
        id="customer-profile"
        actions={
          canEdit ? (
            <Button variant="outline" size="xs" onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : null
        }
      >
        <ul className="space-y-2 font-body text-small">
          <li className="flex items-center gap-1">
            <Mail className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <a
              href={`mailto:${customer.email}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {customer.email}
            </a>
            <CopyButton value={customer.email} label="Copy email address" />
          </li>
          {customer.phone ? (
            <li className="flex items-center gap-1">
              <Phone className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <a
                href={`tel:${customer.phone}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {customer.phone}
              </a>
              <CopyButton value={customer.phone} label="Copy phone number" />
            </li>
          ) : null}
          {customer.company_name ? <li>{customer.company_name}</li> : null}
          <li>
            {customer.marketing_opt_in
              ? "Happy to receive marketing emails"
              : "No marketing emails"}
          </li>
          <li>
            {customer.reminders_opt_out
              ? "Unsubscribed from renewal reminders"
              : "Receives renewal reminders"}
          </li>
        </ul>
      </Panel>
    );
  }

  return (
    <Panel title="Profile" id="customer-profile">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => void save(e)}
        aria-label="Edit customer"
      >
        <FormField
          id="customer-full-name"
          label="Full name"
          required
          error={errors.full_name ?? null}
        >
          <Input
            id="customer-full-name"
            value={values.full_name}
            onChange={(e) => setValues({ ...values, full_name: e.target.value })}
          />
        </FormField>
        <FormField id="customer-edit-email" label="Email" required error={errors.email ?? null}>
          <Input
            id="customer-edit-email"
            type="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
          />
        </FormField>
        <FormField id="customer-edit-phone" label="Phone" error={errors.phone ?? null}>
          <Input
            id="customer-edit-phone"
            type="tel"
            value={values.phone}
            onChange={(e) => setValues({ ...values, phone: e.target.value })}
          />
        </FormField>
        <FormField id="customer-edit-company" label="Company">
          <Input
            id="customer-edit-company"
            value={values.company_name}
            onChange={(e) => setValues({ ...values, company_name: e.target.value })}
          />
        </FormField>
        <div>
          <Label htmlFor="customer-edit-type">Type</Label>
          <select
            id="customer-edit-type"
            className={`mt-1.5 ${selectClass}`}
            value={values.customer_type}
            onChange={(e) => setValues({ ...values, customer_type: e.target.value })}
          >
            {Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex min-h-touch cursor-pointer items-center gap-3 font-body text-small">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={values.marketing_opt_in}
            onChange={(e) => setValues({ ...values, marketing_opt_in: e.target.checked })}
          />
          Happy to receive marketing emails
        </label>
        <label className="flex min-h-touch cursor-pointer items-center gap-3 font-body text-small">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={values.reminders_opt_out}
            onChange={(e) => setValues({ ...values, reminders_opt_out: e.target.checked })}
          />
          Unsubscribed from renewal reminders
        </label>
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="accent"
            size="sm"
            loading={busy}
            data-testid="customer-save"
          >
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
            disabled={busy}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function CustomerNotes({ customer, canEdit }: { customer: CustomerDetail; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [value, setValue] = React.useState(customer.notes ?? "");
  const [status, setStatus] = React.useState(
    canEdit ? "Changes save automatically." : "View only.",
  );
  const saved = React.useRef(customer.notes ?? "");

  React.useEffect(() => {
    if (!canEdit || value === saved.current) return;
    const timer = setTimeout(() => {
      setStatus("Saving...");
      admin<CustomerDetail>(`/customers/${customer.id}`, {
        method: "PATCH",
        json: { notes: value.trim() || null },
      })
        .then((updated) => {
          saved.current = value;
          queryClient.setQueryData(["customer", customer.id], updated);
          setStatus("Saved.");
        })
        .catch((error: unknown) => setStatus(`Not saved. ${errorMessage(error)}`));
    }, 800);
    return () => clearTimeout(timer);
  }, [value, canEdit, customer.id, queryClient]);

  return (
    <Panel title="Notes" id="customer-notes">
      <label htmlFor="customer-notes-text" className="sr-only">
        Notes about this customer
      </label>
      <Textarea
        id="customer-notes-text"
        rows={5}
        value={value}
        readOnly={!canEdit}
        aria-describedby="customer-notes-status"
        placeholder={canEdit ? "Only staff can see these notes." : "No notes."}
        onChange={(e) => setValue(e.target.value)}
      />
      <p
        id="customer-notes-status"
        role="status"
        className="mt-2 font-body text-caption text-text-muted"
      >
        {status}
      </p>
    </Panel>
  );
}
