"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, AlertTriangle, BedDouble, MapPin, Sofa } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { ErrorState } from "@/src/components/ui/States";
import { VerifiedBadge } from "@/src/components/ui/VerifiedBadge";
import { useToast } from "@/src/components/ui/Toast";
import { formatEGP, formatNumber, formatDate } from "@/src/utils/format";
import { propertyTypeLabels } from "@/src/lib/api/contracts/property";
import { TenantRequestStatusChip } from "@/src/features/matching/components/StatusPills";
import { useAdminTenantRequest, useReviewTenantRequest } from "../hooks/useAdmin";
import { ModerationBar } from "./ModerationBar";

/**
 * PRO-08 — tenant-request moderation. Approval publishes the request to every
 * verified landlord (SRS 3.2.2), which is why it's gated at all: this is the
 * anti-spam checkpoint, and the human read of the free text is where PII the
 * tenant typed gets caught (ASSUMPTIONS.md #20).
 */
export function AdminRequestReview({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { data: request, isLoading, isError, refetch } = useAdminTenantRequest(id);
  const review = useReviewTenantRequest(id);

  function decide(decision: "approve" | "reject", reason?: string) {
    review.mutate(
      { decision: { decision, reason } },
      {
        onSuccess: () => {
          toast("success", decision === "approve" ? "تم نشر الطلب للملّاك" : "تم رفض الطلب");
          router.push("/admin");
        },
        onError: (err) => {
          toast(err.conflict ? "info" : "error", err.message);
          if (err.conflict) router.push("/admin");
        },
      },
    );
  }

  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (isLoading || !request) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/admin")}>
          <ArrowRight className="size-4" aria-hidden />
          رجوع للطابور
        </Button>
        <p className="text-caption text-muted">الموافقة تنشر الطلب لكل مالك موثّق.</p>
      </div>

      <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-title font-bold text-ink">
              {propertyTypeLabels[request.propertyType]} · {formatEGP(request.minBudget)} –{" "}
              {formatEGP(request.maxBudget)}
            </h1>
            <p className="mt-1 flex items-center gap-1 text-small text-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {request.preferredLocations}
            </p>
          </div>
          <span className="text-caption text-muted">{formatDate(request.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2 border-t border-hairline pt-3">
          <span className="text-small font-semibold text-ink">{request.tenantName}</span>
          <VerifiedBadge status={request.tenantVerificationStatus === "APPROVED" ? "APPROVED" : "NOT_SUBMITTED"} />
          <TenantRequestStatusChip status={request.status} />
        </div>

        <dl className="grid gap-3 border-t border-hairline pt-3 text-small sm:grid-cols-3">
          <div className="flex items-center gap-1.5 text-body-text">
            <BedDouble className="size-4 text-muted" aria-hidden />
            <dt className="sr-only">غرف النوم</dt>
            <dd>{formatNumber(request.requiredBedrooms)} غرف</dd>
          </div>
          <div className="flex items-center gap-1.5 text-body-text">
            <Sofa className="size-4 text-muted" aria-hidden />
            <dt className="sr-only">الفرش</dt>
            <dd>{request.needsFurnished ? "يريد مفروش" : "غير مفروش"}</dd>
          </div>
          <div className="text-body-text">
            <dt className="sr-only">المرونة</dt>
            <dd>مرونة {formatNumber(request.flexibilityScore)}/{formatNumber(10)}</dd>
          </div>
        </dl>

        <div className="border-t border-hairline pt-3">
          <h2 className="text-small font-semibold text-ink">نص الطلب (يُستخدم في المطابقة الذكية)</h2>
          <p className="mt-1.5 whitespace-pre-line rounded-control bg-background p-3 text-small leading-relaxed text-body-text">
            {request.lifestyleRequirements}
          </p>
        </div>

        <p className="flex items-start gap-2 rounded-control bg-pending-tint px-3.5 py-2.5 text-caption leading-relaxed text-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-pending" aria-hidden />
          راجع النص بحثًا عن بيانات شخصية (رقم هاتف، بريد، عنوان دقيق) — هذا الطلب سيُنشر للملّاك.
        </p>
      </section>

      <ModerationBar
        onDecide={decide}
        pending={review.isPending}
        alreadyReviewed={request.status !== "PENDING"}
        reviewedText="تمت مراجعة هذا الطلب بالفعل."
        rejectHint="اكتب سبب الرفض ليظهر للمستأجر…"
      />
    </div>
  );
}
