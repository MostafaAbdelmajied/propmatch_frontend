"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { formatEGP, formatRelativeTime } from "@/src/utils/format";
import type { SentOffer } from "@/src/lib/api/contracts/offer";
import { useSentOffers } from "../hooks/useOffers";
import { OfferStatusChip } from "./StatusPills";

/**
 * PRO-12 — offers this landlord has sent. The tenant's identity never appears:
 * on acceptance the tenant reaches out, and the landlord is notified.
 */
export function LandlordSentOffers() {
  const { data, isLoading, isError, refetch } = useSentOffers();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h1 font-bold text-ink">عروضي</h1>
        <p className="mt-1 text-small text-muted">العروض التي أرسلتها لطلبات المستأجرين.</p>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          Icon={Send}
          title="لم ترسل أي عرض بعد"
          description="تصفّح طلبات المستأجرين وأرسل عرضًا على العقار المناسب."
          action={
            <Link href="/landlord/requests">
              <Button>تصفّح الطلبات</Button>
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((offer) => (
            <li key={offer.id}>
              <SentOfferRow offer={offer} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SentOfferRow({ offer }: { offer: SentOffer }) {
  return (
    <article className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/landlord/properties/${offer.property.id}`}
            className="truncate text-body font-bold text-ink hover:text-primary"
          >
            {offer.property.title}
          </Link>
          <p className="mt-0.5 text-small text-muted">
            {offer.property.district}، {offer.property.city}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OfferStatusChip status={offer.status} />
          <span className="text-caption text-muted">{formatRelativeTime(offer.createdAt)}</span>
        </div>
      </div>

      <p className="line-clamp-2 text-small leading-relaxed text-body-text">{offer.pitchMessage}</p>

      <div className="flex items-baseline justify-between border-t border-hairline pt-3">
        <span className="text-caption text-muted">السعر المقترح</span>
        <span className="text-body font-bold text-primary">{formatEGP(offer.proposedPrice)}</span>
      </div>

      {offer.status === "ACCEPTED" && offer.tenantName && offer.tenantPhoneNumber && (<>
        <p className="rounded-control bg-success-tint px-3 py-2 text-caption font-semibold text-success">
          {offer.tenantName} ? {offer.tenantPhoneNumber}
        </p>
        {offer.matchConnectionId && <Link href={`/landlord/messages/${offer.matchConnectionId}`}><Button>فتح المحادثة</Button></Link>}
      </>)}
    </article>
  );
}
