"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X, ArrowRight, FileText } from "lucide-react";
import { useKycReview, useReviewKyc } from "../hooks/useAdmin";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { OwnershipDisclaimer } from "@/src/components/ui/VerifiedBadge";
import { useToast } from "@/src/components/ui/Toast";
import { TextAreaField } from "@/src/components/ui/Field";
import { formatDate } from "@/src/utils/format";

export function AdminUserReview({ userId }: { userId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { data, isLoading } = useKycReview(userId);
  const review = useReviewKyc(userId);
  const [rejectionReason, setRejectionReason] = useState("");

  function decide(decision: "approve" | "reject") {
    if (decision === "reject" && rejectionReason.trim().length < 3) {
      toast("error", "اكتب سبب الرفض أولًا");
      return;
    }
    review.mutate(
      { decision: { decision, reason: decision === "reject" ? rejectionReason.trim() : undefined } },
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
          {[
            { label: "صورة البطاقة — الوجه الأمامي", url: data.nationalIdFrontUrl },
            { label: "صورة البطاقة — الوجه الخلفي", url: data.nationalIdBackUrl },
            { label: "الصورة الشخصية", url: data.selfieUrl },
          ].map(({ label, url }) => <KycImage key={label} label={label} url={url} />)}
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
          <Button onClick={() => decide("approve")} loading={review.isPending} className="flex-1 bg-success hover:bg-success/90">
            <Check className="size-4" aria-hidden />
            موافقة
          </Button>
          <Button variant="danger" onClick={() => decide("reject")} loading={review.isPending} className="flex-1">
            <X className="size-4" aria-hidden />
            رفض
          </Button>
        </div>
      </div>
    </div>
  );
}

function KycImage({ label, url }: { label: string; url: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return <figure className="flex flex-col gap-1"><div className="relative aspect-square overflow-hidden rounded-control border border-hairline">
    {!loaded && !failed && <span className="absolute inset-0 grid place-items-center text-caption text-muted">جارٍ تحميل الصورة</span>}
    {failed ? <span className="grid h-full place-items-center text-caption text-muted">تعذر تحميل الصورة</span> : <img src={url} alt={label} referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className={`h-full w-full object-contain ${loaded ? "" : "opacity-0"}`} />}
  </div><figcaption className="text-caption text-muted">{label}</figcaption></figure>;
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
