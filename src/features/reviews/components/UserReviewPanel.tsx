"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { cn } from "@/src/utils/cn";
import type {
  CreateUserReview,
  UserReview,
  UserReviewDirection,
} from "@/src/lib/api/contracts/userReview";
import { useContractUserReview, useSubmitUserReview } from "../hooks/useUserReview";

type RatingKey =
  | "overallRating"
  | "communicationRating"
  | "responsivenessRating"
  | "propertyAccuracyRating"
  | "commitmentRating";

const sharedFields: { key: RatingKey; label: string }[] = [
  { key: "overallRating", label: "التقييم العام" },
  { key: "communicationRating", label: "التواصل" },
  { key: "responsivenessRating", label: "سرعة الرد" },
];

function fieldsFor(direction: UserReviewDirection) {
  return [
    ...sharedFields,
    direction === "TENANT_TO_LANDLORD"
      ? { key: "propertyAccuracyRating" as const, label: "دقة معلومات العقار" }
      : { key: "commitmentRating" as const, label: "الالتزام" },
  ];
}

function StarRating({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-hairline py-3 last:border-b-0">
      <span className="text-body font-semibold text-ink">{label}</span>
      <div
        className="flex h-9 items-center gap-1"
        role={readOnly ? undefined : "radiogroup"}
        aria-label={label}
      >
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            disabled={readOnly}
            role={readOnly ? undefined : "radio"}
            aria-checked={readOnly ? undefined : value === rating}
            aria-label={`${rating} من 5`}
            onClick={() => onChange?.(rating)}
            className="flex size-9 items-center justify-center rounded-control focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default"
          >
            <Star
              className={cn(
                "size-6",
                rating <= value ? "fill-warning text-warning" : "text-hairline",
              )}
              aria-hidden
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function SubmittedReview({ review }: { review: UserReview }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-primary">
        <CheckCircle2 className="size-5" aria-hidden />
        <p className="font-semibold">تم إرسال تقييمك</p>
      </div>
      {fieldsFor(review.direction).map((field) => (
        <StarRating key={field.key} label={field.label} value={review[field.key] ?? 0} readOnly />
      ))}
    </div>
  );
}

export function UserReviewPanel({ contractId }: { contractId: string }) {
  const query = useContractUserReview(contractId);
  const submit = useSubmitUserReview(contractId);
  const [ratings, setRatings] = useState<Partial<Record<RatingKey, number>>>({});

  const fields = useMemo(() => (query.data ? fieldsFor(query.data.direction) : []), [query.data]);
  const complete = fields.every((field) => Boolean(ratings[field.key]));

  if (query.isLoading) return <Skeleton className="h-48 w-full" />;
  if (query.isError || !query.data) {
    return (
      <section className="border-y border-hairline py-5">
        <p className="text-small text-error">تعذر تحميل التقييم حالياً.</p>
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => query.refetch()}>
          إعادة المحاولة
        </Button>
      </section>
    );
  }
  if (!query.data.eligible) return null;

  const submitReview = () => {
    if (!complete) return;
    const body: CreateUserReview = {
      overallRating: ratings.overallRating!,
      communicationRating: ratings.communicationRating!,
      responsivenessRating: ratings.responsivenessRating!,
      ...(query.data.direction === "TENANT_TO_LANDLORD"
        ? { propertyAccuracyRating: ratings.propertyAccuracyRating! }
        : { commitmentRating: ratings.commitmentRating! }),
    };
    submit.mutate(body);
  };

  return (
    <section
      className="border-y border-hairline bg-surface py-6"
      aria-labelledby="user-review-title"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="user-review-title" className="text-title font-bold text-ink">
            تقييم {query.data.revieweeName}
          </h2>
          {query.data.receivedSummary.total > 0 && (
            <p className="mt-1 text-small text-muted">
              متوسط التقييم {query.data.receivedSummary.overallRating} من 5 ·{" "}
              {query.data.receivedSummary.total} تقييم
            </p>
          )}
        </div>
      </div>

      {query.data.review ? (
        <SubmittedReview review={query.data.review} />
      ) : (
        <>
          {fields.map((field) => (
            <StarRating
              key={field.key}
              label={field.label}
              value={ratings[field.key] ?? 0}
              onChange={(value) => setRatings((current) => ({ ...current, [field.key]: value }))}
            />
          ))}
          {submit.isError && (
            <p className="mt-3 text-small text-error">تعذر إرسال التقييم. حاول مرة أخرى.</p>
          )}
          <Button
            className="mt-4"
            disabled={!complete}
            loading={submit.isPending}
            onClick={submitReview}
          >
            إرسال التقييم
          </Button>
        </>
      )}
    </section>
  );
}
