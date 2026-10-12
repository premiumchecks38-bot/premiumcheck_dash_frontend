import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Integer pence as pounds ("£134.17"), with tabular figures; negative amounts get a minus sign. */
export function formatMoney(pence: number): string {
  return pence < 0 ? `-${formatPrice(Math.abs(pence))}` : formatPrice(pence);
}

export function MoneyText({ pence, className }: { pence: number; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatMoney(pence)}</span>;
}
