import type { Metadata } from "next";
import { Suspense } from "react";

import { PastBookings } from "@/components/dashboard/bookings/past-bookings";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Past bookings" };

export default function PastBookingsPage() {
  return (
    <>
      <PageHeader
        title="Past bookings"
        description="Every booking whose appointment date has passed, and certificates due for renewal."
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Bookings" }, { label: "Past" }]}
      />
      <Suspense>
        <PastBookings />
      </Suspense>
    </>
  );
}
