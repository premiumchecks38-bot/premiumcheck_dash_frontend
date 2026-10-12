import type { Metadata } from "next";

import { BookingDetailView } from "@/components/dashboard/bookings/detail/booking-detail";
import type { BookingDetail } from "@/lib/api/schemas";
import { prefetchAdmin } from "@/lib/dal";

export const metadata: Metadata = { title: "Booking" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Read on the server so the page arrives complete; the client keeps it up to date.
  const initial = UUID.test(id) ? await prefetchAdmin<BookingDetail>(`/bookings/${id}`) : null;
  return <BookingDetailView id={id} initial={initial} />;
}
