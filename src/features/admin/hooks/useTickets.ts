"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import type { TicketDetail, TicketStatus, TicketSummary } from "@/src/lib/api/contracts/support";

export function useTickets() {
  return useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: () => api.get<{ items: TicketSummary[] }>("admin/tickets"),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["admin", "ticket", id],
    queryFn: () => api.get<TicketDetail>(`admin/tickets/${id}`),
    enabled: Boolean(id),
  });
}

export function useTicketActions(id: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "ticket", id] });
    qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
  };

  const reply = useMutation({
    mutationFn: (vars: {
      content?: string;
      internal: boolean;
      attachmentUrl?: string;
      attachmentType?: "IMAGE" | "VIDEO" | "AUDIO";
      attachmentName?: string;
      attachmentDurationMs?: number;
    }) => api.post<TicketDetail>(`admin/tickets/${id}/reply`, vars),
    onSuccess: (data) => {
      qc.setQueryData(["admin", "ticket", id], data);
      qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
  });

  const assign = useMutation({
    mutationFn: () => api.post<TicketDetail>(`admin/tickets/${id}/assign`),
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: (status: TicketStatus) => api.post<TicketDetail>(`admin/tickets/${id}/status`, { status }),
    onSuccess: invalidate,
  });

  return { reply, assign, setStatus };
}
