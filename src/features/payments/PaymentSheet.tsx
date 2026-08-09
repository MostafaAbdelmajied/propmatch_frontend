"use client";

import { Button } from "@/src/components/ui/Button";
import { InputField } from "@/src/components/ui/Field";
import { Sheet } from "@/src/components/ui/Sheet";
import { useToast } from "@/src/components/ui/Toast";
import { useQuota } from "@/src/features/landlord/hooks/useLandlord";
import { api } from "@/src/lib/api/browserClient";
import {
  paymentTypePrices,
  type CheckoutSession,
  type PaymentTransaction,
  type CheckoutPaymentType,
} from "@/src/lib/api/contracts/payment";
import { subscribeToPaymentUpdates } from "@/src/lib/socket/useRealtime";
import { cn } from "@/src/utils/cn";
import { formatEGP } from "@/src/utils/format";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Crown,
  ExternalLink,
  Loader2,
  Plus,
  PlusCircle,
  RotateCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { getCheckoutErrorMessage } from "./checkoutError";
import { useCommercialCatalog } from "./useCommercialCatalog";

type Phase = "form" | "creating_checkout" | "checkout" | "checking" | "success" | "error";
const PENDING_PAYMENT_STORAGE_KEY = "propmatch:pending-payment";
export const PAYMENT_SUCCESS_MESSAGE = "تم الدفع بنجاح وإضافة الرصيد والمزايا إلى حسابك.";

export interface PaymentSheetProps {
  open: boolean;
  onClose: () => void;
  paymentType: CheckoutPaymentType;
  /** Required for BOOST_7D / BOOST_14D / BOOST_30D. */
  propertyId?: string;
  /** Fired once the webhook/reconcile-credited entitlement is confirmed. */
  onActivated?: () => void;
}

interface PackageDefinition {
  type: CheckoutPaymentType;
  label: string;
  description: string;
  price: number;
  icon: React.ComponentType<{ className?: string }>;
  additions: string[];
}

