import type { Metadata } from "next";

import { SetPasswordForm } from "@/components/dashboard/auth/set-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="font-heading text-h3 font-bold text-primary">Choose a new password</h1>
      <p className="mt-1 font-body text-small text-text-muted">
        Saving a new password signs you out on every device.
      </p>
      <SetPasswordForm mode="reset" token={token ?? ""} />
    </>
  );
}
