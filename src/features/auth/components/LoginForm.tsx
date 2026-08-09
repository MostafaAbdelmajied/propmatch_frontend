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
  const [suspensionNotice, setSuspensionNotice] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  async function onSubmit(values: LoginFormValues) {
    setSuspendedCredentials(null);
    setSuspensionNotice(null);
    try {
      const res = (await login.mutateAsync(values)) as AuthResponse;
      const redirectTo = params.get("redirectTo") ?? landingAfterLogin(res.user.role);
      window.location.href = redirectTo;
    } catch (e) {
      if (isApiClientError(e) && e.statusCode === 403) {
        const code = accountErrorCode(e.body);
        // ACCOUNT_DELETED carries valid credentials (login.mutateAsync only
        // gets there after signIn's password check passes) — the account
        // itself is soft-deleted, so the fix is reactivation, not a retry.
        if (code === "ACCOUNT_DELETED") {
          setSuspendedCredentials(values);
          return;
        }
        // ACCOUNT_SUSPENDED is a live account an admin temporarily or
        // permanently blocked — a completely different state from a
        // deleted "ghost" account. There is no self-service reactivation
        // for this; requesting one would 401 (requestReactivation only
        // ever accepts a *deleted* account). Just show the reason/end
        // date the backend already composed into the message.
        if (code === "ACCOUNT_SUSPENDED") {
          setSuspensionNotice(e.message);
          return;
        }
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

  // A live account an admin blocked — no reactivation flow (that's only for
  // deleted "ghost" accounts, see accountErrorCode). Just show why + until
  // when; the backend already composed the reason/end date into the message.
  if (suspensionNotice) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-control bg-error-tint px-4 py-3 text-small text-error" role="alert">
          <p className="font-bold">حسابك موقوف مؤقتًا</p>
          <p className="mt-1">{suspensionNotice}</p>
        </div>
        <button
          type="button"
          onClick={() => setSuspensionNotice(null)}
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

/** Distinguishes the two 403 account states signIn can return — a deleted
 * "ghost" account (ACCOUNT_DELETED, self-service reactivation available) vs
 * a live but admin-blocked one (ACCOUNT_SUSPENDED, no reactivation flow). */
function accountErrorCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("code" in body)) return null;
  const code = (body as { code: unknown }).code;
  return typeof code === "string" ? code : null;
}
