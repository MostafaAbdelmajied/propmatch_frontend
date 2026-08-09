"use client";

import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { ErrorState } from "@/src/components/ui/States";
import { OwnershipDisclaimer, VerifiedBadge } from "@/src/components/ui/VerifiedBadge";
import { useSession } from "@/src/features/auth/hooks/useSession";
import { MakeOfferButton } from "@/src/features/matching/components/MakeOfferButton";
import { propertyTypeLabels } from "@/src/lib/api/contracts/property";
import { formatNumber } from "@/src/utils/format";
import { ArrowUpDown, Bath, BedDouble, Car, Lock, MapPin, Ruler, Sofa } from "lucide-react";
import Link from "next/link";
import { useProperty } from "../hooks/useProperties";
import { useTrackPropertyView } from "../hooks/usePropertyAnalytics";
import { PropertyImageGallery } from "./PropertyImageGallery";
import { PropertyReviews } from "./PropertyReviews";


export function PropertyDetailView({
  id,
  matchScore,
  hideContact,
  showReviews,
  favoriteSlot,
}: {
  id: string;
  matchScore?: number;
  /** True when the owner/admin is viewing — no tenant contact panel. */
  hideContact?: boolean;
  /** Tenant-facing only: the public reviews block (SRS 3.7). */
  showReviews?: boolean;
  /** Favorite toggle, injected by the tenant surface (see PropertyCard). */
  favoriteSlot?: React.ReactNode;
}) {
  useTrackPropertyView(id);

  const { data: p, isLoading, isError, refetch } = useProperty(id);
  const { data: user, isLoading: isSessionLoading } = useSession();

  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (isLoading || isSessionLoading || !p) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const isGuest = !user;

  const facts = [
    { Icon: BedDouble, label: "غرف النوم", value: formatNumber(p.bedrooms) },
    { Icon: Bath, label: "الحمّامات", value: formatNumber(p.bathrooms) },
    { Icon: Ruler, label: "المساحة", value: `${formatNumber(p.areaM2)} م²` },
    { Icon: Sofa, label: "الفرش", value: p.isFurnished ? "مفروش" : "غير مفروش" },
    { Icon: ArrowUpDown, label: "أسانسير", value: p.hasElevator ? "يوجد" : "لا يوجد" },
    { Icon: Car, label: "جراج", value: p.hasParking ? "يوجد" : "لا يوجد" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-5 lg:col-span-2">
        {isGuest ? (
          <div className="relative h-64 w-full overflow-hidden rounded-card border border-hairline bg-background flex flex-col items-center justify-center p-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary-tint text-primary mb-3">
              <Lock className="size-7" />
            </span>
            <h3 className="text-body font-bold text-ink">صور العقار مخفية</h3>
            <p className="mt-1 text-small text-muted">سجل الدخول أو أنشئ حسابًا لعرض الصور الكاملة لهذا العقار.</p>
          </div>
        ) : (
          <PropertyImageGallery
            images={p.images}
            title={p.title}
            isBoosted={p.isBoosted}
            status={p.status}
            favoriteSlot={favoriteSlot}
            matchScore={matchScore}
          />
        )}

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-h1 font-bold text-ink">{p.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-body text-muted">
              <MapPin className="size-4" aria-hidden />
              {p.district}، {p.city}، {p.governorate} — {propertyTypeLabels[p.propertyType]}
            </p>
          </div>
          <div className="shrink-0 text-left">
            <span className="text-h1 font-bold text-primary">{formatNumber(p.rentAmount)}</span>
            <span className="block text-small text-muted">ج.م / شهريًا</span>
          </div>
        </div>

        {isGuest ? (
          <div className="rounded-card border border-primary/20 bg-primary-tint p-6 text-center shadow-card flex flex-col items-center gap-4">
            <h3 className="text-title font-bold text-ink">التفاصيل الكاملة مقفلة</h3>
            <p className="text-body text-body-text max-w-lg leading-relaxed">
              هذا العقار متاح للمستخدمين المسجلين فقط. يرجى تسجيل الدخول أو إنشاء حساب جديد مجانًا للاطلاع على الصور والوصف الكامل وتفاصيل الخدمات المحيطة والتواصل المباشر مع مالك العقار.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-sm">
              <Link href="/login" className="flex-1 min-w-32">
                <Button className="w-full justify-center">تسجيل الدخول</Button>
              </Link>
              <Link href="/signup" className="flex-1 min-w-32">
                <Button variant="secondary" className="w-full justify-center">أنشئ حساباً</Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <VerifiedBadge status={p.ownerVerified ? "APPROVED" : "NOT_SUBMITTED"} />
            <OwnershipDisclaimer />
            <TenantHousingRequestAction />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {facts.map(({ Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2 rounded-control border border-hairline bg-surface p-3">
                  <Icon className="size-5 text-primary" aria-hidden />
                  <div>
                    <p className="text-caption text-muted">{label}</p>
                    <p className="text-small font-bold text-ink">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <section>
              <h2 className="mb-2 text-title font-bold text-ink">الوصف</h2>
              <p className="whitespace-pre-line leading-relaxed text-body text-body-text">{p.description}</p>
            </section>

            {p.propertyAroundServices && (
              <section>
                <h2 className="mb-2 text-title font-bold text-ink">الخدمات المحيطة</h2>
                <p className="leading-relaxed text-body text-body-text">{p.propertyAroundServices}</p>
              </section>
            )}

            {showReviews && <PropertyReviews propertyId={id} />}
          </>
        )}
      </div>

      {!hideContact && (
        <aside className="flex flex-col gap-3 lg:sticky lg:top-20 lg:h-fit">
          {!isGuest && p.status === "APPROVED" && !p.contactRevealed && (
            <MakeOfferButton propertyId={id} askingRent={p.rentAmount} />
          )}
          <ContactPanel
            revealed={!isGuest && p.contactRevealed}
            ownerName={p.ownerName}
            ownerPhoneNumber={p.ownerPhoneNumber}
            manualAddress={p.manualAddress}
          />
        </aside>
      )}
    </div>
  );
}


function TenantHousingRequestAction() {
  const { data: user, isLoading } = useSession();

  if (isLoading || user?.role === "landlord" || user?.role === "admin") return null;

  if (!user) {
    return (
      <section className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5">
        <Link
          href="/login?redirectTo=%2Ftenant%2Frequests%2Fnew"
          className="inline-flex w-fit rounded-control bg-primary px-5 py-2.5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          سجّل الدخول لإنشاء طلب سكن
        </Link>
      </section>
    );
  }

  if (user.verificationStatus === "APPROVED") {
    return (
      <section className="flex flex-col gap-3 rounded-card border border-primary/20 bg-primary-tint p-5">
        <p className="text-small text-body-text">أنشئ طلبًا بمواصفات السكن التي تبحث عنها لتصلك عروض مناسبة من الملاك.</p>
        <Link
          href="/tenant/requests/new"
          className="inline-flex w-fit rounded-control bg-primary px-5 py-2.5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          أنشئ طلب سكن
        </Link>
      </section>
    );
  }

  const pending = user.verificationStatus === "PENDING";
  const rejected = user.verificationStatus === "REJECTED" || user.verificationStatus === "RESUBMISSION_REQUIRED";
  const message = pending
    ? "طلب توثيق حسابك قيد المراجعة. ستتمكن من إنشاء طلب سكن بعد الموافقة عليه."
    : rejected
      ? "لم تتم الموافقة على توثيق حسابك. راجع سبب الرفض وأعد إرسال المستندات لتتمكن من إنشاء طلب سكن."
      : "يجب توثيق حسابك أولًا قبل إنشاء طلب سكن.";

  return (
    <section className="flex flex-col gap-3 rounded-card border border-pending/30 bg-pending-tint p-5" aria-live="polite">
      <p className="text-small text-body-text">{message}</p>
      <Link
        href="/verify"
        className="inline-flex w-fit rounded-control bg-primary px-5 py-2.5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {rejected ? "مراجعة التوثيق" : "توثيق الحساب"}
      </Link>
    </section>
  );
}

/**
 * The PII gate, rendered. Pre-reveal the backend simply doesn't send the phone
 * or exact address — there is nothing here to "hide" (rbac.md). Contact
 * unlocks when the landlord's offer is accepted (the reverse marketplace),
 * which is why there's no "request contact" button in V1.
 */
function ContactPanel({
  revealed,
  ownerName,
  ownerPhoneNumber,
  manualAddress,
}: {
  revealed: boolean;
  ownerName: string | null;
  ownerPhoneNumber: string | null;
  manualAddress: string | null;
}) {
  return (
    <div className="rounded-card border border-hairline bg-surface p-5 shadow-card">
      <h3 className="mb-3 text-title font-bold text-ink">التواصل مع المالك</h3>
      {revealed && ownerPhoneNumber ? (
        <div className="flex flex-col gap-2 rounded-control bg-success-tint px-4 py-3">
          <span className="text-small font-bold text-success">تم تأكيد التطابق</span>
          {ownerName && <p className="text-body text-ink">{ownerName}</p>}
          <a href={`tel:${ownerPhoneNumber}`} className="text-body font-semibold text-primary" dir="ltr">
            {ownerPhoneNumber}
          </a>
          {manualAddress && <p className="text-small text-body-text">{manualAddress}</p>}
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-control bg-background px-3 py-2.5 text-small text-muted">
          <Lock className="size-4 shrink-0" aria-hidden />
          رقم المالك والعنوان التفصيلي يظهران بعد قبول العرض.
        </p>
      )}
    </div>
  );
}
