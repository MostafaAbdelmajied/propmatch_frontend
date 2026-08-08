"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";

/** Mirrors the backend `SUSPENSION_REASONS` codes + Arabic labels. */
export const SUSPENSION_REASONS: { code: string; label: string }[] = [
  { code: "SPAM", label: "رسائل مزعجة أو إعلانات مكررة" },
  { code: "FRAUD", label: "احتيال أو نصب" },
  { code: "FAKE_LISTING", label: "إعلان وهمي أو بيانات مضللة" },
  { code: "HARASSMENT", label: "تحرش أو إساءة تجاه المستخدمين" },
  { code: "IDENTITY_ABUSE", label: "انتحال هوية أو إساءة استخدام التوثيق" },
  { code: "TERMS_VIOLATION", label: "مخالفة شروط الاستخدام" },
  { code: "OTHER", label: "أخرى" },
];

/** Preset durations; `days: null` = permanent. */
export const SUSPENSION_DURATIONS: { days: number | null; label: string }[] = [
  { days: 1, label: "يوم واحد" },
  { days: 3, label: "3 أيام" },
  { days: 7, label: "7 أيام" },
  { days: 30, label: "30 يوم" },
  { days: null, label: "دائم" },
];

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  suspended: boolean;
  suspendedUntil: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  suspensionReasonLabel: string | null;
  suspensionNote: string | null;
}

export interface AdminUsersResponse {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export function useAdminUsers(search: string, page = 1) {
  return useQuery({
    queryKey: ["admin", "users", search, page],
    queryFn: () =>
      api.get<AdminUsersResponse>(
        `admin/users?search=${encodeURIComponent(search)}&page=${page}`,
      ),
  });
}

export interface SuspendInput {
  id: string;
  reason: string;
  durationDays: number | null;
  note?: string;
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: SuspendInput) =>
      api.post<AdminUser>(`admin/users/${id}/suspend`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useUnsuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<AdminUser>(`admin/users/${id}/unsuspend`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}
