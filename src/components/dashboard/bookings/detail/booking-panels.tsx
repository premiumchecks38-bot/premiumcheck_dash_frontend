import Link from "next/link";
import type { Route } from "next";
import { Mail, Phone } from "lucide-react";

import { CopyButton } from "@/components/dashboard/copy-button";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { MoneyText } from "@/components/dashboard/money-text";
import { Facts, Panel } from "@/components/dashboard/panel";
import type { BookingDetail } from "@/lib/api/schemas";
import { CUSTOMER_TYPE_LABELS, SOURCE_LABELS } from "@/lib/bookings/labels";
import { buildTimeline } from "@/lib/bookings/timeline";
import { formatDate } from "@/lib/utils/format";

const yesNo = (value: boolean | null | undefined) =>
  value === null || value === undefined ? "Not given" : value ? "Yes" : "No";

export function AppointmentPanel({
  booking,
  actions,
}: {
  booking: BookingDetail;
  actions?: React.ReactNode;
}) {
  const a = booking.appointment;
  return (
    <Panel title="Appointment" id="appointment" actions={actions}>
      <Facts
        items={[
          { label: "Date", value: a.date ? formatDate(a.date, "weekday") : "Not set" },
          { label: "Window", value: a.label ?? "Not set" },
          {
            label: "Engineer",
            value: booking.engineer ? (
              <span data-testid="assigned-engineer">{booking.engineer.name}</span>
            ) : (
              <span className="text-text-muted" data-testid="assigned-engineer">
                Not assigned
              </span>
            ),
          },
          { label: "Area", value: booking.area?.name ?? "Not matched" },
          { label: "Booked through", value: SOURCE_LABELS[booking.source] ?? booking.source },
          { label: "Booked on", value: <DateTimeText value={booking.created_at} /> },
        ]}
      />
    </Panel>
  );
}

export function PropertyPanel({ booking }: { booking: BookingDetail }) {
  const d = booking.property_details;
  return (
    <Panel title="Property" id="property">
      <Facts
        items={[
          {
            label: "Address",
            value: (
              <span>
                {[booking.address_line1, booking.address_line2, booking.city, booking.postcode]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            ),
          },
          { label: "Property number", value: d.property_number ?? "Not given" },
          { label: "Property type", value: booking.property_type.name },
          { label: "Parking provided", value: yesNo(d.parking_available) },
          { label: "Congestion Zone", value: yesNo(d.in_congestion_zone) },
          { label: "Key collection", value: d.key_collection_details ?? "Not needed" },
          { label: "Engineer instructions", value: d.engineer_instructions ?? "None" },
          { label: "Access notes", value: booking.access_notes ?? "None" },
        ]}
      />
    </Panel>
  );
}

export function ServicesPanel({ booking }: { booking: BookingDetail }) {
  return (
    <Panel title="Services" id="services">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left font-body text-small">
          <caption className="sr-only">Services and charges</caption>
          <thead>
            <tr className="border-b-thin border-border text-text-muted">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Item
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                Qty
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                Ex VAT
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                VAT
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-semibold">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-thin divide-border">
            {booking.items.map((item) => {
              const surcharge = item.item_type === "surcharge";
              return (
                <tr key={item.id} data-item-type={item.item_type}>
                  <td className="py-2 pr-3">
                    <span className="block font-semibold">
                      {surcharge ? `Surcharge: ${item.service_name}` : item.service_name}
                    </span>
                    <span className="block text-caption text-text-muted">{item.option_label}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-3 py-2 text-right">
                    <MoneyText pence={item.line_subtotal_pence} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <MoneyText pence={item.line_vat_pence} />
                  </td>
                  <td className="py-2 pl-3 text-right">
                    <MoneyText pence={item.line_subtotal_pence + item.line_vat_pence} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-thin border-border">
            <tr>
              <th scope="row" colSpan={2} className="py-2 pr-3 text-left font-semibold">
                Total
              </th>
              <td className="px-3 py-2 text-right">
                <MoneyText pence={booking.totals.subtotal_pence} />
              </td>
              <td className="px-3 py-2 text-right">
                <MoneyText pence={booking.totals.vat_pence} />
              </td>
              <td className="py-2 pl-3 text-right font-bold">
                <MoneyText pence={booking.totals.total_pence} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}

export function CustomerPanel({
  booking,
  canOpenCustomer,
}: {
  booking: BookingDetail;
  canOpenCustomer: boolean;
}) {
  const c = booking.customer;
  return (
    <Panel title="Customer" id="customer">
      <p className="font-body text-body font-semibold">{c.full_name}</p>
      {c.company_name ? (
        <p className="font-body text-small text-text-muted">{c.company_name}</p>
      ) : null}
      <ul className="mt-3 space-y-1 font-body text-small">
        <li className="flex items-center gap-1">
          <Mail className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <a href={`mailto:${c.email}`} className="text-primary underline-offset-4 hover:underline">
            {c.email}
          </a>
          <CopyButton value={c.email} label="Copy email address" />
        </li>
        {c.phone ? (
          <li className="flex items-center gap-1">
            <Phone className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <a href={`tel:${c.phone}`} className="text-primary underline-offset-4 hover:underline">
              {c.phone}
            </a>
            <CopyButton value={c.phone} label="Copy phone number" />
          </li>
        ) : null}
      </ul>
      <p className="mt-3 font-body text-small text-text-muted">
        {CUSTOMER_TYPE_LABELS[c.customer_type] ?? c.customer_type}
        {c.marketing_opt_in ? ", happy to receive marketing" : ""}
      </p>
      {canOpenCustomer ? (
        <Link
          href={`/customers/${c.id}` as Route}
          className="mt-3 inline-flex min-h-touch items-center font-body text-small font-semibold text-primary underline-offset-4 hover:underline"
        >
          Open customer page
        </Link>
      ) : null}
    </Panel>
  );
}

export function BillingPanel({ booking }: { booking: BookingDetail }) {
  const b = booking.billing;
  const address = b.address
    ? [b.address.address_line1, b.address.address_line2, b.address.city, b.address.postcode]
        .filter(Boolean)
        .join(", ")
    : "Same as the property";
  return (
    <Panel title="Billing" id="billing">
      <Facts
        items={[
          { label: "Name", value: b.full_name ?? booking.customer.full_name },
          { label: "Email", value: b.email ?? booking.customer.email },
          { label: "Phone", value: b.phone ?? booking.customer.phone ?? "Not given" },
          { label: "Address", value: address },
        ]}
      />
    </Panel>
  );
}

const KIND_LABELS = { status: "Status", payment: "Payment", email: "Email" } as const;

export function TimelinePanel({ booking }: { booking: BookingDetail }) {
  const items = buildTimeline(booking);
  return (
    <Panel title="Timeline" id="timeline" testId="booking-timeline">
      {items.length === 0 ? (
        <p className="font-body text-small text-text-muted">Nothing has happened yet.</p>
      ) : (
        <ol className="space-y-4">
          {items.map((item, index) => (
            <li key={`${item.at}-${String(index)}`} className="border-l-thick border-border pl-4">
              <p className="font-body text-caption font-semibold tracking-wide text-text-muted uppercase">
                {KIND_LABELS[item.kind]}, <DateTimeText value={item.at} style="short" />
              </p>
              <p className="font-body text-small font-semibold text-text">{item.title}</p>
              {item.detail ? (
                <p className="font-body text-caption text-text-muted">{item.detail}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
