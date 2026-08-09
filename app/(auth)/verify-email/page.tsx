import { Suspense } from "react";
import { VerifyEmailForm } from "@/src/features/auth/components/VerifyEmailForm";

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-h1 font-bold text-ink">تأكيد البريد الإلكتروني</h2>
        <p className="mt-1 text-small text-muted">أرسلنا لك رمزًا من 6 أرقام لإكمال إنشاء حسابك.</p>
      </div>
      <Suspense><VerifyEmailForm /></Suspense>
    </div>
  );
}
