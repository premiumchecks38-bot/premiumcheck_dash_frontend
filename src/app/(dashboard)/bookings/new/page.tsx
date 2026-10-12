import type { Metadata } from "next";
import { Suspense } from "react";

import { NewBookingForm } from "@/components/dashboard/bookings/new/new-booking-form";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "New booking" };

export default function NewBookingPage() {
  return (
    <>
      <PageHeader
        title="New booking"
        description="Take a booking over the phone. Prices come from the price list, calculated by the server."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Bookings", href: "/bookings/upcoming" },
          { label: "New booking" },
        ]}
      />
      <Suspense>
        <NewBookingForm />
      </Suspense>
    </>
  );
}
