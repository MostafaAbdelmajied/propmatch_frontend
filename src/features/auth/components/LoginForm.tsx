"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLogin, useRequestReactivation } from "../hooks/useSession";
import { loginFormSchema, type LoginForm as LoginFormValues } from "../validation/schemas";
import { InputField } from "@/src/components/ui/Field";
import { Button } from "@/src/components/ui/Button";
import { isApiClientError } from "@/src/lib/api/browserClient";
import { useToast } from "@/src/components/ui/Toast";
import { landingAfterLogin } from "../roleRouting";
import type { AuthResponse } from "@/src/lib/api/contracts/auth";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();
  const requestReactivation = useRequestReactivation();
  const toast = useToast();
  const [suspendedCredentials, setSuspendedCredentials] = useState<LoginFormValues | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  async function onSubmit(values: LoginFormValues) {
    setSuspendedCredentials(null);
    try {
      const res = (await login.mutateAsync(values)) as AuthResponse;
      const redirectTo = params.get("redirectTo") ?? landingAfterLogin(res.user.role);
      window.location.href = redirectTo;
    } catch (e) {
      // ACCOUNT_SUSPENDED carries valid credentials (login.mutateAsync only
      // gets there after signIn's password check passes) — the account
      // itself is soft-deleted, so the fix is reactivation, not a retry.
      if (isApiClientError(e) && e.statusCode === 403 && isAccountSuspendedBody(e.body)) {
        setSuspendedCredentials(values);
        return;
      }
      const message = isApiClientError(e) ? e.message : "تعذر تسجيل الدخول، حاول مرة أخرى";
      setError("root", { message });
    }
  }

  function requestReactivationNow() {
    if (!suspendedCredentials) return;
    requestReactivation.mutate(suspendedCredentials, {
      onSuccess: () => toast("success", "تم إرسال طلب إعادة التفعيل — سيراجعه أحد المشرفين قريبًا."),
      onError: () => toast("error", "تعذر إرسال طلب إعادة التفعيل، حاول مرة أخرى"),
    });
  }

  if (suspendedCredentials) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-control bg-error-tint px-4 py-3 text-small text-error" role="alert">
          <p className="font-bold">هذا الحساب مجدول للحذف</p>
          <p className="mt-1">هل تريد طلب إعادة تفعيله؟</p>
        </div>
        <Button
          type="button"
          block
          size="lg"
          loading={requestReactivation.isPending}
          disabled={requestReactivation.isSuccess}
          onClick={requestReactivationNow}
        >
          طلب إعادة التفعيل
        </Button>
        <button
          type="button"
          onClick={() => setSuspendedCredentials(null)}
          className="text-center text-small font-semibold text-primary hover:underline"
        >
          العودة لتسجيل الدخول
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <InputField
        label="البريد الإلكتروني"
        type="email"
        autoComplete="email"
        placeholder="example@mail.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <InputField
        label="كلمة المرور"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Link href="/forgot-password" className="-mt-1 self-start text-caption font-semibold text-primary hover:underline">
        نسيت كلمة المرور؟
      </Link>
      {errors.root && (
        <p className="rounded-control bg-error-tint px-3 py-2 text-small text-error" role="alert">
          {errors.root.message}
        </p>
      )}
      <Button type="submit" block loading={isSubmitting} size="lg">
        تسجيل الدخول
      </Button>
      <p className="text-center text-small text-muted">
        ليس لديك حساب؟{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          إنشاء حساب
        </Link>
      </p>
    </form>
  );
}

function isAccountSuspendedBody(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    (body as { code: unknown }).code === "ACCOUNT_SUSPENDED"
  );
}
