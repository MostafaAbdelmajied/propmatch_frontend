import { LoginForm } from "@/src/features/auth/components/LoginForm";
import { landingAfterLogin } from "@/src/features/auth/roleRouting";
import { getServerSession } from "@/src/lib/api/serverSession";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function LoginPage() {
  const user = await getServerSession();
  if (user) {
    redirect(landingAfterLogin(user.role));
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-h1 font-bold text-ink">تسجيل الدخول</h2>
        <p className="mt-1 text-small text-muted">أهلًا بعودتك</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
