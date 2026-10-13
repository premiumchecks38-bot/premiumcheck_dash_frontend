import type { Route } from "next";

import { can, type Requirement, type SessionUser } from "@/lib/auth/permissions";

/**
 * Sidebar groups and items. Each route names the permission it needs; the sidebar shows only
 * what the signed in user may open and every route group layout checks the same requirement
 * on the server.
 */

export type NavIcon =
  | "overview"
  | "upcoming"
  | "past"
  | "calendar"
  | "customers"
  | "quotes"
  | "payments"
  | "payouts"
  | "disputes"
  | "services"
  | "prices"
  | "areas"
  | "availability"
  | "engineers"
  | "blog"
  | "pages"
  | "faqs"
  | "reviews"
  | "media"
  | "seo"
  | "redirects"
  | "leads"
  | "team"
  | "settings"
  | "audit"
  | "email";

export interface NavItem {
  title: string;
  href: Route;
  icon: NavIcon;
  requires: Requirement;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const OWNER_AND_ADMIN = ["owner", "admin"] as const;

export const NAVIGATION: NavGroup[] = [
  {
    title: "Overview",
    items: [{ title: "Overview", href: "/", icon: "overview", requires: { page: "overview" } }],
  },
  {
    title: "Bookings",
    items: [
      {
        title: "Upcoming",
        href: "/bookings/upcoming",
        icon: "upcoming",
        requires: { page: "bookings_upcoming" },
      },
      { title: "Past", href: "/bookings/past", icon: "past", requires: { page: "bookings_past" } },
      {
        title: "Calendar",
        href: "/bookings/calendar",
        icon: "calendar",
        requires: { page: "bookings_upcoming" },
      },
      {
        title: "Customers",
        href: "/customers",
        icon: "customers",
        requires: { page: "customers" },
      },
      {
        title: "Quotes",
        href: "/leads/quotes",
        icon: "quotes",
        requires: { page: "leads" },
      },
      {
        title: "Enquiries",
        href: "/leads",
        icon: "leads",
        requires: { page: "leads" },
      },
    ],
  },
  {
    title: "Payments",
    items: [
      { title: "Payments", href: "/payments", icon: "payments", requires: { page: "payments" } },
      {
        title: "Payouts",
        href: "/payments/payouts",
        icon: "payouts",
        requires: { page: "payments" },
      },
      {
        title: "Disputes",
        href: "/payments/disputes",
        icon: "disputes",
        requires: { page: "payments" },
      },
    ],
  },
  {
    title: "Catalog",
    items: [
      { title: "Services", href: "/services", icon: "services", requires: { page: "services" } },
      { title: "Prices", href: "/prices", icon: "prices", requires: { page: "prices" } },
      { title: "Areas", href: "/areas", icon: "areas", requires: { page: "areas" } },
      {
        title: "Availability",
        href: "/availability",
        icon: "availability",
        requires: { page: "availability" },
      },
      {
        title: "Engineers",
        href: "/engineers" as Route,
        icon: "engineers",
        requires: { page: "availability" },
      },
    ],
  },
  {
    title: "Content",
    items: [
      { title: "Blog", href: "/blog", icon: "blog", requires: { page: "blogs" } },
      { title: "FAQs", href: "/faqs", icon: "faqs", requires: { page: "faqs" } },
    ],
  },
  {
    title: "Admin",
    items: [
      { title: "Team", href: "/team", icon: "team", requires: { page: "team" } },
    ],
  },
];

/** The sidebar for one user: groups without any permitted item are dropped. */
export function navigationFor(user: Pick<SessionUser, "role" | "permissions">): NavGroup[] {
  return NAVIGATION.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(user, item.requires)),
  })).filter((group) => group.items.length > 0);
}

/** The navigation item for a path (longest matching href), for titles and requirements. */
export function navItemFor(pathname: string): NavItem | undefined {
  const items = NAVIGATION.flatMap((g) => g.items);
  return items
    .filter((item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/** The first page a user may open, for redirects after login when "/" is not allowed. */
export function homeFor(user: Pick<SessionUser, "role" | "permissions">): Route {
  return navigationFor(user)[0]?.items[0]?.href ?? "/account";
}
