"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import { toActionError, type ActionError } from "@/src/lib/api/actionError";
import type { BrowsableTenantRequest } from "@/src/lib/api/contracts/tenantRequest";
import type {
  AcceptOfferResponse,
  CreateOfferRequest,
  ReceivedOffer,
  SentOffer,
} from "@/src/lib/api/contracts/offer";

/** PRO-12/13 — the landlord↔tenant offer exchange. */

const BROWSABLE_KEY = ["landlord", "requests"] as const;
const SENT_KEY = ["landlord", "offers"] as const;
const INBOX_KEY = ["tenant", "offers"] as const;

/**
 * Approved tenant requests, scored against this landlord's own properties.
 * 403 VERIFICATION_REQUIRED is a legitimate state here (the backend gates
 * browsing itself), so surface it rather than retrying.
 */
export function useBrowsableRequests() {
  return useQuery<{ items: BrowsableTenantRequest[] }, ActionError>({
    queryKey: BROWSABLE_KEY,
    queryFn: async () => {
      try {
        return await api.get<{ items: BrowsableTenantRequest[] }>("landlord/requests");
      } catch (e) {
        throw toActionError(e);
      }
    },
    retry: false,
  });
}

export function useSentOffers() {
  return useQuery({
    queryKey: SENT_KEY,
    queryFn: () => api.get<{ items: SentOffer[] }>("landlord/offers"),
  });
}

export interface SendOfferResult {
  id: string;
  status: string;
  freeOffersLeft: number;
}

export function useSendOffer() {
  const qc = useQueryClient();
  return useMutation<SendOfferResult, ActionError, CreateOfferRequest>({
    mutationFn: async (body) => {
      try {
        return await api.post<SendOfferResult>("landlord/offers", body);
      } catch (e) {
        throw toActionError(e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BROWSABLE_KEY });
      qc.invalidateQueries({ queryKey: SENT_KEY });
      qc.invalidateQueries({ queryKey: ["quota"] });
    },
  });
}

export function useReceivedOffers() {
  return useQuery({
    queryKey: INBOX_KEY,
    queryFn: () => api.get<{ items: ReceivedOffer[] }>("tenant/offers"),
  });
}

/** SENT → VIEWED. Fired when the tenant actually opens an offer (ASSUMPTIONS #13). */
export function useViewOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) => api.post<ReceivedOffer>(`tenant/offers/${offerId}/view`),
    onSuccess: () => qc.invalidateQueries({ queryKey: INBOX_KEY }),
  });
}

/** Accepting reveals the owner's contact and CONNECTs the match. */
export function useAcceptOffer() {
  const qc = useQueryClient();
  return useMutation<AcceptOfferResponse, ActionError, string>({
    mutationFn: async (offerId) => {
      try {
        return await api.post<AcceptOfferResponse>(`tenant/offers/${offerId}/accept`);
      } catch (e) {
        throw toActionError(e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INBOX_KEY });
      qc.invalidateQueries({ queryKey: ["tenant", "requests"] });
    },
  });
}

export function useRejectOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) => api.post<{ ok: boolean }>(`tenant/offers/${offerId}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: INBOX_KEY }),
  });
}
