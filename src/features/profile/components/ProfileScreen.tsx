"use client";

import { cn } from "@/src/utils/cn";

import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { VerifiedBadge } from "@/src/components/ui/VerifiedBadge";
import { useLogout, useSession } from "@/src/features/auth/hooks/useSession";
import { useQuota } from "@/src/features/landlord/hooks/useLandlord";
import { PaymentSheet } from "@/src/features/payments/PaymentSheet";
import type { PaymentType } from "@/src/lib/api/contracts/payment";
import {
  Building2,
  Check,
  Crown,
  FileCheck2,
  HelpCircle,
  LogOut,
  Mail,
  Phone,
  ShieldAlert,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ProfileScreen() {
  const router = useRouter();
  const { data: user, isLoading } = useSession();
  const quotaQuery = useQuota();
  const { data: quota, isLoading: isQuotaLoading } = quotaQuery;
  const logout = useLogout();

  const [activePaymentType, setActivePaymentType] = useState<PaymentType | null>(null);
  const [showOfferInfo, setShowOfferInfo] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, router, user]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!user) return null;

  const isLandlord = user.role === "landlord";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-10">
      <h1 className="text-h1 font-bold text-ink">حسابي</h1>

      {/* User Info Card */}
      <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary-tint text-primary">
              <UserIcon className="size-7" aria-hidden />
            </span>
            <div>
              <p className="text-title font-bold text-ink">{user.fullName}</p>
              <VerifiedBadge status={user.verificationStatus} />
            </div>
          </div>

          {/* Current Active Plan Badge for Landlords */}
          {isLandlord && (
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-caption font-bold shadow-xs",
                  quota?.planType === "PREMIUM" && "bg-amber-500/15 text-amber-600 border border-amber-500/30",
                  quota?.planType === "OWNER_PLUS" && "bg-primary-tint text-primary border border-primary/30",
                  (quota?.planType === "FREE" || !quota?.planType) && "bg-background text-muted border border-hairline",
                )}
              >
                {quota?.planType === "PREMIUM" && <Crown className="size-3.5" />}
                {quota?.planType === "OWNER_PLUS" && <Sparkles className="size-3.5" />}
                {quota?.planType === "PREMIUM"
                  ? "الخطة الـ Premium"
                  : quota?.planType === "OWNER_PLUS"
                  ? "خطة Plus"
                  : "الخطة المجانية"}
              </span>
              {quota?.planExpiresAt && (
                <span className="text-[10px] text-muted font-medium">
                  تجدد في {new Date(quota.planExpiresAt).toLocaleDateString("ar-EG")}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 border-t border-hairline pt-3 text-small text-body-text">
          <p className="flex items-center gap-2">
            <Mail className="size-4 text-muted" aria-hidden />
            {user.email}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="size-4 text-muted" aria-hidden />
            {user.phoneNumber}
          </p>
        </div>
      </div>

      {/* Verification CTA */}
      {user.verificationStatus !== "APPROVED" && user.role !== "admin" && (
        <Link
          href="/verify"
          className="flex items-center gap-3 rounded-card border border-pending/30 bg-pending-tint px-4 py-3 hover:bg-pending-tint/80 transition-colors"
        >
          <ShieldAlert className="size-5 text-pending" aria-hidden />
          <span className="flex-1 text-small font-semibold text-pending">
            وثّق حسابك لتفعيل كل المزايا
          </span>
          <span className="text-small text-pending">←</span>
        </Link>
      )}

      {/* Landlord Subscription & Quota Dashboard */}
      {isLandlord && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 font-bold text-ink flex items-center gap-2">
              <Crown className="size-5 text-primary" />
              الاشتراكات ورصيد المزايا
            </h2>
            <button
              type="button"
              onClick={() => setShowOfferInfo((prev) => !prev)}
              className="flex items-center gap-1 text-caption text-primary hover:underline font-semibold"
            >
              <HelpCircle className="size-4" />
              ما هي عروض الإيجار؟
            </button>
          </div>

          {/* Explanation Banner for Offers */}
          {showOfferInfo && (
            <div className="rounded-card border border-trust-blue/30 bg-trust-blue-tint p-4 text-small text-ink">
              <p className="mb-1 flex items-center gap-1.5 font-bold text-trust-blue">
                <HelpCircle className="size-4" aria-hidden />
                ما هي العروض المباشرة؟
              </p>
              <p className="leading-relaxed">
                العرض المباشر هو عرض يرسله المالك إلى مستأجر على طلبه المنشور، ويشمل العقار المقترح
                والسعر والرسالة. يحصل المالك المجاني على 3 عروض مباشرة، وتصبح غير محدودة في الخطة
                المميزة.
              </p>
            </div>
          )}

          {/* Current Quotas Cards with Progress Bars */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Active Listings Progress Bar */}
            <div className="flex flex-col gap-2 rounded-card border border-hairline bg-surface p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-caption font-semibold text-muted">
                  <Building2 className="size-4 text-primary" />
                  الوحدات العقارية  
                </span>
                <span className="text-caption font-bold text-ink">
                  {quota?.activeUnitCount ?? 0} / {quota?.maxActiveListings ?? 1}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-pill bg-hairline overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (((quota?.activeUnitCount ?? 0) / (quota?.maxActiveListings ?? 1)) * 100))}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-muted">
                الحد الأقصى المسموح به في خطتك الحالية
              </span>
            </div>

            {/* Direct Tenant Offers Progress Bar */}
            <div className="flex flex-col gap-2 rounded-card border border-hairline bg-surface p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-caption font-semibold text-muted">
                  <FileCheck2 className="size-4 text-trust-blue" />
                  عروض الإيجار للمستأجرين
                </span>
                <span className="text-caption font-bold text-ink">
                  {quota?.freeOffersLeft ?? 0} المتبقي
                </span>
              </div>
              <div className="h-2.5 w-full rounded-pill bg-hairline overflow-hidden">
                <div
                  className="h-full bg-trust-blue transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (((quota?.freeOffersLeft ?? 0) / (quota?.planType === "PREMIUM" ? 50 : quota?.planType === "OWNER_PLUS" ? 10 : 3)) * 100))}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-muted">
                تُرحّل الاستخدامات غير المستهلكة للشهر القادم
              </span>
            </div>

            {/* AI Optimizer Progress Bar */}
            <div className="flex flex-col gap-2 rounded-card border border-hairline bg-surface p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-caption font-semibold text-muted">
                  <Sparkles className="size-4 text-accent" />
                  محسن الوصف الذكي
                </span>
                <span className="text-caption font-bold text-ink">
                  {quota?.optimizerUsesLeft ?? 0} المتبقي
                </span>
              </div>
              <div className="h-2.5 w-full rounded-pill bg-hairline overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (((quota?.optimizerUsesLeft ?? 0) / (quota?.planType === "PREMIUM" ? 20 : quota?.planType === "OWNER_PLUS" ? 10 : 3)) * 100))}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-muted">
                تُرحّل الاستخدامات غير المستهلكة للشهر القادم
              </span>
            </div>
          </div>

          {/* Subscription Plans Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-title font-bold text-ink">خطط اشتراك المالك المتاحة</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Free Owner Plan */}
              <div className="flex flex-col justify-between rounded-card border border-hairline bg-surface p-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-bold text-ink">الخطة المجانية</span>
                    <span className="rounded-pill bg-background px-2 py-0.5 text-caption font-semibold text-muted">
                      مجاناً
                    </span>
                  </div>
                  <p className="text-h2 font-extrabold text-ink mb-3">
                    0 <span className="text-caption font-normal text-muted">ج.م / شهرياً</span>
                  </p>
                  <ul className="flex flex-col gap-2 text-caption text-body-text mb-4">
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> وحدة عقارية نشطة واحدة (1)
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> 3 عروض إيجار مباشرة شهرياً
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> 3 استخدامات محسن الذكاء الاصطناعي
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> إنشاء وتصدير عقود PDF مجاناً
                    </li>
                  </ul>
                </div>
                {quota?.planType === "FREE" && (
                  <span className="rounded-card bg-background py-2 text-center text-caption font-bold text-muted">
                    الخطة الحالية
                  </span>
                )}
              </div>

              {/* Owner Plus Plan */}
              <div className="flex flex-col justify-between rounded-card border-2 border-primary bg-primary-tint/20 p-4 shadow-xs relative">
                <span className="absolute -top-3 right-4 rounded-pill bg-primary px-2.5 py-0.5 text-[11px] font-bold text-white">
                  الأكثر إقبالاً
                </span>
                <div>
                  <div className="flex items-center justify-between mb-2 mt-1">
                    <span className="text-body font-bold text-primary">خطة Plus</span>
                  </div>
                  <p className="text-h2 font-extrabold text-ink mb-3">
                    499 <span className="text-caption font-normal text-muted">ج.م / شهرياً</span>
                  </p>
                  <ul className="flex flex-col gap-2 text-caption text-body-text mb-4">
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-primary shrink-0" /> حتى 3 وحدات عقارية نشطة
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-primary shrink-0" /> 10 عروض إيجار مباشرة للمستأجرين
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-primary shrink-0" /> 10 استخدامات محسن الذكاء الاصطناعي
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-primary shrink-0" /> تنبيهات أولوية للطلبات المناسبة
                    </li>
                  </ul>
                </div>
                {quota?.planType === "OWNER_PLUS" ? (
                  <span className="rounded-card bg-primary-tint py-2 text-center text-caption font-bold text-primary">
                    الخطة الحالية
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setActivePaymentType("OWNER_PLUS")}
                  >
                    اشترك مقابل 499 ج.م شهرياً
                  </Button>
                )}
              </div>

              {/* Premium Owner Plan */}
              <div className="flex flex-col justify-between rounded-card border border-hairline bg-surface p-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-bold text-ink">الخطة الـ Premium</span>
                  </div>
                  <p className="text-h2 font-extrabold text-ink mb-3">
                    999 <span className="text-caption font-normal text-muted">ج.م / شهرياً</span>
                  </p>
                  <ul className="flex flex-col gap-2 text-caption text-body-text mb-4">
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> حتى 5 وحدات عقارية نشطة
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> 50 عرض إيجار مباشر للمستأجرين
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> 20 استخدام محسن الذكاء الاصطناعي
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> تحليلات متقدمة وجدولة المعاينات
                    </li>
                  </ul>
                </div>
                {quota?.planType === "PREMIUM" ? (
                  <span className="rounded-card bg-success-tint py-2 text-center text-caption font-bold text-success">
                    الخطة الحالية
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActivePaymentType("PREMIUM_OWNER")}
                  >
                    اشترك مقابل 999 ج.م شهرياً
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Button variant="danger" onClick={() => logout.mutate()} loading={logout.isPending}>
        <LogOut className="size-4" aria-hidden />
        تسجيل الخروج
      </Button>

      {/* Paymob Payment Modal Sheet */}
      {activePaymentType && (
        <PaymentSheet
          paymentType={activePaymentType}
          open={!!activePaymentType}
          onClose={() => setActivePaymentType(null)}
          onActivated={() => {
            setActivePaymentType(null);
            quotaQuery.refetch();
          }}
        />
      )}
    </div>
  );
}
