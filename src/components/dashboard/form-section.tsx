import { cn } from "@/lib/utils/cn";

/** A titled block of a settings style form: heading and help on the left, fields on the right. */
export function FormSection({
  title,
  description,
  children,
  className,
  id,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "grid gap-6 rounded-lg border-thin border-border bg-background p-6 md:grid-cols-3",
        className,
      )}
    >
      <div>
        <h2 id={headingId} className="font-heading text-h4 font-bold text-primary">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 font-body text-small text-text-muted">{description}</p>
        ) : null}
      </div>
      <div className="space-y-5 md:col-span-2">{children}</div>
    </section>
  );
}
