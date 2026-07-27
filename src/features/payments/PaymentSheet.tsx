"use client";

import { Button } from "@/src/components/ui/Button";
import { Sheet } from "@/src/components/ui/Sheet";
import { api } from "@/src/lib/api/browserClient";
import {
  paymentTypeLabels,
  paymentTypePrices,
  type CheckoutSession,
  type PaymentTransaction,
  type PaymentType,
} from "@/src/lib/api/contracts/payment";
import { formatEGP } from "@/src/utils/format";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Phase = "form" | "creating_checkout" | "checkout" | "checking" | "success" | "error";

export interface PaymentSheetProps {
  open: boolean;
  onClose: () => void;
  paymentType: PaymentType;
  /** Required for BOOST_LISTING. */
  propertyId?: string;
  /** Fired once the webhook/reconcile-credited entitlement is confirmed. */
  onActivated?: () => void;
}

export function PaymentSheet({
  open,
  onClose,
  paymentType,
  propertyId,
  onActivated,
}: PaymentSheetProps) {
  const [phase, setPhase] = useState<Phase>("form");
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckoutWindowOpen, setIsCheckoutWindowOpen] = useState(false);
  const checkoutWindowRef = useRef<Window | null>(null);
  const closeWatcherRef = useRef<number | null>(null);
  const popupStatusCheckInFlightRef = useRef(false);

  async function startCheckout() {
    setPhase("creating_checkout");
    setErrorMessage(null);

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
        paymentType,
        propertyId,
      });
      if (!checkout.checkoutUrl) {
        checkoutWindow.close();
        setIsCheckoutWindowOpen(false);
        setErrorMessage("تعذر تجهيز صفحة الدفع. حاول مرة أخرى.");
        setPhase("error");
        return;
      }

      setSession(checkout);
      checkoutWindow.location.href = checkout.checkoutUrl;
      setPhase("checkout");
      watchCheckoutWindow(checkout.providerOrderId);
    } catch {
      checkoutWindow.close();
      setIsCheckoutWindowOpen(false);
      setErrorMessage("تعذر بدء عملية الدفع. حاول مرة أخرى.");
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

  useEffect(() => {
    function handlePaymentReturn(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "propmatch-payment-return") return;
      if (!session?.providerOrderId) return;

      void checkPaymentStatus(session.providerOrderId);
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
        return;
      }

      void refreshOpenCheckoutStatus(providerOrderId);
    }, 2000);
  }

  async function refreshOpenCheckoutStatus(providerOrderId: string) {
    if (popupStatusCheckInFlightRef.current) return;
    popupStatusCheckInFlightRef.current = true;

    try {
      const transaction = await api.post<PaymentTransaction>(
        `payments/${providerOrderId}/reconcile`,
        {},
      );
      if (transaction.status !== "SUCCESS" && transaction.status !== "FAILED") return;

      stopWatchingCheckoutWindow();
      if (checkoutWindowRef.current && !checkoutWindowRef.current.closed) {
        checkoutWindowRef.current.close();
      }
      setIsCheckoutWindowOpen(false);

      if (transaction.status === "SUCCESS") {
        setPhase("success");
        onActivated?.();
        return;
      }

      setErrorMessage("تم رفض عملية الدفع أو إلغاؤها. لم يتم خصم أي رصيد من حسابك داخل PropMatch.");
      setPhase("error");
    } catch {
      // The next interval retries; a transient network error must not close checkout.
    } finally {
      popupStatusCheckInFlightRef.current = false;
    }
  }

  async function checkPaymentStatus(providerOrderId = session?.providerOrderId) {
    if (!providerOrderId) return;

    setPhase("checking");
    setErrorMessage(null);

    try {
      await api.post<PaymentTransaction>(`payments/${providerOrderId}/reconcile`, {});
      const status = await pollTerminalStatus(providerOrderId);

      if (status === "SUCCESS") {
        setPhase("success");
        onActivated?.();
        return;
      }

      if (status === "FAILED") {
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

  async function pollTerminalStatus(
    providerOrderId: string,
  ): Promise<PaymentTransaction["status"] | null> {
    for (let i = 0; i < 12; i++) {
      const tx = await api.get<PaymentTransaction>(`payments/${providerOrderId}`);
      if (tx.status === "SUCCESS" || tx.status === "FAILED") return tx.status;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    return null;
  }

  function reset() {
    stopWatchingCheckoutWindow();
    if (checkoutWindowRef.current && !checkoutWindowRef.current.closed) {
      checkoutWindowRef.current.close();
    }
    setPhase("form");
    setSession(null);
    setErrorMessage(null);
    setIsCheckoutWindowOpen(false);
    checkoutWindowRef.current = null;
    onClose();
  }

  const amount = session?.amount ?? paymentTypePrices[paymentType];
  const busy = phase === "creating_checkout" || phase === "checking";

  return (
    <Sheet open={open} onClose={reset} title="الدفع الآمن" dismissible={!busy}>
      {phase === "form" && (
        <div className="flex flex-col gap-4">
          <PaymentSummary paymentType={paymentType} amount={amount} />

          <p className="flex items-center gap-1.5 text-caption text-muted">
            <ShieldCheck className="size-3.5" aria-hidden />
            سيتم فتح نافذة دفع آمنة من مزود الدفع. لا يتم إدخال بيانات البطاقة داخل PropMatch.
          </p>

          <Button size="lg" block onClick={startCheckout}>
            <CreditCard className="size-4" aria-hidden />
            المتابعة إلى الدفع
          </Button>
        </div>
      )}

      {phase === "creating_checkout" && <LoadingState message="جارٍ تجهيز صفحة الدفع…" />}

      {phase === "checkout" && (
        <div className="flex flex-col gap-4">
          <PaymentSummary paymentType={paymentType} amount={amount} />

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
          <p className="text-small text-muted">تم تفعيل الخدمة على حسابك.</p>
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

function PaymentSummary({ paymentType, amount }: { paymentType: PaymentType; amount: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
        <div>
          <p className="text-body font-bold text-ink">{paymentTypeLabels[paymentType]}</p>
          <p className="text-caption text-muted">تفعيل فوري للخدمة بعد إتمام العملية</p>
        </div>
        <span className="rounded-pill bg-primary-tint px-3 py-1 text-title font-extrabold text-primary">
          {formatEGP(amount)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 pt-1 text-caption font-semibold text-ink">
        <ShieldCheck className="size-4 text-success" aria-hidden />
        <span>الدفع المباشر بالجنيه المصري عبر Paymob</span>
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
