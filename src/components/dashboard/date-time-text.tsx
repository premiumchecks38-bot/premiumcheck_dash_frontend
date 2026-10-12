import { formatDate, formatTime } from "@/lib/utils/format";

export type DateTimeStyle = "datetime" | "date" | "time" | "short";

/** "7 October 2026 at 09:30" style text in Europe/London time, with a machine readable <time>. */
export function formatDateTime(
  value: string | number | Date,
  style: DateTimeStyle = "datetime",
): string {
  switch (style) {
    case "date":
      return formatDate(value);
    case "time":
      return formatTime(value);
    case "short":
      return `${formatDate(value, "short")}, ${formatTime(value)}`;
    default:
      return `${formatDate(value)} at ${formatTime(value)}`;
  }
}

export function DateTimeText({
  value,
  style = "datetime",
  className,
  fallback = "Never",
}: {
  value: string | number | Date | null | undefined;
  style?: DateTimeStyle;
  className?: string;
  fallback?: string;
}) {
  if (value === null || value === undefined || value === "") {
    return <span className={className}>{fallback}</span>;
  }
  const date = value instanceof Date ? value : new Date(value);
  return (
    <time dateTime={date.toISOString()} className={className}>
      {formatDateTime(value, style)}
    </time>
  );
}
