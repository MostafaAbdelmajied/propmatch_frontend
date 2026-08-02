"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import { toActionError, type ActionError } from "@/src/lib/api/actionError";
import type { CreateReviewRequest, PropertyReviewsResponse } from "@/src/lib/api/contracts/review";

/** ERD `PROPERTY_REVIEW` (SRS 3.7). Public list is APPROVED-only. */

export function usePropertyReviews(propertyId: string) {
  return useQuery({
    queryKey: ["properties", propertyId, "reviews"],
    queryFn: () => api.get<PropertyReviewsResponse>(`properties/${propertyId}/reviews`),
  });
}

export function useCreateReview(propertyId: string) {
  const qc = useQueryClient();
  return useMutation<{ id: string; status: string }, ActionError, CreateReviewRequest>({
    mutationFn: async (body) => {
      try {
        return await api.post<{ id: string; status: string }>("reviews", body);
      } catch (e) {
        throw toActionError(e);
      }
    },
    // The new review lands in PENDING, so the public list won't change yet —
    // invalidate anyway in case moderation is instant in some environment.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties", propertyId, "reviews"] }),
  });
}
