import type { Metadata } from "next";

import { AccountTabs } from "@/components/dashboard/account/account-tabs";
import { ProfileForm } from "@/components/dashboard/account/profile-form";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage() {
  return (
    <>
      <PageHeader
        title="Your account"
        description="Your name and sign in details."
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Account" }]}
      />
      <AccountTabs current="/account" />
      <ProfileForm />
    </>
  );
}
