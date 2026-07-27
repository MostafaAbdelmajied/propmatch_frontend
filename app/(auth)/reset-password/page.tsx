import { ResetPasswordForm } from "@/src/features/auth/components/ResetPasswordForm";
import { Suspense } from "react";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-h1 font-bold text-ink">تعيين كلمة مرور جديدة</h2>
        <p className="mt-1 text-small text-muted">أدخل كلمة المرور الجديدة لحسابك</p>
      </div>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
