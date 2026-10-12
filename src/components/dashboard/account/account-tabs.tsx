import Link from "next/link";
import type { Route } from "next";

import { cn } from "@/lib/utils/cn";

const TABS: { href: Route; label: string }[] = [
  { href: "/account", label: "Profile" },
  { href: "/account/security", label: "Security" },
];

/** Profile and Security links under the account page header. */
export function AccountTabs({ current }: { current: Route }) {
  return (
    <nav aria-label="Account" className="mb-8 flex gap-1 border-b-thin border-border">
      {TABS.map((tab) => {
        const active = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-touch items-center border-b-2 px-4 font-body text-small font-semibold",
              active
                ? "border-accent text-primary"
                : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
