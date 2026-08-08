"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import type {
  AdminReactivationRequestsResponse,
  AdminSession,
  AdminTeamMember,
  AdminUsersResponse,
  AdminUserStatusFilter,
  AuditLogEntry,
  CreateAdminRequest,
  LoginHistoryEntry,
  UpdateAdminRequest,
} from "@/src/lib/api/contracts/admin";

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

/**
 * Platform accounts (tenants, landlords, admins). `status` mirrors
 * AdminService.listUsers's query param — defaults to 'active' so the main
 * tab stays clean; pass 'deleted' for the Suspended/Deleted tab or 'all' to
 * see everything.
 */
export function useAdminUsers(status: AdminUserStatusFilter = "active") {
  return useQuery({
    queryKey: ["admin", "users", status],
    queryFn: () => api.get<AdminUsersResponse>(`admin/users?status=${status}`),
  });
}

/**
 * Soft-deletes a user (DELETE /admin/users/:id). Invalidates the list on
 * success so the table drops the row without a full page reload — the
 * caller still owns the confirm-dialog UX and the success/error toast.
 */
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean; id: string }>(`admin/users/${id}`),
    // Matches every ["admin", "users", status] entry regardless of which
    // tab's status filter it was fetched under — the row needs to disappear
    // from "active" and (once refetched) appear under "deleted".
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

/** Pending self-service account-reactivation requests. */
export function useReactivationRequests() {
  return useQuery({
    queryKey: ["admin", "reactivations"],
    queryFn: () => api.get<AdminReactivationRequestsResponse>("admin/reactivations"),
  });
}

export function useApproveReactivation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ success: boolean; id: string }>(`admin/reactivations/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reactivations"] }),
  });
}

export function useRejectReactivation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ success: boolean; id: string }>(`admin/reactivations/${id}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reactivations"] }),
  });
}
