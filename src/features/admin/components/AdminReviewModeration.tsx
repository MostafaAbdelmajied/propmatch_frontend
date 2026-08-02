"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { ErrorState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { cn } from "@/src/utils/cn";
import { formatDate, formatNumber } from "@/src/utils/format";
import { useAdminReview, useModerateReview } from "../hooks/useAdmin";
import { ModerationBar } from "./ModerationBar";

/**
 * PRO-08 — property-review moderation (SRS 3.7). Reviews enter PENDING and are
 * invisible until approved; moderation is the only spam control, since any
 * tenant may review any property (ASSUMPTIONS.md #15).
 */
export function AdminReviewModeration({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { data: review, isLoading, isError, refetch } = useAdminReview(id);
  const moderate = useModerateReview(id);

  function decide(decision: "approve" | "reject", reason?: string) {
    moderate.mutate(
      { decision: { decision, reason } },
      {
        onSuccess: () => {
          toast("success", decision === "approve" ? "تم نشر التقييم" : "تم رفض التقييم");
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
  if (isLoading || !review) return <Skeleton className="h-80 w-full" />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/admin")}>
          <ArrowRight className="size-4" aria-hidden />
          رجوع للطابور
        </Button>
        <p className="text-caption text-muted">التقييمات الموافق عليها فقط تظهر على صفحة العقار.</p>
      </div>

      <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-caption text-muted">تقييم على</p>
            <Link
              href={`/admin/properties/${review.propertyId}`}
              className="text-title font-bold text-ink hover:text-primary"
            >
              {review.propertyTitle}
            </Link>
          </div>
          <span className="text-caption text-muted">{formatDate(review.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2 border-t border-hairline pt-3">
          <Stars rating={review.rating} />
          <span className="text-small font-semibold text-ink">{formatNumber(review.rating)}/{formatNumber(5)}</span>
          <span className="text-small text-muted">— {review.reviewerName}</span>
        </div>

        <p className="whitespace-pre-line rounded-control bg-background p-3 text-small leading-relaxed text-body-text">
          {review.comment}
        </p>
      </section>

      <ModerationBar
        onDecide={decide}
        pending={moderate.isPending}
        alreadyReviewed={review.status !== "PENDING"}
        reviewedText="تمت مراجعة هذا التقييم بالفعل."
        rejectHint="اكتب سبب الرفض (لن يُنشر التقييم)…"
      />
    </div>
  );
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-0.5", className)} role="img" aria-label={`${formatNumber(rating)} من ${formatNumber(5)}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn("size-4", i <= rating ? "fill-pending text-pending" : "text-hairline")}
          aria-hidden
        />
      ))}
    </span>
  );
}
