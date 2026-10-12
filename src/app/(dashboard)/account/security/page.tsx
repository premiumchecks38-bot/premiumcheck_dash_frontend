import type { Metadata } from "next";

import { AccountTabs } from "@/components/dashboard/account/account-tabs";
import { SecurityView } from "@/components/dashboard/account/security-view";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <>
      <PageHeader
        title="Your account"
        description="Password, two factor sign in and signed in devices."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Account", href: "/account" },
          { label: "Security" },
        ]}
      />
      <AccountTabs current="/account/security" />
      <SecurityView />
    </>
  );
}
