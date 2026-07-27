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
  const { data: quota, isLoading: isQuotaLoading } = useQuota();
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
        <Link href="/verify" className="flex items-center gap-3 rounded-card border border-pending/30 bg-pending-tint px-4 py-3 hover:bg-pending-tint/80 transition-colors">
          <ShieldAlert className="size-5 text-pending" aria-hidden />
          <span className="flex-1 text-small font-semibold text-pending">وثّق حسابك لتفعيل كل المزايا</span>
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
              <p className="font-bold text-trust-blue mb-1">💡 ما هي عروض الإيجار (Offers)؟</p>
              <p className="leading-relaxed">
                عروض الإيجار هي مقترحات رسمية يرسلها المالك مباشرة للمستأجرين الذين ينشرون طلباً للبحث عن سكن.
                يتضمن العرض العقار المقترح، قيمة الإيجار الشهري، مبلغ التأمين، وتاريخ بدء العقد.
              </p>
            </div>
          )}

          {/* Current Quotas Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-card border border-hairline bg-surface p-4 shadow-xs">
              <div className="flex items-center gap-2 text-muted text-caption font-semibold">
                <Building2 className="size-4 text-primary" />
                الوحدات المتاحة
              </div>
              {isQuotaLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-title font-bold text-ink">
                  {quota?.freeListingsLeft ?? 1} <span className="text-caption font-normal text-muted">وحدة</span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1 rounded-card border border-hairline bg-surface p-4 shadow-xs">
              <div className="flex items-center gap-2 text-muted text-caption font-semibold">
                <FileCheck2 className="size-4 text-trust-blue" />
                عروض الإيجار
              </div>
              {isQuotaLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-title font-bold text-ink">
                  {quota?.freeOffersLeft ?? 3} <span className="text-caption font-normal text-muted">عرض</span>
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
                  {quota?.optimizerUsesLeft ?? 3} <span className="text-caption font-normal text-muted">استخدام</span>
                </p>
              )}
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
                    <span className="text-body font-bold text-ink">المؤجر المجاني</span>
                    <span className="rounded-pill bg-background px-2 py-0.5 text-caption font-semibold text-muted">مجاناً</span>
                  </div>
                  <p className="text-h2 font-extrabold text-ink mb-3">0 <span className="text-caption font-normal text-muted">ج.م / شهرياً</span></p>
                  <ul className="flex flex-col gap-2 text-caption text-body-text mb-4">
                    <li className="flex items-center gap-1.5"><Check className="size-3.5 text-success shrink-0" /> وحدة عقارية نشطة واحدة</li>
                    <li className="flex items-center gap-1.5"><Check className="size-3.5 text-success shrink-0" /> 3 عروض إيجار للمستأجرين</li>
                    <li className="flex items-center gap-1.5"><Check className="size-3.5 text-success shrink-0" /> 3 تحسينات وصف بالذكاء الاصطناعي</li>
                  </ul>
                </div>
                <span className="text-center rounded-card bg-background py-2 text-caption font-bold text-muted">الخطة الحالية</span>
              </div>

              {/* Owner Plus Plan */}
              <div className="relative flex flex-col justify-between rounded-card border-2 border-primary bg-primary-tint/20 p-4 shadow-sm">
                <span className="absolute -top-3 start-4 rounded-pill bg-primary px-2.5 py-0.5 text-caption font-bold text-white shadow-xs">الأكثر شعبية</span>
                <div>
                  <div className="flex items-center justify-between mb-2 mt-1">
                    <span className="text-body font-bold text-primary">مالك بلس (Owner Plus)</span>
                  </div>
                  <p className="text-h2 font-extrabold text-ink mb-3">499 <span className="text-caption font-normal text-muted">ج.م / شهرياً</span></p>
                  <ul className="flex flex-col gap-2 text-caption text-body-text mb-4">
                    <li className="flex items-center gap-1.5"><Check className="size-3.5 text-primary shrink-0" /> حتى 3 وحدات عقارية نشطة</li>
                    <li className="flex items-center gap-1.5"><Check className="size-3.5 text-primary shrink-0" /> 10 عروض إيجار للمستأجرين</li>
                    <li className="flex items-center gap-1.5"><Check className="size-3.5 text-primary shrink-0" /> 10 تحسينات وصف بالذكاء الاصطناعي</li>
                    <li className="flex items-center gap-1.5"><Check className="size-3.5 text-primary shrink-0" /> تنبيهات أولوية للطلبات المناسبة</li>
                  </ul>
                </div>
                <Button size="sm" onClick={() => setActivePaymentType("OWNER_PLUS")}>
                  اشترك الآن (499 ج.م)
                </Button>
              </div>

              {/* Premium Owner Plan */}
              <div className="flex flex-col justify-between rounded-card border border-hairline bg-surface p-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-bold text-ink">مالك بريميوم (Premium)</span>
                  </div>
                  <p className="text-h2 font-extrabold text-ink mb-3">999 <span className="text-caption font-normal text-muted">ج.م / شهرياً</span></p>
                  <ul className="flex flex-col gap-2 text-caption text-body-text mb-4">
                    <li className="flex items-center gap-1.5"><Check className="size-3.5 text-success shrink-0" /> حتى 5 وحدات عقارية نشطة</li>
                    <li className="flex items-center gap-1.5"><Check className="size-3.5 text-success shrink-0" /> عروض إيجار وتواصل غير محدود</li>
                    <li className="flex items-center gap-1.5"><Check className="size-3.5 text-success shrink-0" /> حزمة ذكاء اصطناعي احترافية</li>
                    <li className="flex items-center gap-1.5"><Check className="size-3.5 text-success shrink-0" /> تحليلات المزايدة وجدولة المعاينات</li>
                  </ul>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setActivePaymentType("PREMIUM_OWNER")}>
                  اشترك بريميوم (999 ج.م)
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
        />
      )}
    </div>
  );
}
