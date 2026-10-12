"use client";

import * as React from "react";

import {
  accessTo,
  can,
  type Access,
  type Page,
  type Requirement,
  type SessionUser,
} from "@/lib/auth/permissions";

/**
 * The signed in user for client components, provided by the dashboard layout from the DAL.
 * It only decides what to show; the backend checks every request again.
 */
const SessionContext = React.createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSessionUser(): SessionUser {
  const user = React.useContext(SessionContext);
  if (!user) throw new Error("useSessionUser must be used inside SessionProvider");
  return user;
}

/** The user's access to a page: { access, canView, canEdit }. */
export function usePermission(page: Page): { access: Access; canView: boolean; canEdit: boolean } {
  const user = useSessionUser();
  const access = accessTo(user, page);
  return { access, canView: access !== "none", canEdit: access === "edit" };
}

/** Render children only when the user meets the requirement (view or edit on a page, or a role). */
export function Can({
  requires,
  children,
  fallback = null,
}: {
  requires: Requirement;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const user = useSessionUser();
  return <>{can(user, requires) ? children : fallback}</>;
}
