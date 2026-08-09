"use client";

import { Check, X, UserCheck, ShieldAlert } from "lucide-react";
import {
  useReactivationRequests,
  useApproveReactivation,
  useRejectReactivation,
  useAdminSession,
} from "../hooks/useTeam";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { formatRelativeTime } from "@/src/utils/format";

export function AdminReactivationRequests() {
  const toast = useToast();
  const { data: session } = useAdminSession();
  const { data, isLoading, isError, refetch } = useReactivationRequests();
  const approve = useApproveReactivation();
  const reject = useRejectReactivation();

  const canReactivate = session?.capabilities.includes("user:reactivate") ?? false;

  // The layout already blocks non-admins; this guards the sub-capability —
  // same pattern as AdminTeam/AdminUsersTable's capability checks.
  if (session && !canReactivate) {
    return (
      <EmptyState
        Icon={ShieldAlert}
        title="لا تملك صلاحية مراجعة طلبات إعادة التفعيل"
        description="هذا القسم متاح لأصحاب صلاحية user:reactivate فقط."
      />
    );
  }

  function handleApprove(id: string, name: string) {
    approve.mutate(id, {
      onSuccess: () => toast("success", `تمت الموافقة على إعادة تفعيل حساب ${name}`),
      onError: () => toast("error", "تعذر تنفيذ الموافقة"),
    });
  }

  function handleReject(id: string, name: string) {
    reject.mutate(id, {
      onSuccess: () => toast("success", `تم رفض طلب ${name}`),
      onError: () => toast("error", "تعذر تنفيذ الرفض"),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-h1 font-bold text-ink">
          <UserCheck className="size-6 text-primary" aria-hidden />
          طلبات إعادة التفعيل
        </h1>
        <p className="mt-1 text-small text-muted">
          الموافقة تعيد تفعيل الحساب فقط — عقارات المستخدم وطلباته تبقى مؤرشفة حتى ينشرها بنفسه من جديد.
        </p>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState Icon={UserCheck} title="لا توجد طلبات إعادة تفعيل قيد المراجعة" />
      ) : (
        <div className="flex flex-col gap-3">
          {data.items.map((request) => {
            const pending = approve.isPending || reject.isPending;
            return (
              <article
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline p-4"
              >
                <div>
                  <p className="font-bold text-ink">{request.userFullName}</p>
                  <p className="text-caption text-muted">{request.userEmail}</p>
                  <p className="mt-1 text-caption text-muted">
                    طلب الإعادة {formatRelativeTime(request.createdAt)}
                    {request.deletedAt && ` — حُذف الحساب ${formatRelativeTime(request.deletedAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="رفض"
                    disabled={pending}
                    onClick={() => handleReject(request.id, request.userFullName)}
                    className="flex size-9 items-center justify-center rounded-control text-error hover:bg-error-tint disabled:opacity-50"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title="موافقة"
                    disabled={pending}
                    onClick={() => handleApprove(request.id, request.userFullName)}
                    className="flex size-9 items-center justify-center rounded-control text-success hover:bg-success-tint disabled:opacity-50"
                  >
                    <Check className="size-4" aria-hidden />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
