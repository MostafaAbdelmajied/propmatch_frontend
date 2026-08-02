"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyVerification, submitVerification } from "@/src/lib/api/verification";
import type { SubmitVerificationInput } from "@/src/lib/api/contracts/verification";

export const verificationQueryKey = ["verification"] as const;

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateVerificationFile(file: File | null): string | null {
  if (!file) return "يرجى اختيار الملف المطلوب.";
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return "الملف يجب أن يكون بصيغة JPEG أو PNG أو WebP.";
  }
  if (file.size > MAX_FILE_SIZE) return "حجم الملف يجب ألا يتجاوز 5 ميجابايت.";
  return null;
}

export function useVerificationState() {
  return useQuery({ queryKey: verificationQueryKey, queryFn: getMyVerification, retry: false });
}

export function useSubmitVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitVerificationInput) => submitVerification(input),
    retry: false,
    onSuccess: (response) => queryClient.setQueryData(verificationQueryKey, response),
  });
}
