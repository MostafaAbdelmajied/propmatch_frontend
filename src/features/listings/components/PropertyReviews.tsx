"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, Star } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Sheet } from "@/src/components/ui/Sheet";
import { TextAreaField } from "@/src/components/ui/Field";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/components/ui/Toast";
import { useSession } from "@/src/features/auth/hooks/useSession";
import { cn } from "@/src/utils/cn";
import { formatNumber, formatRelativeTime } from "@/src/utils/format";
import { CreateReviewRequestSchema } from "@/src/lib/api/contracts/review";
import { useCreateReview, usePropertyReviews } from "../hooks/useReviews";

/**
 * ERD `PROPERTY_REVIEW` (SRS 3.7). The list is APPROVED-only — the backend
 * filters it, so a PENDING review is simply absent rather than hidden here.
 * Any tenant may review any property; moderation is the spam control
 * (ASSUMPTIONS.md #15).
 */
export function PropertyReviews({ propertyId }: { propertyId: string }) {
  const { data: session } = useSession();
  const { data, isLoading } = usePropertyReviews(propertyId);
  const [open, setOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-40 w-full rounded-card" />;

  const total = data?.total ?? 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-title font-bold text-ink">
          التقييمات {total > 0 && <span className="text-muted">({formatNumber(total)})</span>}
        </h2>
        {session?.role === "tenant" && (
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <MessageSquarePlus className="size-4" aria-hidden />
            أضف تقييمًا
          </Button>
        )}
      </div>

      {total === 0 || !data ? (
        <p className="rounded-card border border-dashed border-hairline bg-surface px-4 py-6 text-center text-small text-muted">
          لا توجد تقييمات بعد لهذا العقار.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="text-center">
              <p className="text-h1 font-bold text-ink">{formatNumber(data.averageRating ?? 0)}</p>
              <Stars rating={Math.round(data.averageRating ?? 0)} />
              <p className="mt-1 text-caption text-muted">{formatNumber(total)} تقييم</p>
            </div>
            <ul className="flex flex-1 flex-col gap-1">
              {data.distribution.map(({ rating, count }) => (
                <li key={rating} className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-caption text-muted">{formatNumber(rating)} ★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-pill bg-background">
                    <span
                      className="block h-full rounded-pill bg-pending"
                      style={{ width: total ? `${(count / total) * 100}%` : 0 }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-caption text-muted">{formatNumber(count)}</span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="flex flex-col gap-3">
            {data.items.map((review) => (
              <li key={review.id} className="rounded-card border border-hairline bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-small font-bold text-ink">{review.reviewerName}</span>
                  <span className="text-caption text-muted">{formatRelativeTime(review.createdAt)}</span>
                </div>
                <Stars rating={review.rating} className="mt-1" />
                <p className="mt-2 text-small leading-relaxed text-body-text">{review.comment}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <ReviewSheet propertyId={propertyId} open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

function ReviewSheet({ propertyId, open, onClose }: { propertyId: string; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateReview(propertyId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const parsed = CreateReviewRequestSchema.safeParse({ propertyId, rating, comment });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    create.mutate(parsed.data, {
      onSuccess: () => {
        // PENDING — it won't appear until an admin approves it (PRO-08).
        toast("success", "تم إرسال تقييمك للمراجعة");
        setRating(0);
        setComment("");
        onClose();
      },
      onError: (e) => {
        if (e.code === "VERIFICATION_REQUIRED") {
          toast("info", "وثّق هويتك أولًا لإضافة تقييم");
          router.push("/verify");
        } else {
          toast("error", e.message);
        }
      },
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="أضف تقييمًا" dismissible={!create.isPending}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-small font-semibold text-ink">
            تقييمك <span className="text-error">*</span>
          </span>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="التقييم">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${formatNumber(n)} من ${formatNumber(5)}`}
                onClick={() => setRating(n)}
                className="rounded p-0.5 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Star className={cn("size-7", n <= rating ? "fill-pending text-pending" : "text-hairline")} aria-hidden />
              </button>
            ))}
          </div>
        </div>

        <TextAreaField
          label="تعليقك"
          required
          placeholder="اكتب تجربتك مع هذا العقار…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {error && (
          <p className="text-caption text-error" role="alert">
            {error}
          </p>
        )}

        <p className="rounded-control bg-trust-blue-tint px-3.5 py-2.5 text-caption leading-relaxed text-body-text">
          تُراجَع التقييمات قبل نشرها، ولن يظهر تقييمك على صفحة العقار فورًا.
        </p>

        <Button block size="lg" onClick={submit} loading={create.isPending}>
          إرسال للمراجعة
        </Button>
      </div>
    </Sheet>
  );
}

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${formatNumber(rating)} من ${formatNumber(5)}`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-4", i <= rating ? "fill-pending text-pending" : "text-hairline")} aria-hidden />
      ))}
    </span>
  );
}
