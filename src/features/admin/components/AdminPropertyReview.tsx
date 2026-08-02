"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ImageOff, X } from "lucide-react";
import { useAdminPropertyReview, useReviewProperty } from "../hooks/useAdmin";
import { Button } from "@/src/components/ui/Button";
import { TextAreaField } from "@/src/components/ui/Field";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/components/ui/Toast";
import { propertyTypeLabels } from "@/src/lib/api/contracts/property";

export function AdminPropertyReview({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { data: property, isLoading, isError, refetch } = useAdminPropertyReview(id);
  const review = useReviewProperty(id);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  function decide(decision: "approve" | "reject") {
    const trimmedReason = reason.trim();
    if (decision === "reject" && !trimmedReason) {
      setReasonError("سبب الرفض مطلوب");
      return;
    }
    review.mutate(
      { decision: { decision, reason: decision === "reject" ? trimmedReason : undefined } },
      {
        onSuccess: () => {
          toast("success", decision === "approve" ? "تم قبول العقار" : "تم رفض العقار");
          router.push("/admin");
        },
        onError: (err) => {
          toast(err.conflict ? "info" : "error", err.message);
          if (err.conflict) router.push("/admin");
        },
      },
    );
  }

  if (isLoading || !property) {
    return <div className="flex flex-col gap-4"><Skeleton className="h-72 w-full" /><Skeleton className="h-32 w-full" /></div>;
  }
  if (isError) {
    return <div className="rounded-card border border-hairline p-4 text-body"><p>تعذر تحميل تفاصيل العقار.</p><Button variant="ghost" onClick={() => refetch()}>إعادة المحاولة</Button></div>;
  }

  const alreadyReviewed = property.status !== "PENDING";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => router.push("/admin")}><ArrowRight className="size-4" aria-hidden />رجوع للطابور</Button>
        <p className="text-caption text-muted">هذه التفاصيل متاحة للمشرفين فقط.</p>
      </div>

      <section className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h1 className="text-h1 font-bold text-ink">{property.title}</h1><p className="mt-1 text-body text-muted">{property.district}، {property.city}، {property.governorate} — {property.manualAddress}</p></div>
          <p className="text-title font-bold text-primary">{property.rentAmount.toLocaleString()} ج.م / شهرياً</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-small sm:grid-cols-3">
          <Fact label="النوع" value={propertyTypeLabels[property.propertyType]} /><Fact label="المساحة" value={`${property.areaM2} م²`} />
          <Fact label="غرف النوم" value={String(property.bedrooms)} /><Fact label="الحمّامات" value={String(property.bathrooms)} />
          <Fact label="الفرش" value={property.isFurnished ? "مفروش" : "غير مفروش"} /><Fact label="أسانسير" value={property.hasElevator ? "يوجد" : "لا يوجد"} />
          <Fact label="جراج" value={property.hasParking ? "يوجد" : "لا يوجد"} /><Fact label="المؤجر" value={property.ownerName} />
          <Fact label="حالة التوثيق" value={property.ownerVerificationStatus} /><Fact label="تاريخ الإرسال" value={new Date(property.createdAt).toLocaleDateString("ar-EG")} />
        </div>
        <section className="mt-5"><h2 className="font-bold text-ink">الوصف</h2><p className="mt-1 whitespace-pre-line text-body text-body-text">{property.description}</p></section>
        {property.propertyAroundServices && <section className="mt-4"><h2 className="font-bold text-ink">الخدمات المحيطة</h2><p className="mt-1 text-body text-body-text">{property.propertyAroundServices}</p></section>}
      </section>

      <section aria-label="صور العقار" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {property.images.map((image) => <ReviewImage key={image.id} src={image.imageUrl} alt={`صورة العقار ${image.displayOrder + 1}`} />)}
      </section>

      {alreadyReviewed ? <div className="rounded-card bg-background p-4 text-center text-small text-muted">تمت مراجعة هذا الإعلان بالفعل.</div> : (
        <div className="sticky bottom-0 flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card">
          {rejecting && <TextAreaField label="سبب الرفض" placeholder="اكتب سبب الرفض ليظهر للمالك…" value={reason} onChange={(event) => { setReason(event.target.value); setReasonError(""); }} error={reasonError} />}
          <div className="flex gap-3">
            {rejecting ? <><Button variant="danger" onClick={() => decide("reject")} loading={review.isPending} disabled={review.isPending} className="flex-1"><X className="size-4" aria-hidden />رفض العقار</Button><Button variant="ghost" disabled={review.isPending} onClick={() => setRejecting(false)}>إلغاء</Button></> : <><Button onClick={() => decide("approve")} loading={review.isPending} disabled={review.isPending} className="flex-1 bg-success hover:bg-success/90"><Check className="size-4" aria-hidden />قبول العقار</Button><Button variant="danger" disabled={review.isPending} onClick={() => setRejecting(true)} className="flex-1"><X className="size-4" aria-hidden />رفض العقار</Button></>}
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) { return <div className="rounded-control bg-background p-3"><p className="text-caption text-muted">{label}</p><p className="font-bold text-ink">{value}</p></div>; }

function ReviewImage({ src, alt }: { src: string; alt: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  return <figure className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-card bg-background">
    {state === "loading" && <span className="text-small text-muted">جارٍ تحميل الصورة</span>}
    {state === "failed" ? <ImageOff className="size-8 text-muted" aria-label="تعذر تحميل الصورة" /> : <img src={src} alt={alt} className={`h-full w-full object-contain ${state === "loading" ? "absolute opacity-0" : ""}`} onLoad={() => setState("loaded")} onError={() => setState("failed")} />}
  </figure>;
}
