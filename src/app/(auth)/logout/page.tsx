import type { Metadata } from "next";

import { LogoutRunner } from "@/components/dashboard/auth/logout-runner";

export const metadata: Metadata = { title: "Signing out" };

export default function LogoutPage() {
  return (
    <>
      <h1 className="font-heading text-h3 font-bold text-primary">Signing you out</h1>
      <LogoutRunner />
    </>
  );
}
