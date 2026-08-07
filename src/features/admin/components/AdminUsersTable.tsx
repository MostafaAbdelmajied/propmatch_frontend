"use client";

import { useState } from "react";
import { Trash2, Users, ShieldAlert } from "lucide-react";
import { useAdminUsers, useDeleteUser, useAdminSession } from "../hooks/useTeam";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { useToast } from "@/src/components/ui/Toast";
import { cn } from "@/src/utils/cn";
import { formatDate } from "@/src/utils/format";
import type { AdminUserListItem } from "@/src/lib/api/contracts/admin";

const roleLabels: Record<AdminUserListItem["role"], string> = {
  TENANT: "مستأجر",
  LANDLORD: "مالك",
  ADMIN: "مشرف",
};

export function AdminUsersTable() {
  const toast = useToast();
  const { data: session } = useAdminSession();
  const { data, isLoading, isError, refetch } = useAdminUsers();
  const deleteUser = useDeleteUser();
  const [target, setTarget] = useState<AdminUserListItem | null>(null);

  const canDelete = session?.capabilities.includes("user:delete") ?? false;

  // The layout already blocks non-admins; this guards the sub-capability —
  // same pattern as AdminTeam's canManage check.
  if (session && !canDelete) {
    return (
      <EmptyState
        Icon={ShieldAlert}
        title="لا تملك صلاحية حذف المستخدمين"
        description="هذا القسم متاح لأصحاب صلاحية user:delete فقط."
      />
    );
  }

  function confirmDelete() {
    if (!target) return;
    deleteUser.mutate(target.id, {
      onSuccess: () => {
        toast("success", `تم حذف حساب ${target.fullName}`);
        setTarget(null);
      },
      onError: () => {
        toast("error", "تعذر حذف المستخدم");
        setTarget(null);
      },
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-h1 font-bold text-ink">
          <Users className="size-6 text-primary" aria-hidden />
          مستخدمو المنصة
        </h1>
        <p className="mt-1 text-small text-muted">
          حذف المستخدم يؤرشف طلباته وعقاراته تلقائيًا ولا يحذفها نهائيًا.
        </p>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState Icon={Users} title="لا يوجد مستخدمون" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-hairline">
          <table className="w-full min-w-[640px] text-start text-small">
            <thead className="bg-background text-caption text-muted">
              <tr>
                <th className="p-3 text-start font-semibold">المستخدم</th>
                <th className="p-3 text-start font-semibold">النوع</th>
                <th className="p-3 text-start font-semibold">تاريخ الانضمام</th>
                <th className="p-3 text-start font-semibold">الحالة</th>
                <th className="p-3 text-start font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => (
                <tr key={user.id} className="border-t border-hairline">
                  <td className="p-3">
                    <p className="font-bold text-ink">{user.fullName}</p>
                    <p className="text-caption text-muted">{user.email}</p>
                  </td>
                  <td className="p-3 text-muted">{roleLabels[user.role]}</td>
                  <td className="p-3 text-muted">{formatDate(user.createdAt)}</td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-caption font-semibold",
                        user.isActive ? "bg-success-tint text-success" : "bg-error-tint text-error",
                      )}
                    >
                      {user.isActive ? "نشط" : "معطّل"}
                    </span>
                  </td>
                  <td className="p-3">
                    {user.role !== "ADMIN" && (
                      <button
                        type="button"
                        title="حذف المستخدم"
                        onClick={() => setTarget(user)}
                        className="flex size-8 items-center justify-center rounded-control text-error hover:bg-error-tint"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={target !== null}
        title="حذف المستخدم"
        message={
          target
            ? `هل أنت متأكد من حذف حساب "${target.fullName}"؟ سيتم أرشفة جميع عقاراته وطلباته.`
            : ""
        }
        confirmLabel="حذف"
        danger
        loading={deleteUser.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
