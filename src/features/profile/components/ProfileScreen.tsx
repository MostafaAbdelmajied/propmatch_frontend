"use client";

import { cn } from "@/src/utils/cn";

import { Button } from "@/src/components/ui/Button";
import { InputField } from "@/src/components/ui/Field";
import { Sheet } from "@/src/components/ui/Sheet";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { VerifiedBadge } from "@/src/components/ui/VerifiedBadge";
import { useLogout, useSession } from "@/src/features/auth/hooks/useSession";
import { useQuota } from "@/src/features/landlord/hooks/useLandlord";
import { PaymentSheet } from "@/src/features/payments/PaymentSheet";
import { api } from "@/src/lib/api/browserClient";
import type { PaymentType } from "@/src/lib/api/contracts/payment";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Camera,
  Check,
  Crown,
  Edit,
  FileCheck2,
  HelpCircle,
  Loader2,
  LogOut,
  Mail,
  Phone,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function compressImage(file: File, maxWidth = 300, maxHeight = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useSession();
  const quotaQuery = useQuota();
  const { data: quota, isLoading: isQuotaLoading } = quotaQuery;
  const logout = useLogout();

  const [activePaymentType, setActivePaymentType] = useState<PaymentType | null>(null);
  const [showOfferInfo, setShowOfferInfo] = useState(false);

  // Avatar uploading state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);

  // Update Account Wizard state
  const [showUpdateWizard, setShowUpdateWizard] = useState(false);
  const [updateStep, setUpdateStep] = useState<1 | 2>(1);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);

  // Delete Account Wizard state
  const [showDeleteWizard, setShowDeleteWizard] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.fullName);
      setEditPhone(user.phoneNumber);
    }
  }, [user]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setAvatarProgress(25);
    try {
      setAvatarProgress(50);
      const compressedBase64 = await compressImage(file);
      setAvatarProgress(75);
      await api.patch("auth/profile", { avatarUrl: compressedBase64 });
      setAvatarProgress(100);
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      setUploadingAvatar(false);
      setAvatarProgress(0);
    } catch (err) {
      console.error(err);
      setUploadingAvatar(false);
      setAvatarProgress(0);
    }
  }

  async function handleUpdateAccountSubmit() {
    setIsUpdatingAccount(true);
    try {
      await api.patch("auth/profile", { fullName: editName, phoneNumber: editPhone });
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      setIsUpdatingAccount(false);
      setShowUpdateWizard(false);
      setUpdateStep(1);
    } catch {
      setIsUpdatingAccount(false);
    }
  }

  async function handleDeleteAccountSubmit() {
    if (deleteConfirmInput !== "حذف" && deleteConfirmInput.toUpperCase() !== "DELETE") return;
    setIsDeletingAccount(true);
    try {
      await api.delete("auth/account");
      await logout.mutateAsync();
      router.push("/");
    } catch {
      setIsDeletingAccount(false);
    }
  }

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, router, user]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!user) return null;

  const isLandlord = user.role === "landlord";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
      {/* Page Title Header */}
      <div>
        <h1 className="text-h1 font-bold text-ink">حسابي</h1>
        <p className="mt-0.5 text-small text-muted">
          إدارة بيانات حسابك، الاشتراكات، ورصيد المزايا
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="flex flex-col gap-5 rounded-card border border-hairline bg-surface p-5 sm:p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar Container with Upload Camera Overlay */}
            <div className="relative shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="size-18 rounded-full object-cover border-2 border-primary/30 shadow-xs"
                />
              ) : (
                <span className="flex size-18 items-center justify-center rounded-full bg-primary-tint text-primary font-extrabold text-h1 shadow-xs">
                  {user.fullName.charAt(0)}
                </span>
              )}

              {uploadingAvatar && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-ink/70 text-white backdrop-blur-xs">
                  <Loader2 className="size-5 animate-spin" />
                  <span className="text-[9px] font-bold mt-0.5">{avatarProgress}%</span>
                </div>
              )}

              <label
                className="absolute -bottom-1 -left-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary-dark transition-all scale-100 hover:scale-110"
                title="تغيير صورة الملف الشخصي"
              >
                <Camera className="size-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            {/* User Details & Status Badges */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-h2 font-bold text-ink">{user.fullName}</h2>
                <span className="rounded-pill bg-hairline px-2.5 py-0.5 text-caption font-semibold text-body-text">
                  {isLandlord ? "مالك عقار" : user.role === "admin" ? "مدير النظام" : "مستأجر"}
                </span>
              </div>
              <div className="mt-0.5">
                <VerifiedBadge status={user.verificationStatus} />
              </div>
            </div>
          </div>

          {/* Active Subscription Badge (For Landlords) */}
          {isLandlord && (
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 border-t sm:border-t-0 border-hairline pt-3 sm:pt-0">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-small font-bold whitespace-nowrap shrink-0 shadow-xs",
                  quota?.planType === "PREMIUM" &&
                    "bg-amber-500/15 text-amber-600 border border-amber-500/30",
                  quota?.planType === "OWNER_PLUS" &&
                    "bg-primary-tint text-primary border border-primary/30",
                  (quota?.planType === "FREE" || !quota?.planType) &&
                    "bg-background text-muted border border-hairline",
                )}
              >
                {quota?.planType === "PREMIUM" && (
                  <Crown className="size-4 shrink-0 text-amber-500" />
                )}
                {quota?.planType === "OWNER_PLUS" && (
                  <Sparkles className="size-4 shrink-0 text-primary" />
                )}
                {quota?.planType === "PREMIUM"
                  ? "الخطة المميزة Premium"
                  : quota?.planType === "OWNER_PLUS"
                    ? "خطة المالك Plus"
                    : "الخطة المجانية"}
              </span>
              {quota?.planExpiresAt && (
                <span className="text-caption text-muted font-semibold whitespace-nowrap">
                  تجدد في {new Date(quota.planExpiresAt).toLocaleDateString("ar-EG")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Contact Info Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-hairline pt-4 text-small text-body-text">
          <p className="flex items-center gap-2 rounded-control bg-background/60 px-3 py-2">
            <Mail className="size-4 text-muted shrink-0" aria-hidden />
            <span className="truncate">{user.email}</span>
          </p>
          <p className="flex items-center gap-2 rounded-control bg-background/60 px-3 py-2">
            <Phone className="size-4 text-muted shrink-0" aria-hidden />
            <span>{user.phoneNumber}</span>
          </p>
        </div>
      </div>

      {/* Verification CTA Banner */}
      {user.verificationStatus !== "APPROVED" && user.role !== "admin" && (
        <Link
          href="/verify"
          className="flex items-center justify-between gap-3 rounded-card border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 hover:bg-amber-500/15 transition-colors shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-5 text-amber-600 shrink-0" aria-hidden />
            <span className="text-small font-bold text-amber-700">
              وثّق حسابك الآن لتفعيل شارة التوثيق والاستفادة الكاملة من المزايا
            </span>
          </div>
          <span className="text-small font-bold text-amber-700 shrink-0">←</span>
        </Link>
      )}

      {/* Landlord Quota & Subscriptions */}
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
                    width: `${Math.min(100, ((quota?.activeUnitCount ?? 0) / (quota?.maxActiveListings ?? 1)) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-muted">الحد الأقصى المسموح به في خطتك الحالية</span>
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
                    width: `${Math.min(100, ((quota?.freeOffersLeft ?? 0) / (quota?.planType === "PREMIUM" ? 50 : quota?.planType === "OWNER_PLUS" ? 10 : 3)) * 100)}%`,
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
                    width: `${Math.min(100, ((quota?.optimizerUsesLeft ?? 0) / (quota?.planType === "PREMIUM" ? 20 : quota?.planType === "OWNER_PLUS" ? 10 : 3)) * 100)}%`,
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
                      <Check className="size-3.5 text-success shrink-0" /> وحدة عقارية نشطة واحدة
                      (1)
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> 3 عروض إيجار مباشرة
                      شهرياً
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> 3 استخدامات محسن الذكاء
                      الاصطناعي
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> إنشاء وتصدير عقود PDF
                      مجاناً
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
                      <Check className="size-3.5 text-success shrink-0" /> عروض إيجار لا محدودة مع
                      المستأجرين
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> 5 استخدامات لمحسن الذكاء
                      الاصطناعي
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success shrink-0" /> تتجدد المزايا شهريًا
                      أثناء الاشتراك
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

              {/* AI Addon Plan */}
              <div className="flex flex-col justify-between rounded-card border border-hairline bg-surface p-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-bold text-ink">باقة الذكاء الاصطناعي</span>
                    <Sparkles className="size-5 text-accent" aria-hidden />
                  </div>
                  <p className="text-h2 font-extrabold text-ink mb-3">
                    199 <span className="text-caption font-normal text-muted">ج.م لمرة واحدة</span>
                  </p>
                  <p className="text-caption leading-relaxed text-body-text mb-4">
                    +10 استخدامات جديدة لمحسن وصف العقار بالذكاء الاصطناعي عند نفاد رصيدك.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActivePaymentType("AI_ADDON")}
                >
                  شراء باقة الذكاء الاصطناعي
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clean, Well-Arranged Account Settings Card */}
      <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 sm:p-6 shadow-card">
        <h3 className="text-title font-bold text-ink">إعدادات الحساب والأمان</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setUpdateStep(1);
              setShowUpdateWizard(true);
            }}
            className="whitespace-nowrap shrink-0 justify-center font-bold"
          >
            <Edit className="size-4 shrink-0" />
            تعديل بيانات الحساب
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={() => logout.mutate()}
            loading={logout.isPending}
            className="whitespace-nowrap shrink-0 justify-center font-bold text-muted hover:text-error hover:bg-error-tint border border-hairline"
          >
            <LogOut className="size-4 shrink-0" />
            تسجيل الخروج
          </Button>

          <Button
            variant="danger"
            size="md"
            onClick={() => {
              setDeleteStep(1);
              setDeleteConfirmInput("");
              setShowDeleteWizard(true);
            }}
            className="whitespace-nowrap shrink-0 justify-center font-bold"
          >
            <Trash2 className="size-4 shrink-0" />
            حذف الحساب نهائياً
          </Button>
        </div>
      </div>

      {/* Update Account Wizard Modal */}
      {showUpdateWizard && (
        <Sheet
          open={showUpdateWizard}
          onClose={() => setShowUpdateWizard(false)}
          title="تعديل بيانات الحساب"
        >
          <div className="flex flex-col gap-4">
            {updateStep === 1 && (
              <div className="flex flex-col gap-3">
                <InputField
                  label="الاسم بالكامل"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="أدخل الاسم بالكامل"
                />
                <InputField
                  label="رقم الهاتف"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                />
                <Button
                  block
                  onClick={() => setUpdateStep(2)}
                  disabled={!editName.trim() || !editPhone.trim()}
                >
                  المتابعة لمراجعة البيانات
                </Button>
              </div>
            )}

            {updateStep === 2 && (
              <div className="flex flex-col gap-4">
                <div className="rounded-card border border-primary/30 bg-primary-tint/20 p-4 text-small">
                  <p className="font-bold text-primary mb-2">مراجعة التعديلات الجديدة:</p>
                  <p className="text-ink font-semibold">
                    الاسم الجديد: <span className="font-normal text-body-text">{editName}</span>
                  </p>
                  <p className="text-ink font-semibold mt-1">
                    رقم الهاتف الجديد:{" "}
                    <span className="font-normal text-body-text">{editPhone}</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" onClick={() => setUpdateStep(1)}>
                    تعديل
                  </Button>
                  <Button onClick={handleUpdateAccountSubmit} loading={isUpdatingAccount}>
                    تأكيد وحفظ
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Sheet>
      )}

      {/* Delete Account Confirmation Wizard Modal */}
      {showDeleteWizard && (
        <Sheet
          open={showDeleteWizard}
          onClose={() => setShowDeleteWizard(false)}
          title="مُوجّه حذف الحساب النهائياً"
        >
          <div className="flex flex-col gap-4">
            {/* Step Indicator */}
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <span
                className={cn(
                  "text-small font-bold",
                  deleteStep === 1 ? "text-error" : "text-muted",
                )}
              >
                ١. تحذير التبعات
              </span>
              <span className="text-caption text-muted">←</span>
              <span
                className={cn(
                  "text-small font-bold",
                  deleteStep === 2 ? "text-error" : "text-muted",
                )}
              >
                ٢. التأكيد والحذف
              </span>
            </div>

            {deleteStep === 1 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3 rounded-card border border-error/30 bg-error-tint p-4 text-small text-error">
                  <AlertTriangle className="size-6 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">تحذير مهم قبل الاستمرار:</p>
                    <p className="mt-1 leading-relaxed">
                      حذف الحساب هو إجراء نهائي لا يمكن التراجع عنه. سيتم حذف جميع عقاراتك المنشورة،
                      ورصيد المزايا والاشتراكات، وجميع عروض الإيجار والرسائل بشكل دائم.
                    </p>
                  </div>
                </div>
                <Button variant="danger" block onClick={() => setDeleteStep(2)}>
                  أفهم التبعات ومتابعة الحذف
                </Button>
              </div>
            )}

            {deleteStep === 2 && (
              <div className="flex flex-col gap-4">
                <p className="text-small font-semibold text-ink">
                  لتأكيد عملية الحذف، اكتب كلمة <span className="font-bold text-error">"حذف"</span>{" "}
                  أو <span className="font-bold text-error">"DELETE"</span> في الحقل أدناه:
                </p>
                <InputField
                  placeholder='اكتب "حذف" هنا'
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" onClick={() => setDeleteStep(1)}>
                    تراجع
                  </Button>
                  <Button
                    variant="danger"
                    disabled={
                      deleteConfirmInput !== "حذف" && deleteConfirmInput.toUpperCase() !== "DELETE"
                    }
                    loading={isDeletingAccount}
                    onClick={handleDeleteAccountSubmit}
                  >
                    تأكيد الحذف النهائي
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Sheet>
      )}

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
