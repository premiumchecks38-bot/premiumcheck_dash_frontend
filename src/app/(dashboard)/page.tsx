import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OverviewView } from "@/components/dashboard/overview/overview-view";
import { homeFor } from "@/config/navigation";
import type { Overview } from "@/lib/api/schemas";
import { can } from "@/lib/auth/permissions";
import { prefetchAdmin, requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Overview" };

/** Home page. People without the overview page go to the first page they can open. */
export default async function OverviewPage() {
  const user = await requireUser();
  if (!can(user, { page: "overview" })) redirect(homeFor(user));
  // Read on the server so the page arrives complete instead of shifting when data lands.
  const initial = await prefetchAdmin<Overview>("/overview");
  return (
    <OverviewView
      initial={initial}
      showMoney={can(user, { page: "payments" })}
      firstName={user.full_name.split(" ")[0] ?? ""}
    />
  );
}
