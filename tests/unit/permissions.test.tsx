import { render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Can, SessionProvider, usePermission } from "@/components/dashboard/session-context";
import { homeFor, navItemFor, navigationFor } from "@/config/navigation";
import {
  accessTo,
  can,
  type PagePermission,
  type Role,
  type SessionUser,
} from "@/lib/auth/permissions";

function user(role: Role, permissions: PagePermission[] = []): SessionUser {
  return {
    id: `${role}-id`,
    email: `${role}@example.com`,
    full_name: "Test Person",
    role,
    is_active: true,
    two_factor_enabled: false,
    two_factor_setup_required: false,
    last_login_at: null,
    created_at: "2026-01-01T00:00:00Z",
    permissions,
  };
}

const managerWithoutPayments = user("manager", [
  { page: "overview", access_level: "edit" },
  { page: "bookings_upcoming", access_level: "edit" },
  { page: "bookings_past", access_level: "edit" },
  { page: "customers", access_level: "edit" },
  { page: "services", access_level: "view" },
  { page: "prices", access_level: "view" },
  { page: "leads", access_level: "edit" },
]);

const editor = user("editor", [
  { page: "blogs", access_level: "edit" },
  { page: "pages", access_level: "edit" },
  { page: "faqs", access_level: "edit" },
  { page: "seo", access_level: "edit" },
  { page: "media", access_level: "edit" },
  { page: "reviews", access_level: "view" },
]);

function sidebarHrefs(u: SessionUser): string[] {
  return navigationFor(u).flatMap((group) => group.items.map((item) => item.href));
}

describe("permission gate", () => {
  it("gives owner and admin edit access everywhere", () => {
    for (const role of ["owner", "admin"] as const) {
      expect(accessTo(user(role), "team")).toBe("edit");
      expect(can(user(role), { page: "payments", level: "edit" })).toBe(true);
    }
  });

  it("never grants team, settings or the audit log to managers or editors, even if listed", () => {
    const sneaky = user("manager", [{ page: "team", access_level: "edit" }]);
    expect(accessTo(sneaky, "team")).toBe("none");
    expect(can(sneaky, { page: "team" })).toBe(false);
  });

  it("separates view from edit", () => {
    expect(can(managerWithoutPayments, { page: "services" })).toBe(true);
    expect(can(managerWithoutPayments, { page: "services", level: "edit" })).toBe(false);
    expect(can(managerWithoutPayments, { page: "payments" })).toBe(false);
  });

  it("supports role requirements", () => {
    expect(can(user("admin"), { roles: ["owner", "admin"] })).toBe(true);
    expect(can(editor, { roles: ["owner", "admin"] })).toBe(false);
  });
});

describe("sidebar filtering", () => {
  it("shows everything to the owner", () => {
    const hrefs = sidebarHrefs(user("owner"));
    expect(hrefs).toContain("/team");
    expect(hrefs).toContain("/email-log");
    expect(hrefs).toContain("/payments/disputes");
  });

  it("hides payments and admin pages from a manager without payments", () => {
    const hrefs = sidebarHrefs(managerWithoutPayments);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/",
        "/bookings/upcoming",
        "/bookings/calendar",
        "/customers",
        "/services",
        "/leads",
      ]),
    );
    for (const hidden of [
      "/payments",
      "/payments/payouts",
      "/team",
      "/settings",
      "/audit-log",
      "/email-log",
      "/blog",
    ]) {
      expect(hrefs).not.toContain(hidden);
    }
    expect(navigationFor(managerWithoutPayments).map((g) => g.title)).not.toContain("Payments");
  });

  it("gives an editor only content pages, and a home page they can open", () => {
    expect(sidebarHrefs(editor)).toEqual([
      "/blog",
      "/pages",
      "/faqs",
      "/reviews",
      "/media",
      "/seo",
      "/seo/redirects",
    ]);
    expect(homeFor(editor)).toBe("/blog");
    expect(homeFor(user("manager"))).toBe("/account");
  });

  it("finds the most specific item for a path", () => {
    expect(navItemFor("/payments/disputes/dp_1")?.href).toBe("/payments/disputes");
    expect(navItemFor("/payments")?.href).toBe("/payments");
    expect(navItemFor("/")?.href).toBe("/");
    expect(navItemFor("/account")).toBeUndefined();
  });
});

describe("Can and usePermission", () => {
  const wrapper = (u: SessionUser) =>
    function Wrapper({ children }: { children: React.ReactNode }) {
      return <SessionProvider user={u}>{children}</SessionProvider>;
    };

  it("renders children only with access, otherwise the fallback", () => {
    render(
      <SessionProvider user={managerWithoutPayments}>
        <Can requires={{ page: "payments" }} fallback={<p>No money</p>}>
          <p>Revenue</p>
        </Can>
        <Can requires={{ page: "customers", level: "edit" }}>
          <p>Edit customers</p>
        </Can>
      </SessionProvider>,
    );
    expect(screen.queryByText("Revenue")).toBeNull();
    expect(screen.getByText("No money")).toBeTruthy();
    expect(screen.getByText("Edit customers")).toBeTruthy();
  });

  it("reports view and edit for a page", () => {
    const { result } = renderHook(() => usePermission("services"), {
      wrapper: wrapper(managerWithoutPayments),
    });
    expect(result.current).toEqual({ access: "view", canView: true, canEdit: false });
  });
});
