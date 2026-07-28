"use client";

import Link from "next/link";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { formatNumber } from "@/src/utils/format";
import {
  tenantOfferStatusLabels,
  type TenantOffer,
} from "@/src/lib/api/contracts/tenantOffer";
import {
  useAcceptCounter,
  useMyTenantOffers,
  useWithdrawTenantOffer,
} from "../hooks/useTenantOffers";

/** Tenant's own direct offers on listings (forward marketplace). */
export function TenantDirectOffers() {
  const { data, isLoading, isError, refetch } = useMyTenantOffers();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-title font-bold text-ink">عروضي على العقارات</h2>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {data && data.items.length === 0 && (
        <EmptyState title="لا توجد عروض بعد" description="تصفّح العقارات وقدّم عرضاً مباشراً على ما يناسبك." />
      )}

      {data && data.items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.items.map((offer) => (
            <TenantOfferCard key={offer.id} offer={offer} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TenantOfferCard({ offer }: { offer: TenantOffer }) {
  const toast = useToast();
  const accept = useAcceptCounter();
  const withdraw = useWithdrawTenantOffer();
  const pending = accept.isPending || withdraw.isPending;

  return (
    <li className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/tenant/properties/${offer.property.id}`}
            className="text-body font-bold text-ink hover:text-primary hover:underline"
          >
            {offer.property.title}
          </Link>
          <p className="text-caption text-muted">
            {offer.property.governorate} · {offer.property.city}
          </p>
        </div>
        <StatusPill status={offer.status} />
      </div>

      <div className="flex flex-wrap gap-4 text-small">
        <span className="text-muted">
          عرضك: <span className="font-bold text-ink">{formatNumber(offer.proposedPrice)} ج.م</span>
        </span>
        {offer.status === "COUNTERED" && offer.counterPrice != null && (
          <span className="text-muted">
            عرض المالك المضاد: <span className="font-bold text-primary">{formatNumber(offer.counterPrice)} ج.م</span>
          </span>
        )}
      </div>

      {offer.status === "COUNTERED" && offer.counterMessage && (
        <p className="rounded-control bg-background p-2.5 text-caption text-body-text">{offer.counterMessage}</p>
      )}

      {offer.status === "COUNTERED" && (
        <div className="flex gap-2">
          <Button
            className="flex-1"
            loading={accept.isPending}
            disabled={pending}
            onClick={() =>
              accept.mutate(offer.id, {
                onSuccess: () => toast("success", "تم قبول العرض المضاد — تم فتح المحادثة"),
                onError: (e) => toast("error", e.message),
              })
            }
          >
            قبول العرض المضاد
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              withdraw.mutate(offer.id, { onSuccess: () => toast("info", "تم سحب العرض") })
            }
          >
            سحب
          </Button>
        </div>
      )}

      {offer.status === "PENDING" && (
        <Button
          variant="ghost"
          className="self-start"
          loading={withdraw.isPending}
          onClick={() =>
            withdraw.mutate(offer.id, { onSuccess: () => toast("info", "تم سحب العرض") })
          }
        >
          سحب العرض
        </Button>
      )}

      {offer.status === "ACCEPTED" && (
        <Link href="/tenant/messages" className="text-small font-semibold text-primary hover:underline">
          الذهاب إلى المحادثة ←
        </Link>
      )}
    </li>
  );
}

function StatusPill({ status }: { status: TenantOffer["status"] }) {
  const tone: Record<TenantOffer["status"], string> = {
    PENDING: "bg-trust-blue-tint text-trust-blue",
    COUNTERED: "bg-primary-tint text-primary",
    ACCEPTED: "bg-success-tint text-success",
    DECLINED: "bg-error-tint text-error",
    WITHDRAWN: "bg-background text-muted",
  };
  return (
    <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-caption font-bold ${tone[status]}`}>
      {tenantOfferStatusLabels[status]}
    </span>
  );
}
