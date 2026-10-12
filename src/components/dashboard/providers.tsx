"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toast";
import { ApiError } from "@/lib/client/api";
import "@/lib/zod-setup";

/** Client state for the whole dashboard: TanStack Query cache and toasts. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            // Permission, validation and missing records do not get better by retrying.
            retry: (count, error) =>
              !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
              count < 2,
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-right" closeButton />
    </QueryClientProvider>
  );
}
