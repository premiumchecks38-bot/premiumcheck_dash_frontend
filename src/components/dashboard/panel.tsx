import { cn } from "@/lib/utils/cn";

/** A titled card on detail pages. */
export function Panel({
  title,
  actions,
  children,
  className,
  id,
  testId,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
  testId?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      aria-label={headingId ? undefined : title}
      className={cn("rounded-lg border-thin border-border bg-background p-5", className)}
      data-testid={testId}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-h5 font-heading font-bold text-primary">
          {title}
        </h2>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Label and value pairs inside a panel. */
export function Facts({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 font-body text-small sm:grid-cols-[minmax(0,10rem)_1fr]">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-text-muted">{item.label}</dt>
          <dd className="text-text">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
