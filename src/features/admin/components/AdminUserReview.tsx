"use client";

/* eslint-disable @next/next/no-img-element -- KYC documents use protected URLs that the Next image optimizer cannot fetch. */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X, ArrowRight, FileText, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { useKycReview, useReviewKyc } from "../hooks/useAdmin";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { OwnershipDisclaimer } from "@/src/components/ui/VerifiedBadge";
import { useToast } from "@/src/components/ui/Toast";
import { TextAreaField } from "@/src/components/ui/Field";
import { formatDate } from "@/src/utils/format";

const kycImageLabels = {
  nationalIdFrontUrl: "صورة البطاقة — الوجه الأمامي",
  nationalIdBackUrl: "صورة البطاقة — الوجه الخلفي",
  selfieUrl: "الصورة الشخصية",
} as const;

interface KycGalleryImage {
  label: string;
  url: string;
}

export function AdminUserReview({ userId }: { userId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { data, isLoading } = useKycReview(userId);
  const review = useReviewKyc(userId);
  const [rejectionReason, setRejectionReason] = useState("");
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  function decide(decision: "approve" | "reject") {
    if (decision === "reject" && rejectionReason.trim().length < 3) {
      toast("error", "اكتب سبب الرفض أولًا");
      return;
    }
    review.mutate(
      {
        decision: { decision, reason: decision === "reject" ? rejectionReason.trim() : undefined },
      },
      {
        onSuccess: () => {
          toast("success", decision === "approve" ? "تم توثيق هوية المستخدم" : "تم رفض التوثيق");
          router.push("/admin");
        },
        onError: (err) => {
          toast(err.conflict ? "info" : "error", err.message);
          if (err.conflict) router.push("/admin");
        },
      },
    );
  }

  if (isLoading || !data) return <Skeleton className="h-80 w-full" />;

  const images: KycGalleryImage[] = [
    { label: kycImageLabels.nationalIdFrontUrl, url: data.nationalIdFrontUrl },
    { label: kycImageLabels.nationalIdBackUrl, url: data.nationalIdBackUrl },
    { label: kycImageLabels.selfieUrl, url: data.selfieUrl },
  ];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <Button variant="ghost" onClick={() => router.push("/admin")} className="self-start">
        <ArrowRight className="size-4" aria-hidden />
        رجوع للطابور
      </Button>

      <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary-tint text-primary">
            <FileText className="size-6" aria-hidden />
          </span>
          <h1 className="text-title font-bold text-ink">مراجعة مستندات التوثيق</h1>
        </div>

        <dl className="flex flex-col gap-3 border-t border-hairline pt-4 text-body">
          <Row label="المستخدم" value={data.userName} />
          {/* The only screen that may show the full national ID (rbac.md). */}
          <Row label="الرقم القومي" value={data.nationalId} ltr />
          <Row label="تاريخ الإرسال" value={formatDate(data.submittedAt)} />
        </dl>

        {/* ID images: reviewed here only, never sent to any AI/LLM and never
            stored in the vector DB (build prompt §6). */}
        <div className="grid grid-cols-3 gap-2">
          {images.map(({ label, url }, index) => (
            <KycImage key={label} label={label} url={url} onOpen={() => setGalleryIndex(index)} />
          ))}
        </div>

        <OwnershipDisclaimer />

        <TextAreaField
          label="سبب الرفض"
          required
          placeholder="اكتب ما يحتاج المستخدم لتصحيحه عند الرفض"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />

        <div className="flex gap-3">
          <Button
            onClick={() => decide("approve")}
            loading={review.isPending}
            className="flex-1 bg-success hover:bg-success/90"
          >
            <Check className="size-4" aria-hidden />
            موافقة
          </Button>
          <Button
            variant="danger"
            onClick={() => decide("reject")}
            loading={review.isPending}
            className="flex-1"
          >
            <X className="size-4" aria-hidden />
            رفض
          </Button>
        </div>
      </div>

      {galleryIndex !== null && (
        <KycImageGallery
          images={images}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}
    </div>
  );
}

function KycImage({ label, url, onOpen }: KycGalleryImage & { onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <figure className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onOpen}
        disabled={failed}
        aria-label={`عرض ${label} بحجم كبير`}
        className="group relative aspect-square overflow-hidden rounded-control border border-hairline bg-surface transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed"
      >
        {!loaded && !failed && (
          <span className="absolute inset-0 grid place-items-center text-caption text-muted">
            جارٍ تحميل الصورة
          </span>
        )}
        {failed ? (
          <span className="grid h-full place-items-center text-caption text-muted">
            تعذر تحميل الصورة
          </span>
        ) : (
          <>
            <img
              src={url}
              alt={label}
              referrerPolicy="no-referrer"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={`h-full w-full object-contain transition-transform group-hover:scale-[1.03] ${loaded ? "" : "opacity-0"}`}
            />
            {loaded && (
              <span
                className="absolute bottom-2 end-2 grid size-8 place-items-center rounded-full bg-ink/70 text-white shadow-sm"
                aria-hidden
              >
                <Maximize2 className="size-4" />
              </span>
            )}
          </>
        )}
      </button>
      <figcaption className="text-caption text-muted">{label}</figcaption>
    </figure>
  );
}

