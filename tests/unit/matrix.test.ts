import { describe, expect, it } from "vitest";

import type { TeamMember } from "@/lib/api/schemas";
import {
  GRANTABLE_PAGES,
  MATRIX_GROUPS,
  emptyMatrix,
  grantedCount,
  isCustomisable,
  matrixFrom,
  permissionsFrom,
  sameMatrix,
  setAccess,
} from "@/lib/team/matrix";
import { assignableRoles, canManage, filterMembers, memberStatus } from "@/lib/team/members";

describe("permission matrix state", () => {
  it("never offers team, settings or the audit log", () => {
    expect(GRANTABLE_PAGES).not.toContain("team");
    expect(GRANTABLE_PAGES).not.toContain("settings");
    expect(GRANTABLE_PAGES).not.toContain("audit_logs");
    expect(GRANTABLE_PAGES).toHaveLength(16);
  });

  it("groups every grantable page exactly once, like the sidebar", () => {
    const grouped = MATRIX_GROUPS.flatMap((g) => g.pages);
    expect([...grouped].sort()).toEqual([...GRANTABLE_PAGES].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it("round trips a permission list, dropping pages with no access", () => {
    const permissions = [
      { page: "overview", access_level: "edit" },
      { page: "services", access_level: "view" },
    ] as const;
    const matrix = matrixFrom([...permissions]);
    expect(matrix.overview).toBe("edit");
    expect(matrix.services).toBe("view");
    expect(matrix.payments).toBe("none");
    expect(permissionsFrom(matrix)).toEqual(permissions);
  });

  it("ignores restricted pages in incoming permissions", () => {
    const matrix = matrixFrom([{ page: "team", access_level: "edit" }]);
    expect(permissionsFrom(matrix)).toEqual([]);
  });

  it("changes one page without touching the original", () => {
    const start = emptyMatrix();
    const next = setAccess(start, "payments", "view");
    expect(start.payments).toBe("none");
    expect(next.payments).toBe("view");
    expect(grantedCount(next)).toBe(1);
    expect(sameMatrix(start, next)).toBe(false);
    expect(sameMatrix(setAccess(next, "payments", "none"), start)).toBe(true);
  });

  it("only lets managers and editors be customised", () => {
    expect(isCustomisable("manager")).toBe(true);
    expect(isCustomisable("editor")).toBe(true);
    expect(isCustomisable("admin")).toBe(false);
    expect(isCustomisable("owner")).toBe(false);
  });
});

describe("team member rules", () => {
  const owner = { id: "o", role: "owner" as const };
  const adminActor = { id: "a", role: "admin" as const };

  it("protects the owner row and the person's own row", () => {
    expect(canManage(owner, { id: "o", role: "owner" })).toBe(false);
    expect(canManage(adminActor, { id: "o", role: "owner" })).toBe(false);
    expect(canManage(adminActor, { id: "a", role: "admin" })).toBe(false);
  });

  it("lets only the owner manage admins and assign the admin role", () => {
    expect(canManage(owner, { id: "x", role: "admin" })).toBe(true);
    expect(canManage(adminActor, { id: "x", role: "admin" })).toBe(false);
    expect(canManage(adminActor, { id: "y", role: "manager" })).toBe(true);
    expect(assignableRoles(owner)).toContain("admin");
    expect(assignableRoles(adminActor)).toEqual(["manager", "editor"]);
  });

  const member = (overrides: Partial<TeamMember>): TeamMember => ({
    id: "1",
    email: "sam@example.com",
    full_name: "Sam Smith",
    role: "manager",
    is_active: true,
    two_factor_enabled: false,
    last_login_at: null,
    created_at: "2026-01-01T00:00:00Z",
    permissions: [],
    invite_pending: false,
    ...overrides,
  });

  it("derives the status shown in the list", () => {
    expect(memberStatus(member({}))).toBe("active");
    expect(memberStatus(member({ is_active: false }))).toBe("deactivated");
    expect(memberStatus(member({ is_active: false, invite_pending: true }))).toBe("invited");
  });

  it("filters by text, role, status and two factor", () => {
    const list = [
      member({ id: "1" }),
      member({
        id: "2",
        full_name: "Alex Jones",
        email: "alex@example.com",
        role: "editor",
        two_factor_enabled: true,
      }),
      member({
        id: "3",
        full_name: "Kim Lee",
        email: "kim@example.com",
        is_active: false,
        invite_pending: true,
      }),
    ];
    const none = { q: "", role: "", status: "", twofa: "" };
    expect(filterMembers(list, none)).toHaveLength(3);
    expect(filterMembers(list, { ...none, q: "ALEX" }).map((m) => m.id)).toEqual(["2"]);
    expect(filterMembers(list, { ...none, role: "manager" }).map((m) => m.id)).toEqual(["1", "3"]);
    expect(filterMembers(list, { ...none, status: "invited" }).map((m) => m.id)).toEqual(["3"]);
    expect(filterMembers(list, { ...none, twofa: "on" }).map((m) => m.id)).toEqual(["2"]);
    expect(filterMembers(list, { ...none, twofa: "off" })).toHaveLength(2);
  });
});
