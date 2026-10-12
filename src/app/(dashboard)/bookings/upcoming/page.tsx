import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { BookingsList } from "@/components/dashboard/bookings/bookings-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { Can } from "@/components/dashboard/session-context";
import { Button } from "@/components/ui/button";
import { UPCOMING_STATUSES } from "@/lib/bookings/filters";

export const metadata: Metadata = { title: "Upcoming bookings" };

export default function UpcomingBookingsPage() {
  return (
    <>
      <PageHeader
        title="Upcoming bookings"
        description="Every booking from today, earliest first."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Bookings" },
          { label: "Upcoming" },
        ]}
        actions={
          <Can requires={{ page: "bookings_upcoming", level: "edit" }}>
            <Button asChild variant="accent" size="sm">
              <Link href="/bookings/new" data-testid="new-booking">
                <Plus className="h-4 w-4" aria-hidden="true" /> New booking
              </Link>
            </Button>
          </Can>
        }
      />
      <Suspense>
        <BookingsList scope="upcoming" statuses={UPCOMING_STATUSES} page="bookings_upcoming" />
      </Suspense>
    </>
  );
}
