"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLogin } from "../hooks/useSession";
import { loginFormSchema, type LoginForm as LoginFormValues } from "../validation/schemas";
import { InputField } from "@/src/components/ui/Field";
import { Button } from "@/src/components/ui/Button";
import { isApiClientError } from "@/src/lib/api/browserClient";
import { landingAfterLogin } from "../roleRouting";
import type { AuthResponse } from "@/src/lib/api/contracts/auth";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  async function onSubmit(values: LoginFormValues) {
    try {
      const res = (await login.mutateAsync(values)) as AuthResponse;
      const redirectTo = params.get("redirectTo") ?? landingAfterLogin(res.user.role);
      window.location.href = redirectTo;
    } catch (e) {
      const message = isApiClientError(e) ? e.message : "تعذر تسجيل الدخول، حاول مرة أخرى";
      setError("root", { message });
    }
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
