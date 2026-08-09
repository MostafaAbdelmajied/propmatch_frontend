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
  const openingSuspensionAppeal = params.get("suspensionAppeal") === "1";
  const [deletedCredentials, setDeletedCredentials] = useState<LoginFormValues | null>(null);
  const [suspensionCredentials, setSuspensionCredentials] = useState<LoginFormValues | null>(null);
  const [suspensionNotice, setSuspensionNotice] = useState<string | null>(null);
  const [appealMessage, setAppealMessage] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  async function onSubmit(values: LoginFormValues) {
    setDeletedCredentials(null);
    setSuspensionCredentials(null);
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
          setDeletedCredentials(values);
          return;
        }
        // A suspended account remains blocked, but verified credentials may
        // create one support appeal ticket for admin review.
        if (code === "ACCOUNT_SUSPENDED") {
          setSuspensionCredentials(values);
          setSuspensionNotice(e.message);
          return;
        }
        if (code === "EMAIL_NOT_VERIFIED") {
          router.replace(`/verify-email?email=${encodeURIComponent(values.email)}`);
          return;
        }
      }
      const message = isApiClientError(e) ? e.message : "تعذر تسجيل الدخول، حاول مرة أخرى";
      setError("root", { message });
    }
  }

  function requestReactivationNow() {
    if (!deletedCredentials) return;
    requestReactivation.mutate(deletedCredentials, {
      onSuccess: () => toast("success", "تم إرسال طلب إعادة التفعيل — سيراجعه أحد المشرفين قريبًا."),
      onError: () => toast("error", "تعذر إرسال طلب إعادة التفعيل، حاول مرة أخرى"),
    });
  }

  function requestSuspensionReview() {
    if (!suspensionCredentials || appealMessage.trim().length < 10) return;
    requestReactivation.mutate(
      { ...suspensionCredentials, message: appealMessage.trim() },
      {
        onSuccess: () =>
          toast("success", "تم إرسال رسالتك إلى خدمة العملاء لمراجعة إيقاف الحساب."),
        onError: () => toast("error", "تعذر إرسال التذكرة، حاول مرة أخرى"),
      },
    );
  }

  if (deletedCredentials) {
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
          onClick={() => setDeletedCredentials(null)}
          className="text-center text-small font-semibold text-primary hover:underline"
        >
          العودة لتسجيل الدخول
        </button>
      </div>
    );
  }

  if (suspensionNotice && suspensionCredentials) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-control bg-error-tint px-4 py-3 text-small text-error" role="alert">
          <p className="font-bold">تم إيقاف حسابك</p>
          <p className="mt-1">{suspensionNotice}</p>
        </div>
        <label className="flex flex-col gap-1.5 text-small font-semibold text-body-text">
          رسالتك إلى خدمة العملاء
          <textarea
            aria-label="رسالتك إلى خدمة العملاء"
            value={appealMessage}
            maxLength={1000}
            onChange={(event) => setAppealMessage(event.target.value)}
            placeholder="اكتب شكوتك أو اسأل عن الخطوات المطلوبة لحل إيقاف الحساب…"
            className="min-h-28 rounded-control border border-hairline bg-surface px-3.5 py-2.5 text-body font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-caption font-normal text-muted">10 أحرف على الأقل</span>
        </label>
        <Button
          type="button"
          block
          loading={requestReactivation.isPending}
          disabled={appealMessage.trim().length < 10 || requestReactivation.isSuccess}
          onClick={requestSuspensionReview}
        >
          إرسال إلى خدمة العملاء
        </Button>
        <button
          type="button"
          onClick={() => {
            setSuspensionNotice(null);
            setSuspensionCredentials(null);
            setAppealMessage("");
          }}
          className="text-center text-small font-semibold text-primary hover:underline"
        >
          العودة لتسجيل الدخول
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {openingSuspensionAppeal && (
        <div className="rounded-control border border-primary/25 bg-primary-tint px-4 py-3 text-small text-body-text">
          <p className="font-bold text-primary">التواصل مع خدمة العملاء بشأن إيقاف الحساب</p>
          <p className="mt-1">
            أدخل بيانات حسابك لتأكيد هويتك، ثم ستتمكن من كتابة شكوتك أو السؤال عن طريقة حل
            الإيقاف.
          </p>
        </div>
      )}
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
 * account uses the activation queue; a suspended account uses a support
 * appeal ticket while remaining blocked. */
function accountErrorCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("code" in body)) return null;
  const code = (body as { code: unknown }).code;
  return typeof code === "string" ? code : null;
}
