"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, streamPost } from "@/src/lib/api/browserClient";
import { isVerificationRequired, toActionError, type ActionError } from "@/src/lib/api/actionError";
import { verificationQueryKey } from "@/src/features/ekyc/hooks/useKyc";
import type {
  CreatePropertyRequest,
  PropertyDetail,
  PropertySummary,
} from "@/src/lib/api/contracts/property";
import type { UserQuota } from "@/src/lib/api/contracts/payment";

/** ERD: USER_QUOTA is landlord-only, so this can legitimately be null. */
export function useQuota() {
  return useQuery({
    queryKey: ["quota"],
    queryFn: () => api.get<UserQuota | null>("quota"),
  });
}

export function useMyProperties() {
  return useQuery({
    queryKey: ["properties", "mine"],
    queryFn: () => api.get<{ items: PropertySummary[] }>("landlord/properties"),
  });
}

export interface CreatePropertyResult {
  property: PropertyDetail;
}

export type CreatePropertyUploadInput = Omit<CreatePropertyRequest, "images"> & {
  images: File[];
};

export function createPropertyFormData(input: CreatePropertyUploadInput): FormData {
  const formData = new FormData();
  const { images, ...fields } = input;

  for (const [field, value] of Object.entries(fields)) {
    if (value !== undefined) formData.append(field, String(value));
  }
  for (const image of images) formData.append("images", image);

  return formData;
}

/** @deprecated Use `ActionError` from `@/src/lib/api/actionError` — same shape, shared with matching. */
export type LandlordActionError = ActionError;

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation<CreatePropertyResult, LandlordActionError, CreatePropertyUploadInput>({
    retry: false,
    mutationFn: async (body) => {
      try {
        return await api.postForm<CreatePropertyResult>(
          "landlord/properties",
          createPropertyFormData(body),
        );
      } catch (e) {
        throw toActionError(e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties", "mine"] });
      qc.invalidateQueries({ queryKey: ["quota"] });
    },
    onError: async (error) => {
      if (!isVerificationRequired(error)) return;

      await qc.refetchQueries({ queryKey: verificationQueryKey, exact: true });
    },
  });
}

/**
 * PRO-10 streaming optimizer. Not a react-query mutation: the value arrives
 * progressively, so the caller gets tokens as they land rather than one
 * resolved payload.
 *
 * Gate errors (QUOTA_EXHAUSTED / VERIFICATION_REQUIRED) still arrive as a
 * normal JSON error before the first token, so callers react exactly as they
 * do for the buffered call.
 */
export function useStreamOptimizeDescription(propertyId = "draft") {
  const qc = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);

  const run = useCallback(
    async (
      description: string,
      context: Record<string, unknown>,
      onToken: (soFar: string) => void,
    ): Promise<void> => {
      setIsStreaming(true);
      let text = "";
      try {
        await streamPost(
          `landlord/properties/${propertyId}/optimize-description/stream`,
          { description, ...context },
          {
            onToken: (token) => {
              text += token;
              onToken(text);
            },
          },
        );
        // The generation is spent server-side — refresh the counter.
        qc.invalidateQueries({ queryKey: ["quota"] });
      } catch (e) {
        throw toActionError(e);
      } finally {
        setIsStreaming(false);
      }
    },
    [propertyId, qc],
  );

  return { run, isStreaming };
}

export function useBoostProperty(propertyId: string) {
  return useMutation<{ ok: boolean }, LandlordActionError, void>({
    mutationFn: async () => {
      try {
        return await api.post<{ ok: boolean }>(`landlord/properties/${propertyId}/boost`);
      } catch (e) {
        throw toActionError(e);
      }
    },
  });
}

export function useArchiveProperty(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: boolean }>(`landlord/properties/${propertyId}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}
