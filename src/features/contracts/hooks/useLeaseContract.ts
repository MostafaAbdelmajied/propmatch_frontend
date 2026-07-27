"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isApiClientError } from "@/src/lib/api/browserClient";
import type {
  LeaseContract,
  LeaseContractPrefill,
  RejectDraft,
  SaveDraft,
} from "@/src/lib/api/contracts/contract";

/**
 * Tied to a CONNECTED match — see contract.ts. A 404 here means "no draft
 * started yet for this match", not an error state.
 */
export function useLeaseContract(matchConnectionId: string) {
  return useQuery({
    queryKey: ["matches", matchConnectionId, "contract"],
    queryFn: async (): Promise<LeaseContract | null> => {
      try {
        return await api.get<LeaseContract>(`matches/${matchConnectionId}/contract`);
      } catch (e) {
        if (isApiClientError(e) && e.statusCode === 404) return null;
        throw e;
      }
    },
    enabled: Boolean(matchConnectionId),
    retry: false,
  });
}

/**
 * Canonical, ID-addressed retrieval — fetches this exact LEASE_CONTRACT
 * UUID, never re-derived from an (owner, tenant) pair. A different unit
 * later between the same two people is a different match connection and
 * therefore a different contract id; routing by id is what keeps those
 * transactions isolated (see app/(shared)/contracts/[id]).
 */
export function useLeaseContractById(contractId: string) {
  return useQuery({
    queryKey: ["contracts", contractId],
    queryFn: () => api.get<LeaseContract>(`contracts/${contractId}`),
    enabled: Boolean(contractId),
    retry: false,
  });
}

/** What the Hybrid Contract Builder canvas needs before any draft exists. */
export function useLeaseContractPrefill(matchConnectionId: string) {
  return useQuery({
    queryKey: ["matches", matchConnectionId, "contract", "prefill"],
    queryFn: () => api.get<LeaseContractPrefill>(`matches/${matchConnectionId}/contract/prefill`),
    enabled: Boolean(matchConnectionId),
    retry: false,
  });
}

function useContractMutation<TBody = void>(matchConnectionId: string, action: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) =>
      api.post<LeaseContract>(`matches/${matchConnectionId}/contract/${action}`, body ?? {}),
    onSuccess: (data) => {
      qc.setQueryData(["matches", matchConnectionId, "contract"], data);
    },
  });
}

/** Landlord only. Creates/updates the draft — no PDF yet. */
export function useSaveDraft(matchConnectionId: string) {
  return useContractMutation<SaveDraft>(matchConnectionId, "draft");
}

/** Landlord only. Locks the draft for tenant review. */
export function useSendForReview(matchConnectionId: string) {
  return useContractMutation<void>(matchConnectionId, "send-for-review");
}

/** Tenant only. The only action that actually generates the PDF. */
export function useApproveContract(matchConnectionId: string) {
  return useContractMutation<void>(matchConnectionId, "approve");
}

/** Tenant only. Unlocks the draft back to the landlord, with an optional note. */
export function useRejectContract(matchConnectionId: string) {
  return useContractMutation<RejectDraft>(matchConnectionId, "reject");
}
