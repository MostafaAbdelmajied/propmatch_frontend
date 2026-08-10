"use client";

import Link from "next/link";
import { CheckCircle2, FileText, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import type { ContractListResponse, ContractReviewStatus } from "@/src/lib/api/contracts/contract";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";

const labels: Record<ContractReviewStatus, string> = {
  PENDING_REVIEW: "في انتظار مراجعة المستأجر",
  CHANGES_REQUESTED: "مطلوب تعديلات",
  REVIEW_CONFIRMED: "تم تأكيد مراجعة المسودة",
};

export function MyContracts() {
  const query = useQuery({
    queryKey: ["contracts"],
    queryFn: () => api.get<ContractListResponse>("contracts"),
  });
  if (query.isLoading)
    return (
      <div className="p-6">
        <p>بنحمّل عقودك...</p>
        <Skeleton className="mt-3 h-32 w-full" />
      </div>
    );
  if (query.isError)
    return (
      <ErrorState
        message="مقدرناش نحمّل العقود حاليًا. حاول مرة تانية."
        onRetry={() => query.refetch()}
      />
    );
  if (!query.data?.items.length)
    return (
      <EmptyState
        title="مفيش عقود عندك حاليًا"
        description="العقود المرتبطة باتصالات مكتملة هتظهر هنا بعد إنشاء مسودة العقد."
      />
    );

  return (
    <section dir="rtl" className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <header className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary-tint text-primary">
            <FileText className="size-5" />
          </span>
          <div>
            <h1 className="text-h1 font-bold">عقودي</h1>
            <p className="text-small text-muted">
              تابع مسودات الإيجار، التعديلات المطلوبة، وحالة المراجعة.
            </p>
          </div>
        </div>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {query.data.items.map((contract) => {
          const completed = contract.status === "generated";
          return (
            <Link
              key={contract.id}
              href={`/contracts/${contract.id}`}
              className="group rounded-card border border-hairline bg-surface p-5 transition hover:border-primary/40 hover:shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-ink">{contract.propertyTitle}</h2>
                  <p className="mt-1 text-small text-muted">{contract.propertyAddress}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-pill bg-primary-tint px-2 py-1 text-caption font-semibold text-primary">
                  {completed && <CheckCircle2 className="size-3.5" aria-hidden />}
                  {completed ? "مكتمل" : "مسودة"}
                </span>
              </div>
              <p className="mt-4 text-body font-semibold text-ink">
                {contract.rentAmount.toLocaleString("ar-EG")} ج.م شهريًا
              </p>
              <p className="mt-1 text-small text-body-text">
                {contract.startDate.slice(0, 10)} إلى {contract.endDate.slice(0, 10)}
              </p>
              <p className="mt-3 text-small text-body-text">
                المالك: {contract.ownerName} · المستأجر: {contract.tenantName}
              </p>
              <div className="mt-4 border-t border-hairline pt-3">
                <p className="text-small font-semibold text-primary">
                  {completed ? "تم اعتماد العقد" : labels[contract.tenantReviewStatus]}
                </p>
                <p className="mt-1 text-caption text-muted">
                  آخر تحديث {new Date(contract.updatedAt).toLocaleDateString("ar-EG")}
                </p>
                {contract.canEdit && (
                  <p className="mt-2 text-small font-semibold text-ink">يمكنك تعديل المسودة</p>
                )}
                {completed && (
                  <p className="mt-3 flex items-center gap-1.5 text-small font-semibold text-ink">
                    <Star className="size-4 text-warning" aria-hidden />
                    {contract.hasSubmittedUserReview
                      ? "تم إرسال تقييمك للطرف الآخر"
                      : "افتح العقد لتقييم الطرف الآخر"}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
