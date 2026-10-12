import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ForcedSetup } from "@/components/dashboard/account/forced-setup";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Set up two factor sign in" };

/** Where people land when their role must use two factor sign in and it is not on yet. */
export default async function TwoFactorSetupPage() {
  const user = await requireUser({ allowTwoFactorSetup: true });
  if (!user.two_factor_setup_required) redirect("/account/security");
  return (
    <>
      <PageHeader
        title="Set up two factor sign in"
        description="Your role needs a code from an authenticator app as well as your password. It takes about a minute."
      />
      <ForcedSetup />
    </>
  );
}
