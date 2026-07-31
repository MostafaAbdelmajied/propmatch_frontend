"use client";

import { useState } from "react";
import Link from "next/link";
import { BedDouble, Check, Inbox, MapPin, Send, ShieldQuestion, Sofa } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { MatchScoreRing } from "@/src/components/ui/MatchScoreRing";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { formatEGP, formatNumber, formatRelativeTime } from "@/src/utils/format";
import { propertyTypeLabels } from "@/src/lib/api/contracts/property";
import type { BrowsableTenantRequest } from "@/src/lib/api/contracts/tenantRequest";
import { isVerificationRequired } from "@/src/lib/api/actionError";
import { useBrowsableRequests } from "../hooks/useOffers";
import { SendOfferSheet } from "./SendOfferSheet";

/**
 * PRO-13 — the reverse marketplace from the landlord's side: approved tenant
 * requests, ranked by how well they match this landlord's own properties.
 *
 * The tenant's identity is absent from the payload entirely, not hidden here.
 */
export function LandlordRequestBrowse() {
  const { data, isLoading, isError, error, refetch } = useBrowsableRequests();
  const [target, setTarget] = useState<BrowsableTenantRequest | null>(null);

  // The backend gates browsing itself — an unverified landlord gets a 403 with
  // VERIFICATION_REQUIRED rather than an empty list.
  if (isVerificationRequired(error)) {
    return (
      <div className="flex flex-col gap-5">
        <Header />
        <EmptyState
          Icon={ShieldQuestion}
          title="وثّق هويتك لتصفّح الطلبات"
          description="نعرض طلبات المستأجرين للملّاك الموثّقين فقط — حمايةً للطرفين."
          action={
            <Link href="/landlord/verify">
              <Button>ابدأ التوثيق</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Header />

      {isError ? (
        <ErrorState message={error?.message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-card" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          Icon={Inbox}
          title="لا توجد طلبات متاحة الآن"
          description="سيصلك إشعار فور نشر طلب جديد قد يطابق عقاراتك."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((request) => (
            <li key={request.id}>
              <RequestCard request={request} onOffer={() => setTarget(request)} />
            </li>
          ))}
        </ul>
      )}

      <SendOfferSheet request={target} onClose={() => setTarget(null)} />
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-h1 font-bold text-ink">طلبات المستأجرين</h1>
      <p className="mt-1 text-small text-muted">
        مستأجرون يبحثون عن سكن الآن — مرتّبون حسب مطابقتهم لعقاراتك.
      </p>
    </div>
  );
}

function RequestCard({ request, onOffer }: { request: BrowsableTenantRequest; onOffer: () => void }) {
  return (
    <article className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
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
        <MatchScoreRing
          score={request.matchScore}
          reasons={request.matchReasons?.map((r) => r.text)}
          size={52}
          className="shrink-0"
        />
      </div>

      {request.bestMatchingProperty && (
        <div className="text-caption text-primary bg-primary-tint/30 rounded-control px-2.5 py-1.5 font-semibold self-start">
          عقارك الأنسب للمطابقة: {request.bestMatchingProperty.title}
        </div>
      )}

      <p className="line-clamp-3 text-small leading-relaxed text-body-text">{request.lifestyleRequirements}</p>

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-3 text-caption text-muted">
        <span className="flex items-center gap-1">
          <BedDouble className="size-3.5" aria-hidden />
          {formatNumber(request.requiredBedrooms)} غرف
        </span>
        {request.needsFurnished && (
          <span className="flex items-center gap-1">
            <Sofa className="size-3.5" aria-hidden />
            يريد مفروش
          </span>
        )}
        <span>مرونة {formatNumber(request.flexibilityScore)}/{formatNumber(10)}</span>
        <span>{formatRelativeTime(request.createdAt)}</span>
        <div className="ms-auto">
          {request.alreadyOffered ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-success-tint px-2.5 py-1 text-caption font-semibold text-success">
              <Check className="size-3.5" aria-hidden />
              أرسلت عرضًا
            </span>
          ) : (
            <Button size="sm" onClick={onOffer}>
              <Send className="size-3.5" aria-hidden />
              أرسل عرضًا
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
