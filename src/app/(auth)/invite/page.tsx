import type { Metadata } from "next";

import { SetPasswordForm } from "@/components/dashboard/auth/set-password-form";

export const metadata: Metadata = { title: "Accept your invitation" };

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function InvitePage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="font-heading text-h3 font-bold text-primary">Set up your account</h1>
      <p className="mt-1 font-body text-small text-text-muted">
        You have been invited to the Premium Property Checks dashboard. Check your name and choose a
        password to finish.
      </p>
      <SetPasswordForm mode="invite" token={token ?? ""} />
    </>
  );
}