function KycImageGallery({
  images,
  initialIndex,
  onClose,
}: {
  images: KycGalleryImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [failed, setFailed] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const currentImage = images[currentIndex];

  const showPrevious = useCallback(() => {
    setFailed(false);
    setCurrentIndex((index) => (index - 1 + images.length) % images.length);
  }, [images.length]);

  const showNext = useCallback(() => {
    setFailed(false);
    setCurrentIndex((index) => (index + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") showPrevious();
      if (event.key === "ArrowLeft") showNext();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, showNext, showPrevious]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kyc-gallery-title"
      className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4 text-white backdrop-blur-md md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className="flex items-center justify-between gap-4 border-b border-white/15 pb-3">
        <div className="min-w-0">
          <h2 id="kyc-gallery-title" className="truncate text-body font-bold">
            {currentImage.label}
          </h2>
          <p className="mt-1 text-caption text-white/70">
            {currentIndex + 1} من {images.length}
          </p>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="إغلاق معرض صور التوثيق"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="size-6" aria-hidden />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center py-4">
        {failed ? (
          <p className="text-body text-white/70">تعذر تحميل الصورة</p>
        ) : (
          <img
            key={currentImage.url}
            src={currentImage.url}
            alt={currentImage.label}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="max-h-full max-w-full rounded-control object-contain shadow-2xl"
          />
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="الصورة السابقة"
              className="absolute start-0 grid size-11 place-items-center rounded-full bg-black/60 transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:start-4"
            >
              <ChevronRight className="size-7" aria-hidden />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="الصورة التالية"
              className="absolute end-0 grid size-11 place-items-center rounded-full bg-black/60 transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:end-4"
            >
              <ChevronLeft className="size-7" aria-hidden />
            </button>
          </>
        )}
      </div>

      <div className="flex justify-center gap-2 overflow-x-auto border-t border-white/15 pt-3">
        {images.map((image, index) => (
          <button
            key={image.label}
            type="button"
            onClick={() => {
              setFailed(false);
              setCurrentIndex(index);
            }}
            aria-label={`عرض ${image.label}`}
            aria-current={index === currentIndex ? "true" : undefined}
            className={`h-16 w-20 shrink-0 overflow-hidden rounded-control border-2 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              index === currentIndex
                ? "border-primary opacity-100"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <img
              src={image.url}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, ltr }: { label: string; value: string | null; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-bold text-ink" dir={ltr ? "ltr" : undefined}>
        {value ?? "—"}
      </dd>
    </div>
  );
}
