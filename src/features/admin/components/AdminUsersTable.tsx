"use client";

import { useState } from "react";
import { Ban, Search, ShieldAlert, ShieldCheck, ShieldX, Trash2, Users, X } from "lucide-react";
import {
  useAdminUsers,
  useDeleteUser,
  useAdminSession,
  useSuspendUser,
  useUnsuspendUser,
} from "../hooks/useTeam";
import { SUSPENSION_DURATIONS, SUSPENSION_REASONS } from "../hooks/useAdminUsers";
import { Button } from "@/src/components/ui/Button";
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

type TabValue = "active" | "suspended" | "deleted";

const statusTabs: { value: TabValue; label: string }[] = [
  { value: "active", label: "نشط" },
  { value: "suspended", label: "موقوف" },
  { value: "deleted", label: "معلّق / محذوف" },
];

const PAGE_SIZE = 20;

export function AdminUsersTable() {
  const toast = useToast();
  const { data: session } = useAdminSession();
  const [tab, setTab] = useState<TabValue>("active");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const canSuspend = session?.capabilities.includes("user:suspend") ?? false;
  const canDelete = session?.capabilities.includes("user:delete") ?? false;

  const { data, isPending, isFetching, isError, refetch } = useAdminUsers({
    status: tab,
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const deleteUser = useDeleteUser();

  const [deleteTarget, setDeleteTarget] = useState<AdminUserListItem | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUserListItem | null>(null);
  const unsuspend = useUnsuspendUser();

  // The layout already blocks non-admins; this guards the sub-capability —
  // same pattern as AdminTeam's canManage check. Either capability is enough
  // to view the shared list; individual actions stay gated below.
  if (session && !canSuspend && !canDelete) {
    return (
      <EmptyState
        Icon={ShieldAlert}
        title="لا تملك صلاحية إدارة المستخدمين"
        description="هذا القسم متاح لأصحاب صلاحية user:suspend أو user:delete."
      />
    );
  }

  const items = data?.items ?? [];
  const loading = isPending || isFetching;

  function changeTab(next: TabValue) {
    setTab(next);
    setPage(1);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(input.trim());
    setPage(1);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast("success", `تم حذف حساب ${deleteTarget.fullName}`);
        setDeleteTarget(null);
      },
      onError: () => {
        toast("error", "تعذر حذف المستخدم");
        setDeleteTarget(null);
      },
    });
  }

  function confirmUnsuspend(user: AdminUserListItem) {
    unsuspend.mutate(user.id, {
      onSuccess: () => toast("success", "تم إلغاء إيقاف الحساب"),
      onError: () => toast("error", "تعذر إلغاء الإيقاف"),
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
          حذف المستخدم يؤرشف طلباته وعقاراته تلقائيًا ولا يحذفها نهائيًا. الإيقاف حالة مؤقتة أو
          دائمة قابلة للإلغاء في أي وقت.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status tabs */}
        <div
          role="tablist"
          className="flex w-fit rounded-pill border border-hairline bg-surface p-1"
        >
          {statusTabs.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => changeTab(t.value)}
              className={cn(
                "rounded-pill px-4 py-1.5 text-small font-semibold transition-colors",
                tab === t.value ? "bg-primary text-white" : "text-muted hover:bg-background",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={submitSearch}
          className="flex items-center gap-2 rounded-control border border-hairline bg-background px-3 focus-within:border-primary sm:w-72"
        >
          <Search className="size-4 shrink-0 text-muted" aria-hidden />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ابحث بالاسم أو البريد أو رقم الهاتف…"
            className="w-full bg-transparent py-2 text-small text-ink focus:outline-none"
          />
          <Button type="submit" size="sm" variant="ghost" className="shrink-0">
            بحث
          </Button>
        </form>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          Icon={Users}
          title={
            tab === "deleted"
              ? "لا يوجد حسابات معلّقة أو محذوفة"
              : tab === "suspended"
                ? "لا يوجد حسابات موقوفة"
                : "لا يوجد مستخدمون"
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-hairline">
          <table className="w-full min-w-[720px] text-start text-small">
            <thead className="bg-background text-caption text-muted">
              <tr>
                <th className="p-3 text-start font-semibold">المستخدم</th>
                <th className="p-3 text-start font-semibold">النوع</th>
                <th className="p-3 text-start font-semibold">تاريخ الانضمام</th>
                <th className="p-3 text-start font-semibold">الحالة</th>
                {tab === "suspended" && (
                  <>
                    <th className="p-3 text-start font-semibold">ينتهي الإيقاف</th>
                    <th className="p-3 text-start font-semibold">السبب</th>
                  </>
                )}
                {tab === "deleted" && <th className="p-3 text-start font-semibold">تاريخ الحذف</th>}
                <th className="p-3 text-start font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => (
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
                        user.deletedAt || user.suspended
                          ? "bg-error-tint text-error"
                          : user.isActive
                            ? "bg-success-tint text-success"
                            : "bg-error-tint text-error",
                      )}
                    >
                      {user.deletedAt
                        ? "معلّق"
                        : user.suspended
                          ? "موقوف"
                          : user.isActive
                            ? "نشط"
                            : "معطّل"}
                    </span>
                  </td>
                  {tab === "suspended" && (
                    <>
                      <td className="p-3 text-muted">
                        {user.suspendedUntil ? formatDate(user.suspendedUntil) : "دائم"}
                      </td>
                      <td className="p-3 text-muted">{user.suspensionReasonLabel ?? "—"}</td>
                    </>
                  )}
                  {tab === "deleted" && (
                    <td className="p-3 text-muted">
                      {user.deletedAt ? formatDate(user.deletedAt) : "—"}
                    </td>
                  )}
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {user.role !== "ADMIN" && !user.deletedAt && canSuspend && (
                        <button
                          type="button"
                          title={user.suspended ? "إلغاء إيقاف المستخدم" : "إيقاف المستخدم"}
                          onClick={() =>
                            user.suspended ? confirmUnsuspend(user) : setSuspendTarget(user)
                          }
                          disabled={unsuspend.isPending && unsuspend.variables === user.id}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-control hover:bg-background",
                            user.suspended ? "text-success" : "text-warning",
                          )}
                        >
                          {user.suspended ? (
                            <ShieldCheck className="size-4" aria-hidden />
                          ) : (
                            <ShieldX className="size-4" aria-hidden />
                          )}
                        </button>
                      )}
                      {user.role !== "ADMIN" && !user.deletedAt && canDelete && (
                        <button
                          type="button"
                          title="حذف المستخدم"
                          onClick={() => setDeleteTarget(user)}
                          className="flex size-8 items-center justify-center rounded-control text-error hover:bg-error-tint"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (data.total ?? 0) > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            السابق
          </Button>
          <span className="text-small text-muted">
            صفحة {data.page ?? page} من {Math.max(1, Math.ceil((data.total ?? 0) / PAGE_SIZE))}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= Math.ceil((data.total ?? 0) / PAGE_SIZE)}
            onClick={() => setPage((p) => p + 1)}
          >
            التالي
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف المستخدم"
        message={
          deleteTarget
            ? `هل أنت متأكد من حذف حساب "${deleteTarget.fullName}"؟ سيتم أرشفة جميع عقاراته وطلباته.`
            : ""
        }
        confirmLabel="حذف"
        danger
        loading={deleteUser.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {suspendTarget && (
        <SuspendModal user={suspendTarget} onClose={() => setSuspendTarget(null)} />
      )}
    </div>
  );
}

function SuspendModal({ user, onClose }: { user: AdminUserListItem; onClose: () => void }) {
  const toast = useToast();
  const suspend = useSuspendUser();
  const [reason, setReason] = useState(SUSPENSION_REASONS[0].code);
  const [durationIndex, setDurationIndex] = useState(1); // default 3 days
  const [note, setNote] = useState("");

  function confirm() {
    const duration = SUSPENSION_DURATIONS[durationIndex];
    suspend.mutate(
      { id: user.id, reason, durationDays: duration.days, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast("success", `تم إيقاف حساب ${user.fullName}`);
          onClose();
        },
        onError: () => toast("error", "تعذر إيقاف المستخدم"),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-card border border-hairline bg-surface p-6 shadow-card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-full bg-error-tint text-error">
              <Ban className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-title font-bold text-ink">إيقاف حساب</h2>
              <p className="text-caption text-muted">
                {user.fullName} · {user.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="text-muted hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-small font-bold text-ink">نوع المخالفة</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-control border border-hairline bg-background px-3 py-2.5 text-body text-ink focus:border-primary focus:outline-none"
            >
              {SUSPENSION_REASONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-small font-bold text-ink">مدة الإيقاف</label>
            <div className="flex flex-wrap gap-2">
              {SUSPENSION_DURATIONS.map((d, i) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setDurationIndex(i)}
                  className={cn(
                    "rounded-pill border px-3.5 py-1.5 text-small font-semibold transition-colors",
                    i === durationIndex
                      ? "border-primary bg-primary text-white"
                      : "border-hairline bg-surface text-ink hover:border-primary/50",
                    d.days === null && i !== durationIndex && "text-error",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-small font-bold text-ink">ملاحظة (اختياري)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="تفاصيل إضافية عن المخالفة…"
              className="min-h-20 rounded-control border border-hairline bg-background px-3 py-2 text-body text-ink focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="danger" loading={suspend.isPending} onClick={confirm}>
            تأكيد الإيقاف
          </Button>
        </div>
      </div>
    </div>
  );
}
