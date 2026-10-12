import type { Metadata } from "next";
import { Suspense } from "react";

import { BookingCalendar } from "@/components/dashboard/calendar/booking-calendar";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        title="Calendar"
        description="Bookings by day and window, with the places left in each window."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Bookings" },
          { label: "Calendar" },
        ]}
      />
      <Suspense>
        <BookingCalendar />
      </Suspense>
    </>
  );
}
