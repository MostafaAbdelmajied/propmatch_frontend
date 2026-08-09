"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRegister } from "../hooks/useSession";
import { signupFormSchema, type SignupForm as SignupFormValues } from "../validation/schemas";
import { InputField, SelectField } from "@/src/components/ui/Field";
import { Button } from "@/src/components/ui/Button";
import { isApiClientError } from "@/src/lib/api/browserClient";

export function SignupForm() {
  const router = useRouter();
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { role: "tenant" },
  });

  async function onSubmit(values: SignupFormValues) {
    try {
      const res = await registerUser.mutateAsync(values);
      router.push(
        `/verify-email?email=${encodeURIComponent(res.email)}&resendAvailableAt=${encodeURIComponent(res.resendAvailableAt)}`,
      );
    } catch (e) {
      const message = isApiClientError(e) ? e.message : "تعذر إنشاء الحساب، حاول مرة أخرى";
      setError("root", { message });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <InputField label="الاسم بالكامل" autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
      <InputField
        label="البريد الإلكتروني"
        type="email"
        autoComplete="email"
        placeholder="example@mail.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <InputField
        label="رقم الهاتف"
        type="tel"
        inputMode="numeric"
        placeholder="01xxxxxxxxx"
        error={errors.phoneNumber?.message}
        {...register("phoneNumber")}
      />
      <InputField
        label="كلمة المرور"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <SelectField
        label="نوع الحساب"
        error={errors.role?.message}
        options={[
          { value: "tenant", label: "مستأجر (أبحث عن سكن)" },
          { value: "landlord", label: "مالك عقار (أعرض وحدات للإيجار)" },
        ]}
        {...register("role")}
      />

      {errors.root && (
        <p className="rounded-control bg-error-tint px-3 py-2 text-small text-error" role="alert">
          {errors.root.message}
        </p>
      )}
      <Button type="submit" block loading={isSubmitting} size="lg">
        إنشاء حساب
      </Button>
      <p className="text-center text-small text-muted">
        لديك حساب بالفعل؟{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </form>
  );
}
