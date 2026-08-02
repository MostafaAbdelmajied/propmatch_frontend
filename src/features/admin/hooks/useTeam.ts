"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import type { AdminSession, AdminTeamMember, AuditLogEntry, CreateAdminRequest, LoginHistoryEntry, UpdateAdminRequest } from "@/src/lib/api/contracts/admin";

/** The current admin's session (role + capabilities) for capability-gated UI. */
export function useAdminSession() {
  return useQuery({
    queryKey: ["admin", "session"],
    queryFn: () => api.get<AdminSession>("admin/session"),
  });
}

export function useTeam() {
  return useQuery({
    queryKey: ["admin", "team"],
    queryFn: () => api.get<{ items: AdminTeamMember[] }>("admin/team"),
  });
}

export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAdminRequest) => api.post<AdminTeamMember>("admin/register", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "team"] }),
  });
}

export function useUpdateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: UpdateAdminRequest }) =>
      api.patch<AdminTeamMember>(`admin/team/${vars.id}`, vars.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "team"] }),
  });
}

export function useResetAdminPassword() {
  return useMutation({
    mutationFn: (id: string) => api.post<{ sent: boolean }>(`admin/team/${id}/reset-password`),
  });
}

export function useAuditLog() {
  return useQuery({
    queryKey: ["admin", "audit-log"],
    queryFn: () => api.get<{ items: AuditLogEntry[] }>("admin/audit-log"),
  });
}

export function useLoginHistory() {
  return useQuery({
    queryKey: ["admin", "login-history"],
    queryFn: () => api.get<{ items: LoginHistoryEntry[] }>("admin/login-history"),
  });
}
