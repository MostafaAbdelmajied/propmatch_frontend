"use client";

import { api, isApiClientError } from "@/src/lib/api/browserClient";
import type {
  AdminPropertyReviewDetail,
  AdminQueuesResponse,
  AdminReviewDetail,
  AdminStats,
  AdminTenantRequestDetail,
  KycReviewDetail,
  ReviewDecision,
} from "@/src/lib/api/contracts/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get<AdminStats>("admin/stats"),
  });
}

/**
 * Live queue (PRO-06). Driven 100% by WebSockets (Socket.IO).
 * New items arrive over `SOCKET_EVENTS.adminQueueItem` and are pushed directly
 * into the query cache by `useRealtime`.
 */
export function useAdminQueues() {
  return useQuery({
    queryKey: ["admin", "queues"],
    queryFn: () => api.get<AdminQueuesResponse>("admin/queues"),
  });
}

export function useKycReview(userId: string) {
  return useQuery({
    queryKey: ["admin", "kyc", userId],
    queryFn: () => api.get<KycReviewDetail>(`admin/kyc/${userId}`),
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useAdminPropertyReview(propertyId: string) {
  return useQuery({
    queryKey: ["admin", "property", propertyId],
    queryFn: () => api.get<AdminPropertyReviewDetail>(`admin/properties/${propertyId}`),
    staleTime: 0,
    refetchOnMount: "always",
  });
}

interface ReviewVars {
  decision: ReviewDecision;
}

export function useReviewProperty(propertyId: string) {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, { conflict: boolean; message: string }, ReviewVars>({
    mutationFn: async ({ decision }) => {
      try {
        return await api.post<{ ok: boolean }>(`admin/properties/${propertyId}/review`, decision);
      } catch (e) {
        throw {
          conflict: isApiClientError(e) && e.statusCode === 409,
          message: isApiClientError(e) ? e.message : "تعذر تنفيذ الإجراء",
        };
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "queues"] }),
  });
}

export function useReviewKyc(userId: string) {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, { conflict: boolean; message: string }, ReviewVars>({
    mutationFn: async ({ decision }) => {
      try {
        return await api.post<{ ok: boolean }>(`admin/kyc/${userId}/review`, decision);
      } catch (e) {
        throw {
          conflict: isApiClientError(e) && e.statusCode === 409,
          message: isApiClientError(e) ? e.message : "تعذر تنفيذ الإجراء",
        };
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "queues"] }),
  });
}

/* ---------------- tenant requests + reviews (PRO-08 remainder) ------------- */

export function useAdminTenantRequest(id: string) {
  return useQuery({
    queryKey: ["admin", "request", id],
    queryFn: () => api.get<AdminTenantRequestDetail>(`admin/requests/${id}`),
  });
}

export function useReviewTenantRequest(id: string) {
  const qc = useQueryClient();
  return useMutation<{ status: string }, { conflict: boolean; message: string }, ReviewVars>({
    mutationFn: async ({ decision }) => {
      try {
        return await api.post<{ status: string }>(`admin/requests/${id}/review`, decision);
      } catch (e) {
        throw {
          conflict: isApiClientError(e) && e.statusCode === 409,
          message: isApiClientError(e) ? e.message : "تعذر تنفيذ الإجراء",
        };
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "queues"] }),
  });
}

export function useAdminReview(id: string) {
  return useQuery({
    queryKey: ["admin", "review", id],
    queryFn: () => api.get<AdminReviewDetail>(`admin/reviews/${id}`),
  });
}

export function useModerateReview(id: string) {
  const qc = useQueryClient();
  return useMutation<{ status: string }, { conflict: boolean; message: string }, ReviewVars>({
    mutationFn: async ({ decision }) => {
      try {
        return await api.post<{ status: string }>(`admin/reviews/${id}/review`, decision);
      } catch (e) {
        throw {
          conflict: isApiClientError(e) && e.statusCode === 409,
          message: isApiClientError(e) ? e.message : "تعذر تنفيذ الإجراء",
        };
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "queues"] }),
  });
}
