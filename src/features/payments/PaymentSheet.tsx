"use client";

import { Button } from "@/src/components/ui/Button";
import { InputField } from "@/src/components/ui/Field";
import { Sheet } from "@/src/components/ui/Sheet";
import { useToast } from "@/src/components/ui/Toast";
import { useQuota } from "@/src/features/landlord/hooks/useLandlord";
import { api } from "@/src/lib/api/browserClient";
import {
  paymentTypeLabels,
  paymentTypePrices,
  type CheckoutSession,
  type PaymentTransaction,
  type PaymentType,
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

type Phase = "form" | "creating_checkout" | "checkout" | "checking" | "success" | "error";
const PENDING_PAYMENT_STORAGE_KEY = "propmatch:pending-payment";
export const PAYMENT_SUCCESS_MESSAGE = "تم الدفع بنجاح وإضافة الرصيد والمزايا إلى حسابك.";

export interface PaymentSheetProps {
  open: boolean;
  onClose: () => void;
  paymentType: PaymentType;
  /** Required for BOOST_LISTING. */
  propertyId?: string;
  /** Fired once the webhook/reconcile-credited entitlement is confirmed. */
  onActivated?: () => void;
}

interface PackageDefinition {
  type: PaymentType;
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
  const quota = quotaQuery.data;
  const isPaidPackage = quota?.planType && quota.planType !== "FREE";
  const isAiPaywall = paymentType === "AI_ADDON";
  const isOfferPaywall = paymentType === "SINGLE_OFFER";

  const allPackages: PackageDefinition[] = [
    {
      type: "PREMIUM_OWNER",
      label: "اشتراك المالك المميز",
      description:
        quota?.planType === "PREMIUM"
          ? "إعادة تجديد اشتراكك المميز الحالي وشحن كوتا الوحدات والعروض بالكامل"
          : "تفعيل كافة مزايا المالك المحترف لـ 5 وحدات عقارية وعروض لا محدودة",
      price: paymentTypePrices.PREMIUM_OWNER,
      icon: Crown,
      additions: [
        "+5 وحدات عقارية نشطة في نفس الوقت",
        "عروض وتواصل غير محدود مع جميع المستأجرين",
        "+5 محاولات استخدام لمحسن الوصف بالذكاء الاصطناعي",
      ],
    },
    {
      type: "OWNER_PLUS",
      label: "اشتراك المالك Plus",
      description:
        quota?.planType === "OWNER_PLUS"
          ? "إعادة تجديد اشتراك Plus الحالي وشحن الكوتا بالكامل"
          : "باقة متوسطة تتيح لك إدارة حتى 3 وحدات عقارية نشطة",
      price: paymentTypePrices.OWNER_PLUS,
      icon: PlusCircle,
      additions: [
        "+3 وحدات عقارية نشطة في نفس الوقت",
        "عروض وتواصل مباشر مع المستأجرين",
        "+3 محاولات استخدام لمحسن الوصف بالذكاء الاصطناعي",
      ],
    },
    {
      type: "SINGLE_LISTING",
      label: "إضافة عقار منفرد واحد",
      description: "نشر وإضافة عقار واحد إضافي بدون اشتراك شهري كامل",
      price: paymentTypePrices.SINGLE_LISTING,
      icon: Plus,
      additions: [
        "+1 فرصة إضافة عقار جديد نشط",
        "تفعيل فوري للعقار فور إتمام الدفع",
        "دفع لمرة واحدة بدون التزام باشتراك شهري",
      ],
    },
    {
      type: "SINGLE_OFFER",
      label: "إرسال عرض منفرد واحد",
      description: "إرسال عرض مباشر واحد لمستأجر دون الحاجة للاشتراك الشهري الكامل",
      price: paymentTypePrices.SINGLE_OFFER,
      icon: Send,
      additions: [
        "+1 فرصة إرسال عرض جديد لمستأجر",
        "تواصل مباشر مع صاحب طلب الاستئجار",
        "دفع لمرة واحدة بدون التزام باشتراك شهري",
      ],
    },
    {
      type: "AI_ADDON",
      label: "حزمة الذكاء الاصطناعي الإضافية",
      description: "إعادة شحن محاولات الذكاء الاصطناعي لتحسين وصياغة العقارات",
      price: paymentTypePrices.AI_ADDON,
      icon: Sparkles,
      additions: [
        "+10 استخدامات جديدة لمحسن الوصف بالذكاء الاصطناعي",
        "صياغة وصف ذكي واحترافي يعتمد على كافة بيانات العقار",
      ],
    },
    ...(propertyId
      ? [
          {
            type: "BOOST_LISTING" as PaymentType,
            label: "تمييز الإعلان العقاري",
            description: "ترقية الإعلان وتثبيته في قمة نتائج البحث",
            price: paymentTypePrices.BOOST_LISTING,
            icon: TrendingUp,
            additions: [
              "تثبيت العقار في أولوية نتائج البحث لـ 30 يوماً",
              "إضافة شارة مميزة للإعلان لزيادة مشاهداته والتواصل",
            ],
          },
        ]
      : []),
  ];

  // Filter packages according to trigger paywall context:
  const packages = isAiPaywall
    ? allPackages.filter((p) => p.type === "AI_ADDON")
    : isOfferPaywall
      ? allPackages.filter(
          (p) => p.type === "SINGLE_OFFER" || p.type === "PREMIUM_OWNER" || p.type === "OWNER_PLUS",
        )
      : allPackages.filter((p) => p.type !== "AI_ADDON" && p.type !== "SINGLE_OFFER");

  const defaultSelectedType = isAiPaywall
    ? "AI_ADDON"
    : isOfferPaywall
      ? quota?.planType === "OWNER_PLUS"
        ? "OWNER_PLUS"
        : quota?.planType === "PREMIUM"
          ? "PREMIUM_OWNER"
          : "SINGLE_OFFER"
      : quota?.planType === "OWNER_PLUS"
        ? "OWNER_PLUS"
        : "PREMIUM_OWNER";

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType>(defaultSelectedType);
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
      setSelectedPaymentType("AI_ADDON");
    } else if (isOfferPaywall) {
      setSelectedPaymentType(
        quota?.planType === "OWNER_PLUS"
          ? "OWNER_PLUS"
          : quota?.planType === "PREMIUM"
            ? "PREMIUM_OWNER"
            : "SINGLE_OFFER",
      );
    } else if (quota?.planType === "OWNER_PLUS") {
      setSelectedPaymentType("OWNER_PLUS");
    } else {
      setSelectedPaymentType("PREMIUM_OWNER");
    }
  }, [paymentType, isAiPaywall, isOfferPaywall, quota?.planType]);

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

  const currentAmount = session?.amount ?? paymentTypePrices[selectedPaymentType];
  const busy = phase === "creating_checkout" || phase === "checking";
  const selectedPackage = packages.find((p) => p.type === selectedPaymentType) ?? packages[0];
  const isSelectedCurrentPlan =
    (selectedPaymentType === "PREMIUM_OWNER" && quota?.planType === "PREMIUM") ||
    (selectedPaymentType === "OWNER_PLUS" && quota?.planType === "OWNER_PLUS");

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
                    اختر <strong>إعادة تجديد باقتك الحالية</strong> للتواصل غير المحدود مع
                    المستأجرين، أو <strong>شراء إرسال عرض منفرد لمرة واحدة</strong>.
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
                    بالكامل، أو الترقية لشراء باقة أعلى/إضافة عقار منفرد.
                  </p>
                </div>
              ) : (
                <div className="rounded-card border border-primary/30 bg-primary-tint/30 p-3.5 text-small text-ink">
                  <p className="font-bold text-primary flex items-center gap-2 text-body">
                    <Crown className="size-5 shrink-0 text-primary" />
                    وصلت للحد الأقصى للوحدات النشطة المجانية (عقار واحد)
                  </p>
                  <p className="mt-1 text-caption text-body-text">
                    اختر خطة اشتراك المالك المناسبة أو اشترِ إضافة عقار منفرد لنشر إعلانك الآن.
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
                      (pkg.type === "PREMIUM_OWNER" && quota?.planType === "PREMIUM") ||
                      (pkg.type === "OWNER_PLUS" && quota?.planType === "OWNER_PLUS");

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
                onClick={() => setStep(2)}
                className="mt-2 py-3.5 text-body font-bold"
              >
                التالي: اختر طريقة الدفع ({formatEGP(selectedPackage.price)})
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
                  : `تأكيد ودفع ${paymentTypeLabels[selectedPaymentType]} (${formatEGP(currentAmount)})`}
              </Button>
            </div>
          )}
        </div>
      )}

      {phase === "creating_checkout" && <LoadingState message="جارٍ تجهيز صفحة الدفع…" />}

      {phase === "checkout" && (
        <div className="flex flex-col gap-4">
          <PaymentSummary
            paymentType={selectedPaymentType}
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
  paymentType,
  amount,
  additions,
  paymentMethod,
  isRepurchase,
}: {
  paymentType: PaymentType;
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
            {isRepurchase
              ? `إعادة تجديد: ${paymentTypeLabels[paymentType]}`
              : paymentTypeLabels[paymentType]}
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
