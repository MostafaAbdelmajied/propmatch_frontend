"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/src/components/ui/Toast";
import { isApiClientError } from "@/src/lib/api/browserClient";
import { RealtimeProvider } from "@/src/lib/socket/RealtimeProvider";

/**
 * Never retry a 4xx: 401/403/404 and the coded domain errors
 * (VERIFICATION_REQUIRED, QUOTA_EXHAUSTED, CAPABILITY_REQUIRED) are verdicts,
 * not blips — retrying just doubles the failed calls and the console noise.
 * 5xx and network errors still get one retry.
 */
function retryPolicy(failureCount: number, error: unknown): boolean {
  if (isApiClientError(error) && error.statusCode >= 400 && error.statusCode < 500) return false;
  return failureCount < 1;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: retryPolicy,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    // ToastProvider wraps RealtimeProvider so socket-event handlers (e.g. a
    // contract-ready-for-review push) can call useToast() themselves.
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RealtimeProvider>{children}</RealtimeProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
