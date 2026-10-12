import "server-only";

import { navItemFor } from "@/config/navigation";
import { can, type Requirement } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/dal";

import { Forbidden } from "./forbidden";

/**
 * Server side permission check for a section, used by each route group layout. By default the
 * requirement comes from the navigation config the sidebar is built from, so they always agree.
 * Pages outside the sidebar (a booking, a new booking) pass `anyOf` instead: access to any one
 * of the requirements is enough.
 */
export async function RouteGuard({
  href,
  anyOf,
  title,
  children,
}: {
  href?: string;
  anyOf?: Requirement[];
  title?: string;
  children: React.ReactNode;
}) {
  const item = href ? navItemFor(href) : undefined;
  const requirements = anyOf ?? (item ? [item.requires] : []);
  if (requirements.length === 0) return <Forbidden />;
  const user = await requireUser();
  if (!requirements.some((requirement) => can(user, requirement))) {
    return <Forbidden pageTitle={title ?? item?.title} />;
  }
  return <>{children}</>;
}
