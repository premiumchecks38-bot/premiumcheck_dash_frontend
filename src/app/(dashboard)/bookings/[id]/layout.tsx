import { RouteGuard } from "@/components/dashboard/route-guard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard title="Bookings" anyOf={[{ page: "bookings_upcoming" }, { page: "bookings_past" }]}>
      {children}
    </RouteGuard>
  );
}
