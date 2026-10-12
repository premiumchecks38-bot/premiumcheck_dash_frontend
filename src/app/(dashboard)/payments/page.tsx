import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { PaymentsView } from "@/components/dashboard/payments/payments-view";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <>
      <PageHeader
        title="Payments"
        description="Money taken by card and offline, refunds, fees and payouts."
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Payments" }]}
      />
      <Suspense>
        <PaymentsView />
      </Suspense>
    </>
  );
}
