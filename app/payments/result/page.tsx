import { Suspense } from "react";
import { PaymentResultClient } from "./PaymentResultClient";

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<PaymentResultLoading />}>
      <PaymentResultClient />
    </Suspense>
  );
}

function PaymentResultLoading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-6 text-center">
      <p className="text-body text-muted">جارٍ التحقق من الدفع…</p>
    </main>
  );
}
