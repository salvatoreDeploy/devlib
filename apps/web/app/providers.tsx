"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { SessionExpiredError } from "../lib/api/http-client";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // authenticatedFetch já disparou o redirect pro /login nesse caso —
            // insistir só atrasa a saída da tela com chamadas fadadas a repetir o 401.
            retry: (failureCount, error) =>
              !(error instanceof SessionExpiredError) && failureCount < 3,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
