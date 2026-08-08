"use client";

import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { cn } from "@/src/utils/cn";
import { Ban, Search, ShieldCheck, ShieldX, X } from "lucide-react";
import { useState } from "react";
import {
  SUSPENSION_DURATIONS,
  SUSPENSION_REASONS,
  useAdminUsers,
  useSuspendUser,
  useUnsuspendUser,
  type AdminUser,
} from "../hooks/useAdminUsers";

const roleLabel: Record<string, string> = {
  tenant: "مستأجر",
  TENANT: "مستأجر",
  landlord: "مالك",
  LANDLORD: "مالك",
};

export function AdminUsers() {
  const toast = useToast();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const { data, isLoading, isError, refetch } = useAdminUsers(search);
  const unsuspend = useUnsuspendUser();

  const users = data?.items ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="rounded-card border border-hairline bg-surface p-5">
        <h1 className="text-h1 font-bold text-ink">إدارة المستخدمين</h1>
        <p className="mt-1 text-small text-muted">
          ابحث عن مستخدم لإيقاف حسابه عند مخالفة قواعد المنصة، أو لإلغاء إيقاف سابق.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(input.trim());
          }}
          className="mt-4 flex items-center gap-2 rounded-control border border-hairline bg-background px-3 focus-within:border-primary"
        >
          <Search className="size-4 text-muted" aria-hidden />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ابحث بالاسم أو البريد أو رقم الهاتف…"
            className="flex-1 bg-transparent py-2.5 text-body text-ink focus:outline-none"
          />
          <Button type="submit" size="sm">
            بحث
          </Button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : users.length === 0 ? (
        <EmptyState title="لا يوجد مستخدمون" description="جرّب كلمات بحث مختلفة." />
      ) : (
        <ul className="flex flex-col gap-3">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink">{user.fullName}</span>
                  <span className="rounded-pill bg-background px-2 py-0.5 text-caption text-muted">
                    {roleLabel[user.role] ?? user.role}
                  </span>
                  {user.suspended && (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-error-tint px-2 py-0.5 text-caption font-bold text-error">
                      <Ban className="size-3" aria-hidden />
                      موقوف
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-small text-muted">{user.email} · {user.phoneNumber}</p>
                {user.suspended && (
                  <p className="mt-1 text-caption text-error">
                    {user.suspendedUntil
                      ? `موقوف حتى ${user.suspendedUntil.slice(0, 10)}`
                      : "إيقاف دائم"}
                    {user.suspensionReasonLabel && ` — ${user.suspensionReasonLabel}`}
                    {user.suspensionNote && ` (${user.suspensionNote})`}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {user.suspended ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={unsuspend.isPending && unsuspend.variables === user.id}
                    onClick={() =>
                      unsuspend.mutate(user.id, {
                        onSuccess: () => toast("success", "تم إلغاء إيقاف الحساب"),
                        onError: (e) => toast("error", (e as Error).message),
                      })
                    }
                  >
                    <ShieldCheck className="size-4" aria-hidden />
                    إلغاء الإيقاف
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setSuspendTarget(user)}
                  >
                    <ShieldX className="size-4" aria-hidden />
                    إيقاف الحساب
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {suspendTarget && (
        <SuspendModal
          user={suspendTarget}
          onClose={() => setSuspendTarget(null)}
        />
      )}
    </div>
  );
}

function SuspendModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
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
        onError: (e) => toast("error", (e as Error).message),
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
              <p className="text-caption text-muted">{user.fullName} · {user.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="text-muted hover:text-ink">
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
                <option key={r.code} value={r.code}>{r.label}</option>
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
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button variant="danger" loading={suspend.isPending} onClick={confirm}>
            تأكيد الإيقاف
          </Button>
        </div>
      </div>
    </div>
  );
}
