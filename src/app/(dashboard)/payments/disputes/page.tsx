import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/page-header";
import { DisputesTable } from "@/components/dashboard/payments/disputes-table";

export const metadata: Metadata = { title: "Disputes" };

export default function DisputesPage() {
  return (
    <>
      <PageHeader
        title="Disputes"
        description="Card payments a customer has challenged with their bank. Respond in Stripe before the deadline."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Payments", href: "/payments" },
          { label: "Disputes" },
        ]}
      />
      <DisputesTable />
    </>
  );
}
