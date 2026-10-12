/**
 * Leaving a form with unsaved changes asks first. The browser shows its own prompt when the
 * tab is closed or reloaded (beforeunload); in app navigation (sidebar links, breadcrumbs, the
 * back button) is caught here and confirmed with a plain question.
 */

export const LEAVE_MESSAGE = "You have unsaved changes. Leave this page and lose them?";

/** True when a click on this anchor would navigate away from the current page in this tab. */
export function isLeavingClick(event: MouseEvent, anchor: HTMLAnchorElement, current: Location) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:"))
    return false;
  const next = new URL(anchor.href, current.href);
  if (next.origin !== current.origin) return true;
  return next.pathname !== current.pathname || next.search !== current.search;
}

/** Shallow comparison of form values (JSON shape), ignoring key order. */
export function isDirty(initial: unknown, current: unknown): boolean {
  return stableJson(initial) !== stableJson(current);
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );
}
