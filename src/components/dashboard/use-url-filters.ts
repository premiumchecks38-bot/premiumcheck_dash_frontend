"use client";

import * as React from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filters kept in the URL (so a filtered list can be shared, bookmarked and survives reloads).
 * Empty values are removed from the URL; changing a filter resets the page number.
 */
export function useUrlFilters<K extends string>(
  keys: readonly K[],
): [Record<K, string>, (changes: Partial<Record<K | "page", string | null>>) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const values = React.useMemo(() => {
    const out = {} as Record<K, string>;
    for (const key of keys) out[key] = params.get(key) ?? "";
    return out;
  }, [params, keys]);

  const update = React.useCallback(
    (changes: Partial<Record<K | "page", string | null>>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes) as [string, string | null | undefined][]) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (!("page" in changes)) next.delete("page");
      const query = next.toString();
      router.replace((query ? `${pathname}?${query}` : pathname) as Route, { scroll: false });
    },
    [params, pathname, router],
  );

  return [values, update];
}
