"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import type { CommercialCatalog } from "@/src/lib/api/contracts/payment";

export function useCommercialCatalog() {
  return useQuery({
    queryKey: ["commercial-config"],
    queryFn: () => api.get<CommercialCatalog>("commercial-config/catalog"),
    staleTime: 60_000,
  });
}
