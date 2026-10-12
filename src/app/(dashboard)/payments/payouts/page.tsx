import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/page-header";
import { PayoutsTable } from "@/components/dashboard/payments/payouts-table";

export const metadata: Metadata = { title: "Payouts" };

export default function PayoutsPage() {
  return (
    <>
      <PageHeader
        title="Payouts"
        description="Money Stripe has sent, or is sending, to the business bank account."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Payments", href: "/payments" },
          { label: "Payouts" },
        ]}
      />
      <PayoutsTable />
    </>
  );
}
