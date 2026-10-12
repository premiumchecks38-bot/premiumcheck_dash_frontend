import { Inbox, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

/** A calm "nothing here yet" card with an optional next step. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border-thin border-dashed border-border bg-background px-6 py-12 text-center",
        className,
      )}
      data-testid="empty-state"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle text-accent">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-heading text-h4 font-bold text-primary">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md font-body text-small text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
