import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Shown when the signed in user opens a page their role or permissions do not include. */
export function Forbidden({ pageTitle }: { pageTitle?: string }) {
  return (
    <section
      aria-labelledby="forbidden-heading"
      className="mx-auto mt-12 max-w-lg rounded-xl border-thin border-border bg-background p-8 text-center"
      data-testid="forbidden"
    >
      <ShieldAlert className="mx-auto h-10 w-10 text-accent" aria-hidden="true" />
      <p className="mt-4 font-heading text-caption font-bold tracking-wider text-text-subtle uppercase">
        Error 403
      </p>
      <h1 id="forbidden-heading" className="mt-1 font-heading text-h3 font-bold text-primary">
        You do not have access to {pageTitle ?? "this page"}
      </h1>
      <p className="mt-3 font-body text-small text-text-muted">
        Your account does not include this part of the dashboard. If you need it for your work, ask
        the owner or an admin to update your permissions on the Team page.
      </p>
      <Button asChild variant="accent" size="sm" className="mt-6">
        <Link href="/">Go to your dashboard</Link>
      </Button>
    </section>
  );
}
