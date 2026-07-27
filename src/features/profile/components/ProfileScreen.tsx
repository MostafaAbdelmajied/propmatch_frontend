"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User as UserIcon,
  Mail,
  Phone,
  LogOut,
  ShieldAlert,
  Crown,
  Building2,
  FileCheck2,
  Sparkles,
  HelpCircle,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useSession, useLogout } from "@/src/features/auth/hooks/useSession";
import { useQuota } from "@/src/features/landlord/hooks/useLandlord";
import { VerifiedBadge } from "@/src/components/ui/VerifiedBadge";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { PaymentSheet } from "@/src/features/payments/PaymentSheet";
import type { PaymentType } from "@/src/lib/api/contracts/payment";

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
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-tint text-primary">
            <UserIcon className="size-7" aria-hidden />
          </span>
          <div>
            <p className="text-title font-bold text-ink">{user.fullName}</p>
            <VerifiedBadge status={user.verificationStatus} />
          </div>
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

          {/* Current Quotas Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-card border border-hairline bg-surface p-4 shadow-xs">
              <div className="flex items-center gap-2 text-muted text-caption font-semibold">
                <Building2 className="size-4 text-primary" />
                الوحدات النشطة
              </div>
              {isQuotaLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-title font-bold text-ink">
                  {quota?.activeUnitCount ?? 0}
                  <span className="text-caption font-normal text-muted">
                    {" "}
                    من {quota?.maxActiveListings ?? 1}
                  </span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1 rounded-card border border-hairline bg-surface p-4 shadow-xs">
              <div className="flex items-center gap-2 text-muted text-caption font-semibold">
                <FileCheck2 className="size-4 text-trust-blue" />
                العروض المباشرة
              </div>
              {isQuotaLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-title font-bold text-ink">
                  {quota?.offersUnlimited ? "غير محدودة" : (quota?.freeOffersLeft ?? 3)}
                  {!quota?.offersUnlimited && (
                    <span className="text-caption font-normal text-muted"> عرض متبقٍ</span>
                  )}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1 rounded-card border border-hairline bg-surface p-4 shadow-xs">
              <div className="flex items-center gap-2 text-muted text-caption font-semibold">
                <Sparkles className="size-4 text-accent" />
                محسن الوصف بالذكاء
              </div>
              {isQuotaLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-title font-bold text-ink">
                  {quota?.optimizerUsesLeft ?? 0}{" "}
                  <span className="text-caption font-normal text-muted">استخدام</span>
                </p>
              )}
            </div>
          </div>

          {/* Subscription Plans Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-title font-bold text-ink">خطط اشتراك المالك المتاحة</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Free Owner Plan */}
              <div className="flex flex-col justify-between rounded-card border border-hairline bg-surface p-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-bold text-ink">المالك المجاني</span>
                    <span className="rounded-pill bg-background px-2 py-0.5 text-caption font-semibold text-muted">
                      مجاناً
                    </span>
                  </div>
                  <p className="text-h2 font-extrabold text-ink mb-3">
                    0 <span className="text-caption font-normal text-muted">ج.م / شهرياً</span>
                  </p>
                  <ul className="flex flex-col gap-2 text-caption text-body-text mb-4">
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> وحدة عقارية نشطة واحدة
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> 3 عروض مباشرة على طلبات
                      المستأجرين
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> المطابقة الأساسية
                      وتحليلات محدودة
                    </li>
                  </ul>
                </div>
                {quota?.planType === "FREE" && (
                  <span className="rounded-card bg-background py-2 text-center text-caption font-bold text-muted">
                    الخطة الحالية
                  </span>
                )}
              </div>

              {/* Premium Owner Plan */}
              <div className="flex flex-col justify-between rounded-card border border-hairline bg-surface p-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-bold text-ink">المالك المميز</span>
                  </div>
                  <p className="text-h2 font-extrabold text-ink mb-3">
                    999 <span className="text-caption font-normal text-muted">ج.م / شهرياً</span>
                  </p>
                  <ul className="flex flex-col gap-2 text-caption text-body-text mb-4">
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> حتى 5 وحدات عقارية نشطة
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> عروض مباشرة غير محدودة
                      على طلبات المستأجرين
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> 5 استخدامات ذكاء اصطناعي
                      مشمولة
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

          <div className="flex flex-col gap-3">
            <h3 className="text-title font-bold text-ink">خدمات اختيارية</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col justify-between gap-4 rounded-card border border-hairline bg-surface p-4">
                <div>
                  <p className="font-bold text-ink">حزمة الذكاء الاصطناعي</p>
                  <p className="mt-1 text-small text-muted">
                    استخدام واحد لمهمة محددة مثل تحسين وصف العقار أو اكتشاف البيانات الناقصة.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setActivePaymentType("AI_ADDON")}
                >
                  شراء استخدام مقابل 199 ج.م
                </Button>
              </div>
              <div className="flex flex-col justify-between gap-4 rounded-card border border-hairline bg-surface p-4">
                <div>
                  <p className="font-bold text-ink">حزمة تنظيم المستندات</p>
                  <p className="mt-1 text-small text-muted">
                    قوائم مراجعة وقوالب قابلة للتعديل وتنظيم للمستندات وتصدير PDF. دعم إداري وليس
                    استشارة قانونية.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setActivePaymentType("DOCS_PACK")}
                >
                  شراء الحزمة مقابل 299 ج.م
                </Button>
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
