"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/src/components/ui/Button";
import { InputField } from "@/src/components/ui/Field";
import { isApiClientError } from "@/src/lib/api/browserClient";
import { landingAfterLogin } from "../roleRouting";
import { useResendEmailVerification, useVerifyEmail } from "../hooks/useSession";

const schema = z.object({
  email: z.string().email("أدخل بريدًا إلكترونيًا صالحًا"),
  code: z.string().regex(/^\d{6}$/, "أدخل رمز التحقق المكوّن من 6 أرقام"),
});
type Values = z.infer<typeof schema>;

function secondsUntil(value: string | null): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function retryAfterSeconds(error: unknown): number | null {
  if (!isApiClientError(error) || !error.body || typeof error.body !== "object") return null;
  const value = (error.body as { retryAfterSeconds?: unknown }).retryAfterSeconds;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.ceil(value) : null;
}

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verify = useVerifyEmail();
  const resend = useResendEmailVerification();
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    secondsUntil(searchParams.get("resendAvailableAt")),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: searchParams.get("email") ?? "", code: "" },
  });

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [secondsRemaining]);

  async function onSubmit(values: Values) {
    try {
      const response = await verify.mutateAsync(values);
      window.location.replace(landingAfterLogin(response.user.role));
    } catch (error) {
      setNotice(null);
      setError("root", { message: isApiClientError(error) ? error.message : "تعذر التحقق من الرمز. حاول مرة أخرى." });
    }
  }

  async function onResend() {
    const email = getValues("email");
    if (!z.string().email().safeParse(email).success) {
      setError("email", { message: "أدخل بريدًا إلكترونيًا صالحًا أولاً" });
      return;
    }
    try {
      await resend.mutateAsync({ email });
      setSecondsRemaining(60);
      setNotice("تم إرسال رمز جديد إلى بريدك الإلكتروني.");
    } catch (error) {
      const retryAfter = retryAfterSeconds(error);
      if (retryAfter) {
        setSecondsRemaining(retryAfter);
        setNotice("يرجى الانتظار قبل طلب رمز جديد.");
      } else {
        setNotice(null);
        setError("root", { message: isApiClientError(error) ? error.message : "تعذر إرسال الرمز. حاول بعد قليل." });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <InputField label="البريد الإلكتروني" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <InputField label="رمز التحقق" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={6} error={errors.code?.message} {...register("code")} />
      {errors.root && <p className="rounded-control bg-error-tint px-3 py-2 text-small text-error" role="alert">{errors.root.message}</p>}
      {notice && <p className="rounded-control bg-primary-tint px-3 py-2 text-small text-primary" role="status">{notice}</p>}
      <Button type="submit" block loading={isSubmitting} size="lg">تأكيد البريد الإلكتروني</Button>
      <Button type="button" variant="secondary" block loading={resend.isPending} disabled={secondsRemaining > 0} onClick={onResend}>
        {secondsRemaining > 0 ? `إعادة إرسال الرمز بعد ${formatCountdown(secondsRemaining)}` : "إعادة إرسال الرمز"}
      </Button>
      <p className="text-center text-small text-muted">لديك حساب مُفعّل بالفعل؟ <Link href="/login" className="font-semibold text-primary hover:underline">تسجيل الدخول</Link></p>
    </form>
  );
}
