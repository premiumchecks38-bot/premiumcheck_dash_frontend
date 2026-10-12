import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils/cn";

export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  /** Buttons on the right (for example "Invite user"). */
  actions?: React.ReactNode;
  className?: string;
}

/** Title, description, breadcrumbs and actions at the top of every dashboard page. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 space-y-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-h2 font-bold tracking-tight text-primary">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-3xl font-body text-small text-text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