export function PaymentSheet({
  open,
  onClose,
  paymentType,
  propertyId,
  onActivated,
}: PaymentSheetProps) {
  const toast = useToast();
  const quotaQuery = useQuota();
  const catalogQuery = useCommercialCatalog();
  const quota = quotaQuery.data;
  const isPaidPackage = quota?.planType && quota.planType !== "FREE";
  const isAiPaywall = paymentType === "AI_USES_10_90D";
  const isOfferPaywall = paymentType === "OFFERS_10_60D";
  const isBoostPaywall = paymentType.startsWith("BOOST_");
  const catalog = catalogQuery.data;
  const price = (type: CheckoutPaymentType) =>
    catalog?.products[type]?.priceEgp ?? paymentTypePrices[type];
  const enabled = (type: CheckoutPaymentType) => catalog?.products[type]?.enabled ?? true;
  const ownerPlus = catalog?.plans.OWNER_PLUS ?? {
    activeListings: 3,
    offers: 30,
    aiUses: 10,
    boostCredits: 1,
    boostDurationDays: 7,
  };
  const premium = catalog?.plans.PREMIUM ?? {
    activeListings: 10,
    offers: 100,
    aiUses: 30,
    boostCredits: 2,
    boostDurationDays: 7,
  };
  const listingAddon = catalog?.products.EXTRA_LISTING_60D;
  const offersAddon = catalog?.products.OFFERS_10_60D;
  const aiAddon = catalog?.products.AI_USES_10_90D;

  const allPackages: PackageDefinition[] = [
    {
      type: "OWNER_PLUS_MONTHLY",
      label: "Owner Plus شهري",
      description:
        quota?.planType === "OWNER_PLUS"
          ? "تمديد باقة Owner Plus الحالية؛ الكوتا تتجدد كل شهر بدون ترحيل"
          : `مناسبة للمالك الذي يدير حتى ${ownerPlus.activeListings} عقارات نشطة`,
      price: price("OWNER_PLUS_MONTHLY"),
      icon: PlusCircle,
      additions: [
        `${ownerPlus.activeListings} عقارات نشطة و${ownerPlus.offers} عرضًا شهريًا`,
        `${ownerPlus.aiUses} استخدامات AI شهريًا`,
        `${ownerPlus.boostCredits} رصيد Boost لمدة ${ownerPlus.boostDurationDays} أيام وتحليلات المطابقات`,
      ],
    },
    {
      type: "OWNER_PLUS_YEARLY",
      label: "Owner Plus سنوي",
      description: "سنة كاملة مع تجدد الكوتا والـBoost كل شهر بدون ترحيل",
      price: price("OWNER_PLUS_YEARLY"),
      icon: PlusCircle,
      additions: [
        "نفس مزايا Owner Plus الشهرية",
        `توفير ${Math.max(0, price("OWNER_PLUS_MONTHLY") * 12 - price("OWNER_PLUS_YEARLY"))} ج.م مقارنة بالدفع الشهري`,
        "صلاحية الاشتراك 12 شهرًا",
      ],
    },
    {
      type: "PREMIUM_MONTHLY",
      label: "Premium شهري",
      description: "للمالك النشط الذي يدير محفظة عقارية صغيرة",
      price: price("PREMIUM_MONTHLY"),
      icon: Crown,
      additions: [
        `${premium.activeListings} عقارات نشطة و${premium.offers} عرض شهريًا`,
        `${premium.aiUses} استخدام AI شهريًا`,
        `${premium.boostCredits} رصيد Boost، كل منها ${premium.boostDurationDays} أيام، وتحليلات كاملة`,
      ],
    },
    {
      type: "PREMIUM_YEARLY",
      label: "Premium سنوي",
      description: "سنة كاملة مع تجدد الكوتا والـBoost كل شهر بدون ترحيل",
      price: price("PREMIUM_YEARLY"),
      icon: Crown,
      additions: [
        "نفس مزايا Premium الشهرية",
        `توفير ${Math.max(0, price("PREMIUM_MONTHLY") * 12 - price("PREMIUM_YEARLY"))} ج.م مقارنة بالدفع الشهري`,
        "صلاحية الاشتراك 12 شهرًا",
      ],
    },
    {
      type: "EXTRA_LISTING_60D",
      label: "عقار نشط إضافي",
      description: "سعة عقار نشط إضافي بدون اشتراك",
      price: price("EXTRA_LISTING_60D"),
      icon: Plus,
      additions: [
        `+${listingAddon?.quantity ?? 1} عقار نشط إضافي`,
        `صلاحية مستقلة لمدة ${listingAddon?.validityDays ?? 60} يومًا`,
        "فترة سماح 7 أيام عند انتهاء السعة",
      ],
    },
    {
      type: "OFFERS_10_60D",
      label: `${offersAddon?.quantity ?? 10} عروض مطابقة`,
      description: `رصيد مؤقت لإرسال ${offersAddon?.quantity ?? 10} عروض على طلبات المستأجرين`,
      price: price("OFFERS_10_60D"),
      icon: Send,
      additions: [
        `${offersAddon?.quantity ?? 10} عروض إضافية`,
        `صلاحية ${offersAddon?.validityDays ?? 60} يومًا`,
        "يُستهلك الرصيد الأقرب انتهاءً أولًا",
      ],
    },
    {
      type: "AI_USES_10_90D",
      label: `${aiAddon?.quantity ?? 10} استخدامات AI`,
      description: "رصيد إضافي لمحسن وصف العقارات",
      price: price("AI_USES_10_90D"),
      icon: Sparkles,
      additions: [
        `${aiAddon?.quantity ?? 10} استخدامات إضافية`,
        `صلاحية ${aiAddon?.validityDays ?? 90} يومًا`,
        "يُستهلك الرصيد الأقرب انتهاءً أولًا",
      ],
    },
    ...(propertyId
      ? [
          {
            type: "BOOST_7D" as CheckoutPaymentType,
            label: `Boost لمدة ${catalog?.products.BOOST_7D?.durationDays ?? 7} أيام`,
            description: `زيادة ظهور الإعلان وترتيبه لمدة ${catalog?.products.BOOST_7D?.durationDays ?? 7} أيام`,
            price: price("BOOST_7D"),
            icon: TrendingUp,
            additions: [
              `أولوية ظهور لمدة ${catalog?.products.BOOST_7D?.durationDays ?? 7} أيام`,
              "التحليلات تبقى حقيقية ولا تُصطنع",
            ],
          },
          {
            type: "BOOST_14D" as CheckoutPaymentType,
            label: `Boost لمدة ${catalog?.products.BOOST_14D?.durationDays ?? 14} يومًا`,
            description: `زيادة ظهور الإعلان وترتيبه لمدة ${catalog?.products.BOOST_14D?.durationDays ?? 14} يومًا`,
            price: price("BOOST_14D"),
            icon: TrendingUp,
            additions: [
              `أولوية ظهور لمدة ${catalog?.products.BOOST_14D?.durationDays ?? 14} يومًا`,
              "يبدأ بعد أي Boost قائم تلقائيًا",
            ],
          },
          {
            type: "BOOST_30D" as CheckoutPaymentType,
            label: `Boost لمدة ${catalog?.products.BOOST_30D?.durationDays ?? 30} يومًا`,
            description: `زيادة ظهور الإعلان وترتيبه لمدة ${catalog?.products.BOOST_30D?.durationDays ?? 30} يومًا`,
            price: price("BOOST_30D"),
            icon: TrendingUp,
            additions: [
              `أولوية ظهور لمدة ${catalog?.products.BOOST_30D?.durationDays ?? 30} يومًا`,
              "يبدأ بعد أي Boost قائم تلقائيًا",
            ],
          },
        ]
      : []),
  ];

  // Filter packages according to trigger paywall context:
  const availablePackages = allPackages.filter((item) => enabled(item.type));
  const packages = isAiPaywall
    ? availablePackages.filter((p) => p.type === "AI_USES_10_90D")
    : isOfferPaywall
      ? availablePackages.filter(
          (p) =>
            p.type === "OFFERS_10_60D" ||
            p.type.includes("OWNER_PLUS") ||
            p.type.includes("PREMIUM"),
        )
      : isBoostPaywall
        ? availablePackages.filter((p) => p.type.startsWith("BOOST_"))
        : availablePackages.filter(
            (p) =>
              p.type === "EXTRA_LISTING_60D" ||
              p.type.includes("OWNER_PLUS") ||
              p.type.includes("PREMIUM"),
          );

  const defaultSelectedType = isAiPaywall
    ? "AI_USES_10_90D"
    : isOfferPaywall
      ? "OFFERS_10_60D"
      : isBoostPaywall
        ? paymentType
        : quota?.planType === "OWNER_PLUS"
          ? "OWNER_PLUS_MONTHLY"
          : "PREMIUM_MONTHLY";

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPaymentType, setSelectedPaymentType] =
    useState<CheckoutPaymentType>(defaultSelectedType);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "WALLET">("CARD");
  const [walletPhone, setWalletPhone] = useState("");
  const [walletPhoneError, setWalletPhoneError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckoutWindowOpen, setIsCheckoutWindowOpen] = useState(false);
  const checkoutWindowRef = useRef<Window | null>(null);
  const closeWatcherRef = useRef<number | null>(null);
  const handledSuccessfulOrderRef = useRef<string | null>(null);

  const completeSuccessfulPayment = useCallback(
    (providerOrderId: string) => {
      if (handledSuccessfulOrderRef.current === providerOrderId) return;
      handledSuccessfulOrderRef.current = providerOrderId;
      window.localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
      setPhase("success");
      toast("success", PAYMENT_SUCCESS_MESSAGE);
      onActivated?.();
    },
    [onActivated, toast],
  );

  useEffect(() => {
    if (isAiPaywall) {
      setSelectedPaymentType("AI_USES_10_90D");
    } else if (isOfferPaywall) {
      setSelectedPaymentType("OFFERS_10_60D");
    } else if (isBoostPaywall) {
      setSelectedPaymentType(paymentType);
    } else if (quota?.planType === "OWNER_PLUS") {
      setSelectedPaymentType("OWNER_PLUS_MONTHLY");
    } else {
      setSelectedPaymentType("PREMIUM_MONTHLY");
    }
  }, [paymentType, isAiPaywall, isOfferPaywall, isBoostPaywall, quota?.planType]);

  useEffect(
    () =>
      subscribeToPaymentUpdates((payment) => {
        if (payment.providerOrderId !== session?.providerOrderId) return;
        stopWatchingCheckoutWindow();
        if (checkoutWindowRef.current && !checkoutWindowRef.current.closed) {
          checkoutWindowRef.current.close();
        }
        setIsCheckoutWindowOpen(false);

        if (payment.status === "SUCCESS") {
          completeSuccessfulPayment(payment.providerOrderId);
          return;
        }

        setErrorMessage(
          "تم رفض عملية الدفع أو إلغاؤها. لم يتم خصم أي رصيد من حسابك داخل PropMatch.",
        );
        setPhase("error");
      }),
    [completeSuccessfulPayment, session?.providerOrderId],
  );

  async function startCheckout() {
    const normalizedWalletPhone = walletPhone.replace(/[\s-]/g, "");
    if (
      paymentMethod === "WALLET" &&
      !/^(?:\+20|0020|0)1[0125]\d{8}$/.test(normalizedWalletPhone)
    ) {
      setWalletPhoneError("أدخل رقم محفظة مصري صحيح، مثل 01012345678");
      return;
    }

    setPhase("creating_checkout");
    setErrorMessage(null);
    setWalletPhoneError(null);
    handledSuccessfulOrderRef.current = null;

    const checkoutWindow = window.open(
      "about:blank",
      "propmatch-payment",
      "popup,width=520,height=760",
    );
    if (!checkoutWindow) {
      setErrorMessage("المتصفح منع فتح نافذة الدفع. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.");
      setPhase("error");
      return;
    }
    checkoutWindow.document.write(
      '<p style="font-family:sans-serif;padding:24px">Preparing secure payment...</p>',
    );
    checkoutWindowRef.current = checkoutWindow;
    setIsCheckoutWindowOpen(true);

    try {
      const checkout = await api.post<CheckoutSession>("payments/checkout", {
        paymentType: selectedPaymentType,
        propertyId,
        method: paymentMethod,
        ...(paymentMethod === "WALLET" ? { walletPhone: normalizedWalletPhone } : {}),
      });
      if (!checkout.checkoutUrl) {
        checkoutWindow.close();
        setIsCheckoutWindowOpen(false);
        setErrorMessage("تعذر تجهيز صفحة الدفع. حاول مرة أخرى.");
        setPhase("error");
        return;
      }

      setSession(checkout);
      window.localStorage.setItem(
        PENDING_PAYMENT_STORAGE_KEY,
        JSON.stringify({
          providerOrderId: checkout.providerOrderId,
          paymentType: checkout.paymentType,
        }),
      );
      checkoutWindow.location.href = checkout.checkoutUrl;
      setPhase("checkout");
      watchCheckoutWindow(checkout.providerOrderId);
    } catch (error) {
      checkoutWindow.close();
      setIsCheckoutWindowOpen(false);
      setErrorMessage(getCheckoutErrorMessage(error));
      setPhase("error");
    }
  }

  function reopenCheckoutWindow() {
    if (!session?.checkoutUrl) return;
    const checkoutWindow = window.open(
      session.checkoutUrl,
      "propmatch-payment",
      "popup,width=520,height=760",
    );
    if (!checkoutWindow) {
      setErrorMessage("المتصفح منع فتح نافذة الدفع. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.");
      return;
    }
    checkoutWindowRef.current = checkoutWindow;
    setIsCheckoutWindowOpen(true);
    watchCheckoutWindow(session.providerOrderId);
  }

  const checkReturnedPayment = useEffectEvent((providerOrderId: string) => {
    void checkPaymentStatus(providerOrderId);
  });

  useEffect(() => {
    function handlePaymentReturn(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "propmatch-payment-return") return;
      if (!session?.providerOrderId) return;

      checkReturnedPayment(session.providerOrderId);
    }

    window.addEventListener("message", handlePaymentReturn);
    return () => window.removeEventListener("message", handlePaymentReturn);
  }, [session]);

  function stopWatchingCheckoutWindow() {
    if (closeWatcherRef.current !== null) {
      window.clearInterval(closeWatcherRef.current);
      closeWatcherRef.current = null;
    }
  }

  function watchCheckoutWindow(providerOrderId: string) {
    stopWatchingCheckoutWindow();

    closeWatcherRef.current = window.setInterval(() => {
      if (checkoutWindowRef.current?.closed) {
        stopWatchingCheckoutWindow();
        setIsCheckoutWindowOpen(false);
        void checkPaymentStatus(providerOrderId);
      }
    }, 500);
  }

  async function checkPaymentStatus(providerOrderId = session?.providerOrderId) {
    if (!providerOrderId) return;

    setPhase("checking");
    setErrorMessage(null);

    try {
      const transaction = await api.get<PaymentTransaction>(`payments/${providerOrderId}`);

      if (transaction.status === "SUCCESS") {
        completeSuccessfulPayment(providerOrderId);
        return;
      }

      if (transaction.status === "FAILED") {
        setErrorMessage(
          "تم رفض عملية الدفع أو إلغاؤها. لم يتم خصم أي رصيد من حسابك داخل PropMatch.",
        );
        setPhase("error");
        return;
      }

      setErrorMessage("لم يتم تأكيد الدفع بعد. إذا أكملت الدفع، حاول التحقق مرة أخرى بعد لحظات.");
      setPhase("checkout");
    } catch {
      setErrorMessage("تعذر التحقق من حالة الدفع. حاول مرة أخرى.");
      setPhase("checkout");
    }
  }

  function reset() {
    stopWatchingCheckoutWindow();
    if (checkoutWindowRef.current && !checkoutWindowRef.current.closed) {
      checkoutWindowRef.current.close();
    }
    setStep(1);
    setPhase("form");
    setSession(null);
    setErrorMessage(null);
    setWalletPhone("");
    setWalletPhoneError(null);
    handledSuccessfulOrderRef.current = null;
    setIsCheckoutWindowOpen(false);
    checkoutWindowRef.current = null;
    onClose();
  }

  const currentAmount = session?.amount ?? price(selectedPaymentType);
  const busy = phase === "creating_checkout" || phase === "checking";
  const selectedPackage =
    packages.find((p) => p.type === selectedPaymentType) ?? packages[0] ?? allPackages[0]!;
  const isSelectedCurrentPlan =
    (selectedPaymentType.startsWith("PREMIUM_") && quota?.planType === "PREMIUM") ||
    (selectedPaymentType.startsWith("OWNER_PLUS_") && quota?.planType === "OWNER_PLUS");

  return (
    <Sheet
      open={open}
      onClose={reset}
      title={
        isAiPaywall
          ? "شراء رصيد الذكاء الاصطناعي"
          : isOfferPaywall
            ? "شراء رصيد العروض المباشرة"
            : "الدفع وترقية كوتا العقارات"
      }
      dismissible={!busy}
      maxWidth="2xl"
    >
      {phase === "form" && (
        <div className="flex flex-col gap-5">
          {/* Stepper Header */}
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-caption font-bold transition-colors",
                  step === 1 ? "bg-primary text-white" : "bg-success text-white",
                )}
              >
                1
              </span>
              <span
                className={cn("text-small font-bold", step === 1 ? "text-primary" : "text-muted")}
              >
                اختيار الباقة
              </span>

              <span className="text-muted font-bold mx-1">←</span>

              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-caption font-bold transition-colors",
                  step === 2 ? "bg-primary text-white" : "bg-hairline text-muted",
                )}
              >
                2
              </span>
              <span
                className={cn("text-small font-bold", step === 2 ? "text-primary" : "text-muted")}
              >
                وسيلة الدفع والتأكيد
              </span>
            </div>

            <span className="text-caption font-bold text-muted">الخطوة {step} من 2</span>
          </div>

          {/* STEP 1: Select Package */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              {/* Header Banner Context */}
              {isAiPaywall ? (
                <div className="rounded-card border border-primary/30 bg-primary-tint/30 p-3.5 text-small text-ink">
                  <p className="font-bold text-primary flex items-center gap-2 text-body">
                    <Sparkles className="size-5 shrink-0 text-primary" />
                    انتهت محاولات الذكاء الاصطناعي المجانية
                  </p>
                  <p className="mt-1 text-caption text-body-text">
                    اشترِ <strong>حزمة الذكاء الاصطناعي الإضافية</strong> للحصول على{" "}
                    <strong>10 استخدامات جديدة</strong> لمحسن الوصف الذكي.
                  </p>
                </div>
              ) : isOfferPaywall ? (
                <div className="rounded-card border border-primary/30 bg-primary-tint/30 p-3.5 text-small text-ink">
                  <p className="font-bold text-primary flex items-center gap-2 text-body">
                    <Send className="size-5 shrink-0 text-primary" />
                    انتهى رصيد العروض المباشرة المجانية
                  </p>
                  <p className="mt-1 text-caption text-body-text">
                    اشترِ <strong>10 عروض إضافية صالحة 60 يومًا</strong>، أو اختر خطة شهرية بسعة 30
                    أو 100 عرض تتجدد بدون ترحيل.
                  </p>
                </div>
              ) : isPaidPackage ? (
                <div className="rounded-card border border-primary/30 bg-primary-tint/30 p-3.5 text-small text-ink">
                  <p className="font-bold text-primary flex items-center gap-2 text-body">
                    <Crown className="size-5 shrink-0 text-primary" />
                    أنت مشترك بالفعل في{" "}
                    {quota?.planType === "PREMIUM" ? "الخطة المميزة" : "خطة Plus"}
                  </p>
                  <p className="mt-1 text-caption text-body-text">
                    يمكنك <strong>إعادة تجديد باقتك الحالية</strong> لشحن رصيد الوحدات والعروض
                    شهريًا بدون ترحيل، أو الترقية لباقة أعلى وشراء إضافة مستقلة عند الحاجة.
                  </p>
                </div>
              ) : (
                <div className="rounded-card border border-primary/30 bg-primary-tint/30 p-3.5 text-small text-ink">
                  <p className="font-bold text-primary flex items-center gap-2 text-body">
                    <Crown className="size-5 shrink-0 text-primary" />
                    وصلت للحد الأقصى للوحدات النشطة المجانية (عقار واحد)
                  </p>
                  <p className="mt-1 text-caption text-body-text">
                    اختر خطة الاشتراك المناسبة أو اشترِ سعة عقار إضافية صالحة 60 يومًا.
                  </p>
                </div>
              )}

              {/* Clean Package Selection Cards */}
              <div className="flex flex-col gap-3">
                <label className="text-small font-bold text-ink">
                  انقر على الباقة المطلوبة لعرض التفاصيل:
                </label>
                <div className="grid gap-3 sm:grid-cols-1">
                  {packages.map((pkg) => {
                    const Icon = pkg.icon;
                    const isSelected = selectedPaymentType === pkg.type;
                    const isCurrentPlan =
                      (pkg.type.startsWith("PREMIUM_") && quota?.planType === "PREMIUM") ||
                      (pkg.type.startsWith("OWNER_PLUS_") && quota?.planType === "OWNER_PLUS");

                    return (
                      <div
                        key={pkg.type}
                        onClick={() => setSelectedPaymentType(pkg.type)}
                        className={cn(
                          "flex flex-col gap-2.5 rounded-card border p-4 transition-all cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary-tint/30 ring-2 ring-primary shadow-sm"
                            : "border-hairline bg-surface hover:border-primary/40 hover:bg-background",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
                                isSelected
                                  ? "bg-primary text-white shadow-xs"
                                  : "bg-hairline/80 text-muted",
                              )}
                            >
                              <Icon className="size-5" />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-body font-bold text-ink">{pkg.label}</p>
                                {isCurrentPlan && (
                                  <span className="rounded-pill bg-success-tint px-2.5 py-0.5 text-caption font-extrabold text-success border border-success/30">
                                    باقتك الحالية
                                  </span>
                                )}
                              </div>
                              <p className="text-caption text-muted">{pkg.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="rounded-pill bg-primary-tint px-3 py-1 text-body font-extrabold text-primary">
                              {formatEGP(pkg.price)}
                            </span>
                            <ChevronDown
                              className={cn(
                                "size-5 text-muted transition-transform duration-200",
                                isSelected && "rotate-180 text-primary",
                              )}
                            />
                          </div>
                        </div>

                        {/* Expanded Package Details when Selected */}
                        {isSelected && (
                          <div className="mt-2 border-t border-hairline/60 pt-3 animate-in fade-in-50 duration-200">
                            <p className="mb-2 text-caption font-bold text-ink flex items-center gap-1">
                              <Sparkles className="size-3.5 text-primary" />
                              المزايا والإضافات المشمولة في الباقة:
                            </p>
                            <ul className="grid gap-1.5 sm:grid-cols-2">
                              {pkg.additions.map((item, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-center gap-2 text-caption font-semibold text-ink"
                                >
                                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success-tint text-success">
                                    <Check className="size-3 stroke-[3]" />
                                  </span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                size="lg"
                block
                disabled={packages.length === 0}
                onClick={() => setStep(2)}
                className="mt-2 py-3.5 text-body font-bold"
              >
                {packages.length === 0
                  ? "هذا المنتج غير متاح حاليًا"
                  : `التالي: اختر طريقة الدفع (${formatEGP(selectedPackage.price)})`}
              </Button>
            </div>
          )}

          {/* STEP 2: Select Payment Method & Confirm */}
          {step === 2 && (
            <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-caption font-bold text-primary hover:underline self-start"
              >
                <ArrowRight className="size-4" />
                العودة لتغيير الباقة المختارة
              </button>

              {/* Selected Package Summary Card */}
              <div className="rounded-card border border-primary/30 bg-primary-tint/20 p-4">
                <div className="flex items-center justify-between border-b border-hairline/60 pb-2.5">
                  <div>
                    <span className="text-caption font-bold text-muted">الباقة المختارة:</span>
                    <p className="text-body font-extrabold text-ink">
                      {isSelectedCurrentPlan
                        ? `إعادة تجديد: ${selectedPackage.label}`
                        : selectedPackage.label}
                    </p>
                  </div>
                  <span className="rounded-pill bg-primary px-3.5 py-1 text-title font-extrabold text-white">
                    {formatEGP(selectedPackage.price)}
                  </span>
                </div>
                <ul className="mt-2.5 flex flex-col gap-1">
                  {selectedPackage.additions.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-caption text-body-text">
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Payment Method Selector Grid */}
              <div className="flex flex-col gap-2.5">
                <label className="text-small font-bold text-ink">
                  اختر طريقة الدفع الفوري (عبر Paymob):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CARD")}
                    className={cn(
                      "flex items-center gap-3 rounded-card border p-3.5 text-right transition-all cursor-pointer",
                      paymentMethod === "CARD"
                        ? "border-primary bg-primary-tint/40 ring-2 ring-primary font-bold text-primary shadow-xs"
                        : "border-hairline bg-surface hover:border-primary/40 text-body-text",
                    )}
                  >
                    <CreditCard className="size-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-small font-bold">بطاقة إلكترونية</p>
                      <p className="text-[11px] text-muted">فيزا / ماستركارد</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("WALLET")}
                    className={cn(
                      "flex items-center gap-3 rounded-card border p-3.5 text-right transition-all cursor-pointer",
                      paymentMethod === "WALLET"
                        ? "border-primary bg-primary-tint/40 ring-2 ring-primary font-bold text-primary shadow-xs"
                        : "border-hairline bg-surface hover:border-primary/40 text-body-text",
                    )}
                  >
                    <Smartphone className="size-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-small font-bold">محفظة إلكترونية</p>
                      <p className="text-[11px] text-muted">فودافون كاش / أورنج / اتصالات / وي</p>
                    </div>
                  </button>
                </div>
              </div>

              {paymentMethod === "WALLET" && (
                <InputField
                  label="رقم الهاتف المرتبط بالمحفظة"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="01012345678"
                  value={walletPhone}
                  onChange={(event) => {
                    setWalletPhone(event.target.value);
                    if (walletPhoneError) setWalletPhoneError(null);
                  }}
                  error={walletPhoneError ?? undefined}
                  hint="استخدم رقم فودافون كاش أو أورنج كاش أو e& cash أو WE Pay."
                  required
                />
              )}

              <p className="flex items-center gap-1.5 text-caption text-muted">
                <ShieldCheck className="size-4 text-success shrink-0" aria-hidden />
                سيتم فتح نافذة دفع آمنة من Paymob لتأكيد العملية بالجنيه المصري.
              </p>

              <Button
                size="lg"
                block
                onClick={startCheckout}
                className="py-3.5 text-body font-bold"
              >
                {paymentMethod === "WALLET" ? (
                  <Smartphone className="size-5" aria-hidden />
                ) : (
                  <CreditCard className="size-5" aria-hidden />
                )}
                {isSelectedCurrentPlan
                  ? `تأكيد ودفع إعادة تجديد الباقة (${formatEGP(currentAmount)})`
                  : `تأكيد ودفع ${selectedPackage.label} (${formatEGP(currentAmount)})`}
              </Button>
            </div>
          )}
        </div>
      )}

      {phase === "creating_checkout" && <LoadingState message="جارٍ تجهيز صفحة الدفع…" />}

      {phase === "checkout" && (
        <div className="flex flex-col gap-4">
          <PaymentSummary
            label={selectedPackage.label}
            amount={currentAmount}
            additions={selectedPackage.additions}
            paymentMethod={paymentMethod}
            isRepurchase={isSelectedCurrentPlan}
          />

          <p className="text-small text-muted">
            أكمل الدفع في النافذة المنبثقة. عند إغلاقها سنحاول التحقق من حالة الدفع تلقائيًا.
          </p>

          {errorMessage && <p className="text-caption text-error">{errorMessage}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              block
              variant="secondary"
              disabled={isCheckoutWindowOpen}
              onClick={reopenCheckoutWindow}
            >
              <ExternalLink className="size-4" aria-hidden />
              فتح نافذة الدفع
            </Button>
            <Button block disabled={isCheckoutWindowOpen} onClick={() => checkPaymentStatus()}>
              <RotateCw className="size-4" aria-hidden />
              تحقّق من الدفع
            </Button>
          </div>
        </div>
      )}

      {phase === "checking" && <LoadingState message="جارٍ التحقق من حالة الدفع…" />}

      {phase === "success" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="size-12 text-success" aria-hidden />
          <p className="text-title font-bold text-ink">تم الدفع بنجاح</p>
          <p className="text-small text-muted">تم شحن وتفعيل الرصيد والمزايا على حسابك.</p>
          <Button block onClick={reset}>
            تم
          </Button>
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertCircle className="size-12 text-error" aria-hidden />
          <p className="text-title font-bold text-ink">تعذرت عملية الدفع</p>
          <p className="text-small text-muted">{errorMessage ?? "حاول مرة أخرى بعد لحظات."}</p>
          <Button block variant="secondary" onClick={() => setPhase("form")}>
            إعادة المحاولة
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function PaymentSummary({
  label,
  amount,
  additions,
  paymentMethod,
  isRepurchase,
}: {
  label: string;
  amount: number;
  additions: string[];
  paymentMethod: "CARD" | "WALLET";
  isRepurchase?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
        <div>
          <p className="text-body font-bold text-ink">
            {isRepurchase ? `إعادة تجديد: ${label}` : label}
          </p>
          <p className="text-caption text-muted">تفعيل وإضافة فورية للرصيد بعد إتمام الدفع</p>
        </div>
        <span className="rounded-pill bg-primary-tint px-3.5 py-1 text-title font-extrabold text-primary">
          {formatEGP(amount)}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 pt-1">
        <p className="text-caption font-bold text-ink">سيتم إضافة الآتي إلى حسابك:</p>
        <ul className="flex flex-col gap-1">
          {additions.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2 text-caption text-body-text">
              <span className="size-1.5 rounded-full bg-primary shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-hairline/60 text-caption font-semibold text-ink">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-success shrink-0" aria-hidden />
          <span>الدفع بالجنيه المصري عبر Paymob</span>
        </div>
        <span className="rounded-pill bg-hairline/60 px-2.5 py-0.5 text-caption font-bold text-ink">
          {paymentMethod === "WALLET" ? "📱 محفظة إلكترونية" : "💳 بطاقة إلكترونية"}
        </span>
      </div>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
      <p className="text-body font-semibold text-ink">{message}</p>
    </div>
  );
}
