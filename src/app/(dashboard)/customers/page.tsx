import type { Metadata } from "next";
import { Suspense } from "react";

import { CustomersList } from "@/components/dashboard/customers/customers-list";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone who has booked, with what they have spent and their email preferences."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Bookings" },
          { label: "Customers" },
        ]}
      />
      <Suspense>
        <CustomersList />
      </Suspense>
    </>
  );
}
