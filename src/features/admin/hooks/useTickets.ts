"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import type {
  AdminTicketsResponse,
  TicketDetail,
  TicketStatus,
} from "@/src/lib/api/contracts/support";

export type AdminTicketStatusFilter =
  "all" | "new" | "assigned" | "in_progress" | "waiting" | "closed";
export type AdminTicketCommercialFilter = "ALL" | "FREEMIUM" | "OWNER_PLUS" | "PREMIUM";

export interface AdminTicketsQuery {
  status?: AdminTicketStatusFilter;
  commercialPriority?: AdminTicketCommercialFilter;
  page?: number;
  pageSize?: number;
}

export function buildAdminTicketsPath(query: AdminTicketsQuery = {}): string {
  const params = new URLSearchParams();
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.commercialPriority && query.commercialPriority !== "ALL") {
    params.set("commercialPriority", query.commercialPriority);
  }
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const search = params.toString();
  return search ? `admin/tickets?${search}` : "admin/tickets";
}

export function useTickets(query: AdminTicketsQuery = {}) {
  return useQuery({
    queryKey: [
      "admin",
      "tickets",
      query.status ?? "all",
      query.commercialPriority ?? "ALL",
      query.page ?? 1,
      query.pageSize ?? 20,
    ],
    queryFn: () => api.get<AdminTicketsResponse>(buildAdminTicketsPath(query)),
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
    mutationFn: (status: TicketStatus) =>
      api.post<TicketDetail>(`admin/tickets/${id}/status`, { status }),
    onSuccess: invalidate,
  });

  return { reply, assign, setStatus };
}
