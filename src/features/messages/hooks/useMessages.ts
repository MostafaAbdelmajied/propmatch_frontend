"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import type { MatchConversationSummary, MatchMessage, SendMatchMessageInput } from "@/src/lib/api/contracts/message";

export const useMatchConversations = () =>
  useQuery({
    queryKey: ["matches"],
    queryFn: () => api.get<MatchConversationSummary[]>("matches"),
  });

export const useMatchMessages = (id: string) =>
  useQuery({
    queryKey: ["matches", id, "messages"],
    queryFn: () => api.get<MatchMessage[]>(`matches/${id}/messages`),
    enabled: Boolean(id),
  });

export function useSendMatchMessage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SendMatchMessageInput) =>
      api.post<MatchMessage>(`matches/${id}/messages`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches", id, "messages"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}
