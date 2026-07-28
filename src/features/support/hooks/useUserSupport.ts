"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import type { TicketDetail, TicketSummary } from "@/src/lib/api/contracts/support";

export function useMyTickets() {
  return useQuery({
    queryKey: ["user", "support", "tickets"],
    queryFn: () => api.get<{ items: TicketSummary[] }>("support/my-tickets"),
  });
}

export function useUserTicketDetail(id: string) {
  return useQuery({
    queryKey: ["user", "support", "ticket", id],
    queryFn: () => api.get<TicketDetail>(`support/tickets/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { subject: string; initialMessage: string }) =>
      api.post<TicketDetail>("support/tickets", vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "support", "tickets"] });
    },
  });
}

export function useUserTicketReply(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      content?: string;
      attachmentUrl?: string;
      attachmentType?: "IMAGE" | "VIDEO" | "AUDIO";
      attachmentName?: string;
      attachmentDurationMs?: number;
    }) => api.post<TicketDetail>(`support/tickets/${ticketId}/reply`, vars),
    onSuccess: (data) => {
      qc.setQueryData(["user", "support", "ticket", ticketId], data);
      qc.invalidateQueries({ queryKey: ["user", "support", "tickets"] });
    },
  });
}
