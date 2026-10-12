import {
  PAGES,
  RESTRICTED_PAGES,
  type Access,
  type Page,
  type PagePermission,
  type Role,
} from "@/lib/auth/permissions";

/** One access choice per grantable page (team, settings and audit log can never be granted). */
export type Matrix = Record<GrantablePage, Access>;
export type GrantablePage = Exclude<Page, "team" | "settings" | "audit_logs">;

export const GRANTABLE_PAGES = PAGES.filter(
  (page) => !RESTRICTED_PAGES.includes(page),
) as GrantablePage[];

/** Matrix rows, grouped and ordered like the sidebar. */
export const MATRIX_GROUPS: { title: string; pages: GrantablePage[] }[] = [
  { title: "Overview", pages: ["overview"] },
  { title: "Bookings", pages: ["bookings_upcoming", "bookings_past", "customers"] },
  { title: "Payments", pages: ["payments"] },
  { title: "Catalog", pages: ["services", "prices", "areas", "availability"] },
  { title: "Content", pages: ["blogs", "pages", "faqs", "reviews", "media"] },
  { title: "Marketing", pages: ["seo", "leads"] },
];

/** Roles whose pages are chosen one by one. Owner and admin always have every page. */
export const CUSTOMISABLE_ROLES: readonly Role[] = ["manager", "editor"];

export function isCustomisable(role: Role): boolean {
  return CUSTOMISABLE_ROLES.includes(role);
}

export function emptyMatrix(): Matrix {
  return Object.fromEntries(GRANTABLE_PAGES.map((page) => [page, "none"])) as Matrix;
}

export function matrixFrom(permissions: readonly PagePermission[]): Matrix {
  const matrix = emptyMatrix();
  for (const { page, access_level } of permissions) {
    if (page in matrix) matrix[page as GrantablePage] = access_level;
  }
  return matrix;
}

/** The permission list the backend expects: pages with "none" are left out. */
export function permissionsFrom(matrix: Matrix): PagePermission[] {
  return GRANTABLE_PAGES.filter((page) => matrix[page] !== "none").map((page) => ({
    page,
    access_level: matrix[page] as "view" | "edit",
  }));
}

export function setAccess(matrix: Matrix, page: GrantablePage, access: Access): Matrix {
  return { ...matrix, [page]: access };
}

export function sameMatrix(a: Matrix, b: Matrix): boolean {
  return GRANTABLE_PAGES.every((page) => a[page] === b[page]);
}

/** Pages with any access, for the summary under the matrix. */
export function grantedCount(matrix: Matrix): number {
  return GRANTABLE_PAGES.filter((page) => matrix[page] !== "none").length;
}
