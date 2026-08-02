"use client";

import Link from "next/link";
import { BedDouble, Inbox, MapPin, Plus, Sofa, Archive, ShieldQuestion } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { formatEGP, formatNumber, formatRelativeTime } from "@/src/utils/format";
import { propertyTypeLabels } from "@/src/lib/api/contracts/property";
import type { TenantRequest } from "@/src/lib/api/contracts/tenantRequest";
import { useSession } from "@/src/features/auth/hooks/useSession";
import { useCloseTenantRequest, useMyTenantRequests } from "../hooks/useTenantRequests";
import { TenantRequestStatusChip } from "./StatusPills";

/** PRO-05 — the tenant's own requests and how many offers each has drawn. */
export function TenantRequestList() {
  const { data, isLoading, isError, refetch } = useMyTenantRequests();
  const { data: session } = useSession();
  const unverified = session && session.verificationStatus !== "APPROVED";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold text-ink">طلباتي</h1>
          <p className="mt-1 text-small text-muted">اطلب سكنك ودع الملّاك الموثّقين يتقدّمون إليك.</p>
        </div>
        <Link href="/tenant/requests/new">
          <Button>
            <Plus className="size-4" aria-hidden />
            طلب جديد
          </Button>
        </Link>
      </div>

      {unverified && (
        <Link
          href="/verify"
          className="flex items-center gap-3 rounded-card border border-pending/30 bg-pending-tint px-4 py-3"
        >
          <ShieldQuestion className="size-5 shrink-0 text-pending" aria-hidden />
          <span className="flex-1 text-small font-semibold text-ink">
            وثّق هويتك لتتمكن من نشر طلبك وقبول العروض
          </span>
          <span className="text-small font-semibold text-primary">ابدأ التوثيق</span>
        </Link>
      )}

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-card" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          Icon={Inbox}
          title="لا توجد طلبات بعد"
          description="اكتب ما تبحث عنه مرة واحدة، ويصلك عرض من الملّاك مباشرة."
          action={
            <Link href="/tenant/requests/new">
              <Button>
                <Plus className="size-4" aria-hidden />
                اطلب سكنك
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((request) => (
            <li key={request.id}>
              <RequestRow request={request} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestRow({ request }: { request: TenantRequest }) {
  const toast = useToast();
  const close = useCloseTenantRequest();
  const closable = request.status === "PENDING" || request.status === "APPROVED";

  return (
    <article className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-body font-bold text-ink">
            {propertyTypeLabels[request.propertyType]} · {formatEGP(request.minBudget)} –{" "}
            {formatEGP(request.maxBudget)}
          </h2>
          <p className="mt-0.5 flex items-center gap-1 text-small text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {request.preferredLocations}
          </p>
        </div>
        <TenantRequestStatusChip status={request.status} />
      </div>

      <p className="line-clamp-2 text-small leading-relaxed text-body-text">{request.lifestyleRequirements}</p>

      {request.status === "REJECTED" && request.rejectionReason && (
        <p className="rounded-control bg-error-tint px-3 py-2 text-caption text-error" role="alert">
          سبب الرفض: {request.rejectionReason}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-3 text-caption text-muted">
        <span className="flex items-center gap-1">
          <BedDouble className="size-3.5" aria-hidden />
          {formatNumber(request.requiredBedrooms)} غرف
        </span>
        {request.needsFurnished && (
          <span className="flex items-center gap-1">
            <Sofa className="size-3.5" aria-hidden />
            مفروش
          </span>
        )}
        <span>مرونة {formatNumber(request.flexibilityScore)}/{formatNumber(10)}</span>
        <span>{formatRelativeTime(request.createdAt)}</span>
        <div className="ms-auto flex items-center gap-2">
          {request.offersCount > 0 && (
            <Link href="/tenant/offers" className="text-caption font-bold text-primary hover:underline">
              {formatNumber(request.offersCount)} عروض واردة
            </Link>
          )}
          {closable && (
            <Button
              variant="ghost"
              size="sm"
              loading={close.isPending}
              onClick={() =>
                close.mutate(request.id, {
                  onSuccess: () => toast("success", "تم إغلاق الطلب"),
                  onError: () => toast("error", "تعذر إغلاق الطلب، حاول مرة أخرى"),
                })
              }
            >
              <Archive className="size-3.5" aria-hidden />
              إغلاق
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
