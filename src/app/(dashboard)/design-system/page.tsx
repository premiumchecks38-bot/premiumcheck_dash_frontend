import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarCheck2, PoundSterling } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { FormSection } from "@/components/dashboard/form-section";
import { MoneyText } from "@/components/dashboard/money-text";
import { DateTimeText } from "@/components/dashboard/date-time-text";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Design system" };

const BUTTONS = ["primary", "accent", "secondary", "outline", "ghost", "link"] as const;
const BADGES = ["primary", "accent", "success", "warning", "error", "info", "outline"] as const;
const STATUSES = [
  ["booking", "confirmed"],
  ["booking", "pending_payment"],
  ["booking", "cancelled"],
  ["payment", "succeeded"],
  ["payment", "failed"],
  ["dispute", "needs_response"],
  ["user", "active"],
  ["user", "invited"],
  ["user", "deactivated"],
] as const;

/** Every dashboard building block in one place. Development only: 404 in production. */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <PageHeader
        title="Design system"
        description="Shared tokens and components, synced from the website."
      />
      <div className="space-y-8">
        <FormSection title="Buttons">
          <div className="flex flex-wrap gap-3">
            {BUTTONS.map((variant) => (
              <Button key={variant} variant={variant} size="sm">
                {variant}
              </Button>
            ))}
            <Button variant="accent" size="sm" loading>
              Loading
            </Button>
          </div>
        </FormSection>
        <FormSection title="Badges and statuses">
          <div className="flex flex-wrap gap-2">
            {BADGES.map((variant) => (
              <Badge key={variant} variant={variant}>
                {variant}
              </Badge>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {STATUSES.map(([kind, status]) => (
              <StatusBadge key={`${kind}-${status}`} kind={kind} status={status} />
            ))}
          </div>
        </FormSection>
        <FormSection title="Stat cards">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Jobs today" value={6} icon={CalendarCheck2} />
            <StatCard
              label="This week"
              value={<MoneyText pence={123456} />}
              changePercent={12.5}
              icon={PoundSterling}
            />
            <StatCard
              label="Refunds"
              value={<MoneyText pence={4500} />}
              changePercent={8}
              trend="up-bad"
            />
          </div>
        </FormSection>
        <FormSection title="Alerts">
          <div className="space-y-3">
            <Alert variant="info" title="Information">
              Something worth knowing.
            </Alert>
            <Alert variant="success" title="Saved">
              Changes saved.
            </Alert>
            <Alert variant="warning" title="Check this">
              Something needs attention.
            </Alert>
            <Alert variant="error" title="Could not save">
              Something went wrong.
            </Alert>
          </div>
        </FormSection>
        <FormSection title="Forms, text and loading">
          <div className="max-w-md space-y-4">
            <FormField id="ds-input" label="Label" hint="Hint text">
              <Input id="ds-input" placeholder="Placeholder" />
            </FormField>
            <FormField id="ds-error" label="With an error" error="This field is required">
              <Input id="ds-error" aria-invalid aria-describedby="ds-error-error" />
            </FormField>
            <p className="font-body text-small">
              <MoneyText pence={-1250} /> on <DateTimeText value="2026-10-06T09:30:00Z" />
            </p>
            <Skeleton className="h-10 w-full" />
          </div>
        </FormSection>
        <EmptyState title="Empty state" description="Shown when a list has nothing in it." />
      </div>
    </>
  );
}
