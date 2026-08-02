"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/src/components/ui/Button";
import { InputField } from "@/src/components/ui/Field";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { formatNumber } from "@/src/utils/format";
import {
  tenantOfferStatusLabels,
  type ReceivedTenantOffer,
} from "@/src/lib/api/contracts/tenantOffer";
import {
  useLandlordAcceptOffer,
  useLandlordCounterOffer,
  useLandlordDeclineOffer,
  useLandlordTenantOffers,
} from "../hooks/useTenantOffers";

/** Landlord's inbox of direct offers on their listings (forward marketplace). */
export function LandlordDirectOffers() {
  const { data, isLoading, isError, refetch } = useLandlordTenantOffers();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-title font-bold text-ink">عروض مباشرة على عقاراتك</h2>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {data && data.items.length === 0 && (
        <EmptyState title="لا توجد عروض مباشرة" description="عندما يقدّم مستأجر عرضاً على أحد عقاراتك سيظهر هنا." />
      )}
      {data && data.items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.items.map((offer) => (
            <LandlordOfferCard key={offer.id} offer={offer} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LandlordOfferCard({ offer }: { offer: ReceivedTenantOffer }) {
  const toast = useToast();
  const accept = useLandlordAcceptOffer();
  const decline = useLandlordDeclineOffer();
  const counter = useLandlordCounterOffer();
  const [countering, setCountering] = useState(false);
  const [counterPrice, setCounterPrice] = useState<string>(String(offer.proposedPrice));
  const [counterMessage, setCounterMessage] = useState("");
  const busy = accept.isPending || decline.isPending || counter.isPending;
  const actionable = offer.status === "PENDING";

  return (
    <li className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/landlord/properties/${offer.property.id}`}
            className="text-body font-bold text-ink hover:text-primary hover:underline"
          >
            {offer.property.title}
          </Link>
          <p className="text-caption text-muted">من: {offer.tenantName}</p>
        </div>
        <span className="shrink-0 rounded-pill bg-background px-2.5 py-0.5 text-caption font-bold text-muted">
          {tenantOfferStatusLabels[offer.status]}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-small">
        <span className="text-muted">
          العرض المقترح: <span className="font-bold text-ink">{formatNumber(offer.proposedPrice)} ج.م</span>
        </span>
        <span className="text-muted">
          الإيجار المطلوب: <span className="font-bold text-ink">{formatNumber(offer.property.rentAmount)} ج.م</span>
        </span>
      </div>

      {offer.message && (
        <p className="rounded-control bg-background p-2.5 text-caption text-body-text">{offer.message}</p>
      )}

      {offer.status === "COUNTERED" && offer.counterPrice != null && (
        <p className="text-caption text-primary">قدّمت عرضاً مضاداً بقيمة {formatNumber(offer.counterPrice)} ج.م — بانتظار رد المستأجر.</p>
      )}

      {actionable && !countering && (
        <div className="flex flex-wrap gap-2">
          <Button
            loading={accept.isPending}
            disabled={busy}
            onClick={() =>
              accept.mutate(offer.id, {
                onSuccess: () => toast("success", "تم قبول العرض — تم فتح المحادثة"),
                onError: (e) => toast("error", e.message),
              })
            }
          >
            قبول
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => setCountering(true)}>
            عرض مضاد
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() =>
              decline.mutate(offer.id, { onSuccess: () => toast("info", "تم رفض العرض") })
            }
          >
            رفض
          </Button>
        </div>
      )}

      {actionable && countering && (
        <div className="flex flex-col gap-2 rounded-control border border-hairline bg-background p-3">
          <InputField
            label="الإيجار المضاد (ج.م / شهرياً)"
            type="number"
            inputMode="numeric"
            min={1}
            value={counterPrice}
            onChange={(e) => setCounterPrice(e.target.value)}
          />
          <InputField
            label="رسالة (اختياري)"
            value={counterMessage}
            onChange={(e) => setCounterMessage(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              loading={counter.isPending}
              onClick={() => {
                const price = Number(counterPrice);
                if (!Number.isFinite(price) || price <= 0) {
                  toast("error", "أدخل قيمة صحيحة");
                  return;
                }
                counter.mutate(
                  { id: offer.id, counterPrice: price, counterMessage: counterMessage.trim() || undefined },
                  {
                    onSuccess: () => {
                      toast("success", "تم إرسال العرض المضاد");
                      setCountering(false);
                    },
                    onError: (e) => toast("error", e.message),
                  },
                );
              }}
            >
              إرسال العرض المضاد
            </Button>
            <Button variant="ghost" disabled={counter.isPending} onClick={() => setCountering(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {offer.status === "ACCEPTED" && (
        <Link href="/landlord/messages" className="text-small font-semibold text-primary hover:underline">
          الذهاب إلى المحادثة ←
        </Link>
      )}
    </li>
  );
}
