/** Shared appearances for specialized button controls. State selection stays with the owning control. */
export const controlButtonStyles = {
  calendarNavigation:
    "flex min-h-touch min-w-touch items-center justify-center rounded-full hover:bg-surface-alt disabled:opacity-40",
  calendarDay:
    "mx-auto flex h-11 w-full max-w-12 flex-col items-center justify-center rounded-md font-heading text-small font-semibold tabular-nums transition-colors",
  calendarDayFocus: "focus-visible:outline-focus-ring",
  calendarDayAvailable:
    "bg-accent-subtle text-accent-subtle-foreground hover:bg-accent hover:text-accent-foreground",
  calendarDaySelected: "bg-accent text-accent-foreground",
  calendarDayUnavailable: "cursor-not-allowed text-text-subtle line-through decoration-1",
  inlineRetry: "font-semibold underline underline-offset-4",
  inlineLink: "font-semibold text-accent underline underline-offset-4",
  quantity:
    "flex min-h-touch min-w-touch items-center justify-center bg-surface hover:bg-surface-alt disabled:opacity-50",
  changeDate:
    "inline-flex min-h-touch items-center font-semibold text-accent underline underline-offset-4",
  summaryToggle:
    "flex min-h-touch w-full items-center justify-between gap-3 px-4 py-3 text-left lg:hidden focus-visible:outline-focus-ring",
  retryLink:
    "inline-flex min-h-touch items-center gap-2 font-heading text-small font-semibold text-accent underline-offset-4 hover:underline",
  whatsappTrigger:
    "group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-whatsapp text-white shadow-md hover:shadow-lg hover:bg-whatsapp-hover active:scale-95 transition-all duration-normal ease-standard cursor-pointer focus-visible:outline-focus focus-visible:outline-focus-ring",
  scrollTop:
    "group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg transition-all duration-normal ease-standard text-primary hover:text-accent active:scale-95 focus-visible:outline-focus focus-visible:outline-focus-ring cursor-pointer p-0 m-0 border-0",
  chatClose:
    "p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer",
  chatTopic:
    "rounded-full bg-white hover:bg-emerald-50 text-text hover:text-whatsapp-dark border-thin border-neutral-300 hover:border-whatsapp px-3 py-1 text-caption font-semibold transition-all cursor-pointer shadow-2xs",
  chatSend:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-whatsapp hover:bg-whatsapp-hover text-white shadow-xs transition-transform active:scale-90 cursor-pointer",
  footerLink:
    "hover:text-text transition-colors py-1 focus-visible:outline-focus-ring cursor-pointer",
  scrollTopCompact:
    "group relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg transition-all duration-normal ease-standard text-primary hover:text-accent active:scale-95 focus-visible:outline-focus focus-visible:outline-focus-ring cursor-pointer p-0 m-0 border-0",
  whatsappTriggerLarge:
    "group relative flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg hover:shadow-xl hover:bg-whatsapp-hover active:scale-95 transition-all duration-normal ease-standard cursor-pointer focus-visible:outline-focus focus-visible:outline-focus-ring",
  categoryTab:
    "inline-flex items-center gap-2 rounded-full px-4 py-2 font-heading text-small font-semibold whitespace-nowrap transition-all focus-visible:outline-focus min-h-touch",
  categoryTabSelected: "bg-primary text-primary-foreground shadow-xs",
  categoryTabIdle:
    "bg-surface border-thin border-border text-text hover:border-border-strong hover:bg-surface-subtle",
  vatOption:
    "rounded-sm px-3 py-1.5 font-heading text-small font-semibold transition-all focus-visible:outline-focus",
  vatOptionSelected: "bg-surface text-primary shadow-xs",
  vatOptionIdle: "text-text-muted hover:text-text",
  headerPhone:
    "lg:hidden flex items-center justify-center rounded-xs border-thin border-border text-primary hover:text-accent hover:bg-surface-subtle transition-all duration-300 focus-visible:outline-focus-ring",
  headerPhoneDefault: "h-touch w-touch",
  bookingPhone:
    "inline-flex min-h-touch items-center gap-2 rounded-full px-2 font-heading text-small font-semibold text-primary hover:text-accent focus-visible:outline-focus-ring",
  priceCategory:
    "inline-block rounded-md px-3 py-1.5 font-heading text-small font-semibold transition-all focus-visible:outline-focus",
  priceCategorySelected: "bg-primary text-primary-foreground shadow-2xs",
  priceCategoryIdle: "text-text-muted hover:text-text hover:bg-surface-subtle",
} as const;
