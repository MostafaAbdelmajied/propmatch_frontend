"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { InputField } from "@/src/components/ui/Field";
import { Button } from "@/src/components/ui/Button";
import { api, isApiClientError } from "@/src/lib/api/browserClient";

const schema = z
  .object({
    password: z.string().min(6, "كلمة المرور يجب أن لا تقل عن 6 أحرف"),
    confirmPassword: z.string().min(6, "تأكيد كلمة المرور مطلوب"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    if (!token) {
      setError("root", { message: "رابط إعادة التعيين غير صالحة أو مفقود" });
      return;
    }

    try {
      await api.post("auth/reset-password", {
        token,
        newPassword: values.password,
      });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (e) {
      const message = isApiClientError(e)
        ? e.message
        : "رابط إعادة التعيين غير صالح أو انتهت صلاحيته";
      setError("root", { message });
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-success-tint text-success">
          <CheckCircle2 className="size-7" aria-hidden />
        </span>
        <h2 className="text-h2 font-bold text-ink">تم تغيير كلمة المرور</h2>
        <p className="max-w-sm text-small text-muted">
          تم تحديث كلمة المرور الخاصة بك بنجاح. جاري تحويلك لصفحة تسجيل الدخول…
        </p>
        <Link href="/login" className="text-small font-semibold text-primary hover:underline">
          الانتقال لتسجيل الدخول فوراً
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="rounded-control bg-error-tint p-4 text-small text-error">
          رابط إعادة تعيين كلمة المرور مفقود أو غير صالح. يرجى طلب رابط جديد.
        </p>
        <Link href="/forgot-password" className="text-small font-semibold text-primary hover:underline">
          طلب رابط جديد
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <InputField
        label="كلمة المرور الجديدة"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <InputField
        label="تأكيد كلمة المرور الجديدة"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      {errors.root && (
        <p className="rounded-control bg-error-tint px-3 py-2 text-small text-error" role="alert">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" block loading={isSubmitting} size="lg">
        حفظ كلمة المرور الجديدة
      </Button>

      <p className="text-center text-small text-muted">
        العودة إلى{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </form>
  );
}
