import type { Metadata } from "next";

import { TwoFactorForm } from "@/components/dashboard/auth/two-factor-form";
import { safeNext } from "@/lib/auth/redirects";

export const metadata: Metadata = { title: "Two factor authentication" };

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function TwoFactorPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-heading text-h3 font-bold text-primary">Two factor authentication</h1>
      <TwoFactorForm next={safeNext(next)} />
    </>
  );
}
