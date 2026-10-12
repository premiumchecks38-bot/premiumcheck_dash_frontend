import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/dashboard/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgotten password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-heading text-h3 font-bold text-primary">Forgotten your password?</h1>
      <p className="mt-1 font-body text-small text-text-muted">
        Enter your email and we will send you a link to choose a new password.
      </p>
      <ForgotPasswordForm />
    </>
  );
}
