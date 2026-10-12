"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText, Inbox } from "lucide-react";

import { admin } from "@/lib/client/api";
import { cn } from "@/lib/utils/cn";
import type { LeadCounts } from "@/lib/api/schemas";

export function LeadsTabs() {
  const pathname = usePathname();
  const isQuotes = pathname.startsWith("/leads/quotes");

  const countsQuery = useQuery({
    queryKey: ["admin", "leads", "unread-count"],
    queryFn: () => admin<LeadCounts>("/leads/unread-count"),
    refetchInterval: 60_000,
  });

  const counts = countsQuery.data;

  return (
    <div className="flex border-b border-border mb-6 overflow-x-auto">
      <Link
        href="/leads/quotes"
        className={cn(
          "flex items-center gap-2 border-b-2 px-4 py-2.5 text-small font-medium transition-colors -mb-px whitespace-nowrap",
          isQuotes
            ? "border-accent text-accent font-semibold"
            : "border-transparent text-text-muted hover:text-text hover:border-border",
        )}
      >
        <FileText className="h-4 w-4" />
        <span>Quote requests</span>
        {typeof counts?.new_quotes === "number" && counts.new_quotes > 0 && (
          <span className="rounded-full bg-status-info-bg text-status-info-text px-2 py-0.5 text-caption font-semibold">
            {counts.new_quotes} new
          </span>
        )}
      </Link>

      <Link
        href="/leads"
        className={cn(
          "flex items-center gap-2 border-b-2 px-4 py-2.5 text-small font-medium transition-colors -mb-px whitespace-nowrap",
          !isQuotes
            ? "border-accent text-accent font-semibold"
            : "border-transparent text-text-muted hover:text-text hover:border-border",
        )}
      >
        <Inbox className="h-4 w-4" />
        <span>Contact enquiries</span>
        {typeof counts?.unread_messages === "number" && counts.unread_messages > 0 && (
          <span className="rounded-full bg-status-pending-bg text-status-pending-text px-2 py-0.5 text-caption font-semibold">
            {counts.unread_messages} unread
          </span>
        )}
      </Link>
    </div>
  );
}
