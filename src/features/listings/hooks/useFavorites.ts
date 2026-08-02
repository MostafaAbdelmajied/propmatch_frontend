"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import type { PropertySummary } from "@/src/lib/api/contracts/property";

/**
 * ERD `FAVORITE` — tenant bookmarks. Not a PRO ticket of its own but required
 * by the ERD (mvp.md "Also required"). Unverified tenants may favorite;
 * verification only gates publishing/accepting (ASSUMPTIONS.md #6).
 */

const KEY = ["tenant", "favorites"] as const;

export function useFavorites() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<{ items: PropertySummary[] }>("tenant/favorites"),
  });
}

/**
 * Optimistic toggle: bookmarking should feel instant. The list is refetched on
 * settle so the server stays the source of truth either way.
 */
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, favorited }: { propertyId: string; favorited: boolean }) =>
      favorited
        ? api.delete<{ favorited: boolean }>(`tenant/favorites/${propertyId}`)
        : api.post<{ favorited: boolean }>("tenant/favorites", { propertyId }),
    onMutate: async ({ propertyId, favorited }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<{ items: PropertySummary[] }>(KEY);
      if (previous && favorited) {
        qc.setQueryData(KEY, { items: previous.items.filter((p) => p.id !== propertyId) });
      }
      return { previous };
    },
    onError: (_e, _vars, context) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Whether a given property is in the tenant's favorites. */
export function useIsFavorited(propertyId: string) {
  const { data } = useFavorites();
  return data?.items.some((p) => p.id === propertyId) ?? false;
}
