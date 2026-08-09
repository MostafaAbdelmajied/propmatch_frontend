"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import type {
  ContractUserReviewStatus,
  CreateUserReview,
  UserReview,
} from "@/src/lib/api/contracts/userReview";

export function useContractUserReview(contractId: string) {
  return useQuery({
    queryKey: ["contracts", contractId, "user-review"],
    queryFn: () => api.get<ContractUserReviewStatus>(`contracts/${contractId}/user-review`),
    enabled: Boolean(contractId),
    retry: false,
  });
}

export function useSubmitUserReview(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserReview) =>
      api.post<UserReview>(`contracts/${contractId}/user-review`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contracts", contractId, "user-review"],
      });
    },
  });
}
