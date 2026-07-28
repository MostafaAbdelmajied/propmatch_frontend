"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import { toActionError, type ActionError } from "@/src/lib/api/actionError";
import type {
  CounterOfferInput,
  CreateTenantOfferInput,
  ReceivedTenantOffer,
  TenantOffer,
} from "@/src/lib/api/contracts/tenantOffer";

/** Forward marketplace: tenant offers directly on a listing. */

const TENANT_KEY = ["tenant", "listing-offers"] as const;
const LANDLORD_KEY = ["landlord", "listing-offers"] as const;

/** Tenant → create a priced offer on a specific listing. */
export function useCreateTenantOffer(propertyId: string) {
  const qc = useQueryClient();
  return useMutation<{ id: string; status: string }, ActionError, CreateTenantOfferInput>({
    mutationFn: async (body) => {
      try {
        return await api.post(`tenant/listing-offers`, { propertyId, ...body });
      } catch (e) {
        throw toActionError(e);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANT_KEY }),
  });
}

export function useMyTenantOffers() {
  return useQuery({
    queryKey: TENANT_KEY,
    queryFn: () => api.get<{ items: TenantOffer[] }>("tenant/listing-offers"),
  });
}

export function useLandlordTenantOffers() {
  return useQuery({
    queryKey: LANDLORD_KEY,
    queryFn: () => api.get<{ items: ReceivedTenantOffer[] }>("landlord/listing-offers"),
  });
}

/** Tenant accepts the landlord's counter → CONNECTED match. */
export function useAcceptCounter() {
  const qc = useQueryClient();
  return useMutation<{ matchConnectionId: string }, ActionError, string>({
    mutationFn: async (id) => {
      try {
        return await api.post(`tenant/listing-offers/${id}/accept`);
      } catch (e) {
        throw toActionError(e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_KEY });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useWithdrawTenantOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`tenant/listing-offers/${id}/withdraw`),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANT_KEY }),
  });
}

/** Landlord accepts the tenant's price → CONNECTED match. */
export function useLandlordAcceptOffer() {
  const qc = useQueryClient();
  return useMutation<{ matchConnectionId: string }, ActionError, string>({
    mutationFn: async (id) => {
      try {
        return await api.post(`landlord/listing-offers/${id}/accept`);
      } catch (e) {
        throw toActionError(e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LANDLORD_KEY });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useLandlordDeclineOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`landlord/listing-offers/${id}/decline`),
    onSuccess: () => qc.invalidateQueries({ queryKey: LANDLORD_KEY }),
  });
}

export function useLandlordCounterOffer() {
  const qc = useQueryClient();
  return useMutation<unknown, ActionError, { id: string } & CounterOfferInput>({
    mutationFn: async ({ id, ...body }) => {
      try {
        return await api.post(`landlord/listing-offers/${id}/counter`, body);
      } catch (e) {
        throw toActionError(e);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LANDLORD_KEY }),
  });
}
