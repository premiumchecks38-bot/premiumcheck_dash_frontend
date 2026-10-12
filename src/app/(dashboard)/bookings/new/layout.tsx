import { RouteGuard } from "@/components/dashboard/route-guard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard title="New bookings" anyOf={[{ page: "bookings_upcoming", level: "edit" }]}>
      {children}
    </RouteGuard>
  );
}
