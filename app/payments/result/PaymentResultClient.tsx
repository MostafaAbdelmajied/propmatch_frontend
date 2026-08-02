"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { api } from "@/src/lib/api/browserClient";
import type { PaymentTransaction } from "@/src/lib/api/contracts/payment";

const PENDING_PAYMENT_STORAGE_KEY = "propmatch:pending-payment";

type ResultState = "checking" | "success" | "declined" | "pending";

/**
 * Paymob's transaction-response callback lands here after the hosted checkout.
 * The return query is only a customer-facing hint. This page asks the backend
 * to verify the saved order with Paymob; it never grants quota itself.
 */
export function PaymentResultClient() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<ResultState>(() => {
    if (searchParams.get("success") === "false") return "declined";
    return "checking";
  });

  useEffect(() => {
    let cancelled = false;

    async function verifyReturnedPayment() {
      try {
        const raw = window.localStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
        const pending = raw
          ? (JSON.parse(raw) as { paymobOrderId?: string; providerOrderId?: string })
          : null;
        const providerOrderId = pending?.providerOrderId ?? pending?.paymobOrderId;
        if (!providerOrderId) {
          const transactions = await api.post<PaymentTransaction[]>(
            "payments/reconcile-pending",
            {},
          );
          if (!cancelled) {
            setState(
              transactions.some((transaction) => transaction.status === "SUCCESS")
                ? "success"
                : searchParams.get("success") === "true"
                  ? "pending"
                  : "declined",
            );
          }
          return;
        }

        const transaction = await api.post<PaymentTransaction>(
          `payments/${providerOrderId}/reconcile`,
          {},
        );
        if (transaction.status === "SUCCESS") {
          window.localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
          if (!cancelled) setState("success");
          return;
        }
        if (!cancelled) setState(searchParams.get("success") === "false" ? "declined" : "pending");
      } catch {
        // The webhook can still settle the transaction shortly afterwards.
        if (!cancelled) setState("pending");
      }
    }

    void verifyReturnedPayment();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const paid = state === "success";
  const declined = state === "declined";
  const Icon = paid ? CheckCircle2 : declined ? XCircle : Clock3;
  const title = paid
    ? "تم استلام عملية الدفع"
    : declined
      ? "لم تكتمل عملية الدفع"
      : "جارٍ التحقق من الدفع";
  const message = paid
    ? "تم تحديث رصيدك. يمكنك الآن إضافة العقار دون دفع مرة أخرى."
    : declined
      ? "لم يتم تأكيد الدفع. يمكنك المحاولة مرة أخرى."
      : "ننتظر تأكيد Paymob. حدّث الصفحة بعد لحظات إذا لم يتغير الوضع.";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Icon
        className={
          paid ? "size-14 text-success" : declined ? "size-14 text-error" : "size-14 text-primary"
        }
        aria-hidden
      />
      <h1 className="text-h1 font-bold text-ink">{title}</h1>
      <p className="text-body text-muted">{message}</p>
      <Link
        href="/landlord/properties/new"
        className="rounded-control bg-primary px-5 py-3 text-small font-bold text-white"
      >
        العودة إلى إضافة عقار
      </Link>
    </main>
  );
}
