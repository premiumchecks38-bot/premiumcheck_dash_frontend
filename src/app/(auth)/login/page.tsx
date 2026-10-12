import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { LoginForm } from "@/components/dashboard/auth/login-form";
import { safeNext } from "@/lib/auth/redirects";
import { getSession } from "@/lib/dal";

export const metadata: Metadata = { title: "Sign in" };

interface PageProps {
  searchParams: Promise<{ next?: string; expired?: string; reset?: string; invited?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const session = await getSession();
  if (session.status === "authenticated") redirect((next ?? "/") as Route);

  let notice: string | null = null;
  if (params.expired) notice = "Your session has ended. Please sign in again.";
  else if (params.reset) notice = "Your password has been changed. Sign in with the new password.";
  else if (params.invited) notice = "Your account is ready. Sign in with your new password.";

  return (
    <>
      <h1 className="font-heading text-h3 font-bold text-primary">Sign in</h1>
      <p className="mt-1 font-body text-small text-text-muted">
        Use your Premium Property Checks staff account.
      </p>
      <LoginForm next={next} notice={notice} />
    </>
  );
}
