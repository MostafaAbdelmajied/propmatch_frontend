"use client";

import { useState } from "react";
import { Eye, Heart, Handshake, Send, Sparkles, TrendingUp } from "lucide-react";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { usePropertyAnalytics } from "@/src/features/listings/hooks/usePropertyAnalytics";
import type { AnalyticsPeriod } from "@/src/lib/api/contracts/propertyAnalytics";
import { cn } from "@/src/utils/cn";

const periods: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "7d", label: "7 أيام" },
  { value: "30d", label: "30 يومًا" },
  { value: "current", label: "الفترة الحالية" },
  { value: "lifetime", label: "كل الوقت" },
];

export function PropertyAnalyticsPanel({ propertyId }: { propertyId: string }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const analytics = usePropertyAnalytics(propertyId, period);

  return (
    <section className="rounded-card border border-hairline bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-h2 font-bold text-ink">
            <TrendingUp className="size-5 text-primary" aria-hidden />
            تحليلات العقار
          </h2>
          <p className="mt-1 text-caption text-muted">
            أرقام حقيقية فقط؛ Boost يرفع الظهور ولا يضيف مشاهدات أو تفاعلات مصطنعة.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-control bg-background p-1">
          {periods.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPeriod(item.value)}
              className={cn(
                "rounded-control px-2.5 py-1.5 text-caption font-bold",
                period === item.value ? "bg-surface text-primary shadow-xs" : "text-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {analytics.isLoading ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-24" />)}
        </div>
      ) : analytics.isError || !analytics.data ? (
        <p className="mt-4 rounded-control bg-error-tint p-3 text-small text-error">
          تعذر تحميل التحليلات الآن.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric Icon={Eye} label="المشاهدات" value={analytics.data.totals.views} detail={`${analytics.data.totals.uniqueViews} زائرًا فريدًا`} />
            <Metric Icon={Heart} label="المفضلة الحالية" value={analytics.data.totals.favorites} />
            <Metric Icon={Send} label="عروض المستأجرين" value={analytics.data.totals.tenantOffersReceived} detail={`${analytics.data.totals.reverseOffersSent} عرضًا عكسيًا`} />
            <Metric
              Icon={Handshake}
              label="المطابقات"
              value={analytics.data.totals.matches}
              locked={!analytics.data.capabilities.matches}
            />
            {analytics.data.capabilities.boostedVsOrganic && (
              <Metric Icon={Sparkles} label="مشاهدات Boost" value={analytics.data.totals.boostedViews} detail={`${analytics.data.totals.organicViews ?? 0} مشاهدة طبيعية`} />
            )}
            {analytics.data.capabilities.conversion && (
              <Metric
                Icon={TrendingUp}
                label="تحويل المشاهدة إلى عرض"
                value={`${Math.round((analytics.data.totals.viewToOfferRate ?? 0) * 100)}%`}
              />
            )}
          </div>

          {!analytics.data.capabilities.matches && (
            <p className="mt-3 rounded-control border border-primary/20 bg-primary-tint/30 p-3 text-caption text-primary-dark">
              تحليلات المطابقات متاحة في Owner Plus وPremium، وتحليل Boost والتحويل متاح في Premium.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function Metric({
  Icon,
  label,
  value,
  detail,
  locked = false,
}: {
  Icon: typeof Eye;
  label: string;
  value: number | string | null;
  detail?: string;
  locked?: boolean;
}) {
  return (
    <div className="rounded-control border border-hairline bg-background/60 p-3">
      <div className="flex items-center gap-2 text-caption font-semibold text-muted">
        <Icon className="size-4 text-primary" aria-hidden />
        {label}
      </div>
      <p className="mt-2 text-h2 font-extrabold text-ink">{locked ? "—" : (value ?? 0)}</p>
      <p className="mt-0.5 text-caption text-muted">{locked ? "متاح في الخطط المدفوعة" : detail}</p>
    </div>
  );
}
