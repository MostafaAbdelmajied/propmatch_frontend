"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Inbox, X } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { MatchScoreRing } from "@/src/components/ui/MatchScoreRing";
import { PropertyCard } from "@/src/components/PropertyCard";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { formatEGP, formatRelativeTime } from "@/src/utils/format";
import type { ReceivedOffer } from "@/src/lib/api/contracts/offer";
import {
  useAcceptOffer,
  useReceivedOffers,
  useRejectOffer,
  useViewOffer,
} from "../hooks/useOffers";
import { ContactRevealCard } from "./ContactRevealCard";
import { OfferStatusChip } from "./StatusPills";

/**
 * PRO-13 (tenant side) — offers landlords sent against this tenant's requests,
 * best match first. Accepting is the moment the marketplace pays off: it
 * CONNECTs the match, reveals both phones, and prompts the B2B opt-in (PRO-16).
 */
export function TenantOfferInbox() {
  const { data, isLoading, isError, refetch } = useReceivedOffers();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h1 font-bold text-ink">العروض الواردة</h1>
        <p className="mt-1 text-small text-muted">
          عروض من ملّاك موثّقين على طلباتك، مرتّبة حسب التطابق.
        </p>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-card" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          Icon={Inbox}
          title="لا توجد عروض بعد"
          description="انشر طلبًا ليصلك عرض من الملّاك مباشرة."
          action={
            <Link href="/tenant/requests/new">
              <Button>اطلب سكنك</Button>
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {data.items.map((offer) => (
            <li key={offer.id}>
              <OfferCard offer={offer} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OfferCard({ offer }: { offer: ReceivedOffer }) {
  const router = useRouter();
  const toast = useToast();
  const accept = useAcceptOffer();
  const reject = useRejectOffer();
  const view = useViewOffer();
  const viewMutate = view.mutate;
  const marked = useRef(false);

  // SENT → VIEWED once the offer is actually on screen (ASSUMPTIONS #13).
  useEffect(() => {
    if (offer.status === "SENT" && !marked.current) {
      marked.current = true;
      viewMutate(offer.id);
    }
  }, [offer.id, offer.status, viewMutate]);

  const decided = offer.status === "ACCEPTED" || offer.status === "REJECTED";

  return (
    <article className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <OfferStatusChip status={offer.status} />
          <span className="text-caption text-muted">{formatRelativeTime(offer.createdAt)}</span>
        </div>
        <MatchScoreRing
          score={offer.matchScore}
          reasons={offer.matchReasons?.map((r) => r.text)}
          size={48}
          className="shrink-0"
        />
      </div>

      <PropertyCard
        property={offer.property}
        onClick={() => router.push(`/tenant/properties/${offer.property.id}`)}
      />

      <div className="flex flex-col gap-2 rounded-control bg-background p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-caption text-muted">السعر المقترح لك</span>
          <span className="text-title font-bold text-primary">
            {formatEGP(offer.proposedPrice)}
          </span>
        </div>
        <p className="text-small leading-relaxed text-body-text">{offer.pitchMessage}</p>
      </div>

      {offer.status === "ACCEPTED" && offer.ownerName && offer.ownerPhoneNumber ? (
        <>
          {" "}
          <ContactRevealCard
            ownerName={offer.ownerName}
            ownerPhoneNumber={offer.ownerPhoneNumber}
            manualAddress={offer.manualAddress}
          />{" "}
          {offer.matchConnectionId && (
            <Link href={`/tenant/messages/${offer.matchConnectionId}`}>
              <Button>فتح المحادثة</Button>
            </Link>
          )}{" "}
        </>
      ) : offer.status === "REJECTED" ? (
        <p className="text-small text-muted">رفضت هذا العرض.</p>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            block
            disabled={decided || accept.isPending}
            loading={reject.isPending}
            onClick={() =>
              reject.mutate(offer.id, {
                onSuccess: () => toast("info", "تم رفض العرض"),
                onError: () => toast("error", "تعذر رفض العرض، حاول مرة أخرى"),
              })
            }
          >
            <X className="size-4" aria-hidden />
            رفض
          </Button>
          <Button
            block
            disabled={decided || reject.isPending}
            loading={accept.isPending}
            onClick={() =>
              accept.mutate(offer.id, {
                onSuccess: () => {
                  toast("success", "تم قبول العرض — بيانات المالك متاحة الآن");
                },
                onError: (e) => {
                  if (e.code === "VERIFICATION_REQUIRED") {
                    toast("info", "وثّق هويتك أولًا لقبول العرض");
                    router.push("/verify");
                  } else {
                    toast("error", e.message);
                  }
                },
              })
            }
          >
            <Check className="size-4" aria-hidden />
            قبول وإظهار رقم المالك
          </Button>
        </div>
      )}
    </article>
  );
}
