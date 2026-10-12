import type { TeamMember } from "@/lib/api/schemas";
import type { SessionUser } from "@/lib/auth/permissions";

export type MemberStatus = "active" | "invited" | "deactivated";

export const STATUS_LABELS: Record<MemberStatus, string> = {
  active: "Active",
  invited: "Invited",
  deactivated: "Deactivated",
};

export function memberStatus(
  member: Pick<TeamMember, "is_active" | "invite_pending">,
): MemberStatus {
  if (member.invite_pending) return "invited";
  return member.is_active ? "active" : "deactivated";
}

/**
 * Whether the signed in person may change this member (mirrors the backend rules): the owner
 * account is protected, only the owner manages admins, and nobody manages themselves here.
 */
export function canManage(
  actor: Pick<SessionUser, "id" | "role">,
  member: Pick<TeamMember, "id" | "role">,
): boolean {
  if (member.role === "owner" || member.id === actor.id) return false;
  if (member.role === "admin") return actor.role === "owner";
  return actor.role === "owner" || actor.role === "admin";
}

/** Roles the signed in person can give: only the owner can create or promote admins. */
export function assignableRoles(
  actor: Pick<SessionUser, "role">,
): ("admin" | "manager" | "editor")[] {
  return actor.role === "owner" ? ["admin", "manager", "editor"] : ["manager", "editor"];
}

export interface TeamFilters {
  q: string;
  role: string;
  status: string;
  twofa: string;
}

export function filterMembers(members: readonly TeamMember[], filters: TeamFilters): TeamMember[] {
  const query = filters.q.trim().toLowerCase();
  return members.filter((member) => {
    if (query && !`${member.full_name} ${member.email}`.toLowerCase().includes(query)) return false;
    if (filters.role && member.role !== filters.role) return false;
    if (filters.status && memberStatus(member) !== filters.status) return false;
    if (filters.twofa === "on" && !member.two_factor_enabled) return false;
    if (filters.twofa === "off" && member.two_factor_enabled) return false;
    return true;
  });
}
