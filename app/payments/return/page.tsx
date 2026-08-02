"use client";

import { useEffect } from "react";

export default function PaymentReturnPage() {
  useEffect(() => {
    window.opener?.postMessage(
      { type: "propmatch-payment-return" },
      window.location.origin,
    );

    window.close();
  }, []);

  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <p className="text-body text-muted">جارٍ تأكيد عملية الدفع…</p>
    </main>
  );
}
