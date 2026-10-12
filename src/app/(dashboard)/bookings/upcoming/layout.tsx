import { RouteGuard } from "@/components/dashboard/route-guard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RouteGuard href="/bookings/upcoming">{children}</RouteGuard>;
}
