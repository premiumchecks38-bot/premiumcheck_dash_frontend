/**
 * Roles, dashboard pages and access levels, mirroring the backend (app/models/enums.py and
 * app/services/permission_service.py). The backend is always the authority: these helpers only
 * decide what to show.
 */

export const ROLES = ["owner", "admin", "manager", "editor"] as const;
export type Role = (typeof ROLES)[number];

export const PAGES = [
  "overview",
  "payments",
  "bookings_upcoming",
  "bookings_past",
  "customers",
  "services",
  "prices",
  "areas",
  "availability",
  "blogs",
  "pages",
  "faqs",
  "reviews",
  "seo",
  "media",
  "leads",
  "settings",
  "team",
  "audit_logs",
] as const;
export type Page = (typeof PAGES)[number];

export type AccessLevel = "view" | "edit";
export type Access = AccessLevel | "none";

export interface PagePermission {
  page: Page;
  access_level: AccessLevel;
}

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  two_factor_enabled: boolean;
  two_factor_setup_required: boolean;
  last_login_at: string | null;
  created_at: string;
  permissions: PagePermission[];
}

/** Owner and admin can use every page; these pages can never be granted to anyone else. */
export const FULL_ACCESS_ROLES: readonly Role[] = ["owner", "admin"];
export const RESTRICTED_PAGES: readonly Page[] = ["team", "settings", "audit_logs"];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  editor: "Editor",
};

export const PAGE_LABELS: Record<Page, string> = {
  overview: "Overview",
  payments: "Payments, payouts and disputes",
  bookings_upcoming: "Upcoming bookings and calendar",
  bookings_past: "Past bookings",
  customers: "Customers",
  services: "Services",
  prices: "Prices",
  areas: "Areas",
  availability: "Availability",
  blogs: "Blog",
  pages: "Pages",
  faqs: "FAQs",
  reviews: "Reviews",
  seo: "SEO and redirects",
  media: "Media",
  leads: "Leads",
  settings: "Settings",
  team: "Team",
  audit_logs: "Audit log",
};

/** Requirement of a route: a page with an access level, or one of the full access roles. */
export type Requirement = { page: Page; level?: AccessLevel } | { roles: readonly Role[] };

export function accessTo(user: Pick<SessionUser, "role" | "permissions">, page: Page): Access {
  if (FULL_ACCESS_ROLES.includes(user.role)) return "edit";
  if (RESTRICTED_PAGES.includes(page)) return "none";
  return user.permissions.find((p) => p.page === page)?.access_level ?? "none";
}

export function can(
  user: Pick<SessionUser, "role" | "permissions">,
  requirement: Requirement,
): boolean {
  if ("roles" in requirement) return requirement.roles.includes(user.role);
  const access = accessTo(user, requirement.page);
  if (access === "none") return false;
  return requirement.level !== "edit" || access === "edit";
}
