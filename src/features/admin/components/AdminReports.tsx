"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Receipt, Home, Clock } from "lucide-react";
import { useAdminStats } from "../hooks/useAdmin";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { ErrorState } from "@/src/components/ui/States";
import { formatEGP, formatNumber } from "@/src/utils/format";

const DIST_COLORS = ["var(--color-success)", "var(--color-pending)", "var(--color-error)"];

/**
 * Financial + moderation overview (Recharts). Gated by report:export in the
 * real RBAC model (Finance Admin / Super Admin) — see docs/analysis/rbac.md.
 * The mock grants the demo admin all capabilities.
 */
export function AdminReports() {
  const { data, isLoading, isError, refetch } = useAdminStats();

  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const cards = [
    { Icon: TrendingUp, label: "إجمالي الإيرادات", value: formatEGP(data.summary.totalRevenue), tone: "text-success" },
    { Icon: Receipt, label: "عدد المعاملات", value: formatNumber(data.summary.totalTransactions), tone: "text-trust-blue" },
    { Icon: Home, label: "إعلانات نشطة", value: formatNumber(data.summary.activeListings), tone: "text-primary" },
    { Icon: Clock, label: "بانتظار المراجعة", value: formatNumber(data.summary.pendingModeration), tone: "text-pending" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1 font-bold text-ink">التقارير المالية</h1>
        <p className="mt-1 text-small text-muted">نظرة عامة على الإيرادات والمراجعات.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ Icon, label, value, tone }) => (
          <div key={label} className="flex flex-col gap-2 rounded-card border border-hairline bg-surface p-4 shadow-card">
            <Icon className={`size-5 ${tone}`} aria-hidden />
            <span className="text-caption text-muted">{label}</span>
            <span className="text-h2 font-bold text-ink">{value}</span>
          </div>
        ))}
      </div>

      <section className="rounded-card border border-hairline bg-surface p-4 shadow-card">
        <h2 className="mb-4 text-title font-bold text-ink">الإيرادات الشهرية (ج.م)</h2>
        <div className="h-72 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyRevenue} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-muted)" }} axisLine={{ stroke: "var(--color-hairline)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                cursor={{ fill: "var(--color-primary-tint)" }}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--color-hairline)", fontFamily: "inherit" }}
                formatter={(v) => [formatEGP(Number(v)), "الإيراد"]}
              />
              <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-card border border-hairline bg-surface p-4 shadow-card">
        <h2 className="mb-4 text-title font-bold text-ink">توزيع مراجعة الإعلانات</h2>
        <div className="h-56 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.moderationDistribution} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <XAxis type="number" tick={{ fontSize: 12, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "var(--color-body-text)" }} axisLine={false} tickLine={false} width={90} />
              <Tooltip cursor={{ fill: "var(--color-background)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--color-hairline)", fontFamily: "inherit" }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {data.moderationDistribution.map((_, i) => (
                  <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
