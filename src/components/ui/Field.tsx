"use client";

import { forwardRef, useId, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/src/utils/cn";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  required?: boolean;
  id: string;
  children: React.ReactNode;
}

function FieldWrapper({ label, error, success, hint, required, id, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-small font-semibold text-ink">
          {label}
          {required && <span className="text-error"> *</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="flex items-center gap-1 text-caption text-error" role="alert">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {!error && success && (
        <p className="flex items-center gap-1 text-caption text-success">
          <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
          {success}
        </p>
      )}
      {!error && !success && hint && <p className="text-caption text-muted">{hint}</p>}
    </div>
  );
}

const inputClasses = (hasError?: boolean) =>
  cn(
    "w-full rounded-control border bg-surface px-3.5 py-2.5 text-body text-ink placeholder:text-muted",
    "focus:outline-none focus:ring-2 transition-shadow",
    hasError
      ? "border-error focus:ring-error/30"
      : "border-hairline focus:border-primary focus:ring-primary/20",
    "disabled:bg-background disabled:text-muted disabled:cursor-not-allowed",
  );

export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  successMessage?: string;
  hint?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { label, error, successMessage, hint, required, className, id: idProp, type, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const effectiveType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <FieldWrapper label={label} error={error} success={successMessage} hint={hint} required={required} id={id}>
      <div className="relative flex items-center">
        <input
          ref={ref}
          id={id}
          type={effectiveType}
          className={cn(inputClasses(!!error), isPassword && "pe-10", className)}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute end-3 flex items-center justify-center text-muted hover:text-ink transition-colors focus:outline-none"
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="size-4 shrink-0" /> : <Eye className="size-4 shrink-0" />}
          </button>
        )}
      </div>
    </FieldWrapper>
  );
});

export interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, error, hint, required, className, id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} id={id}>
      <textarea ref={ref} id={id} className={cn(inputClasses(!!error), "min-h-28 resize-y", className)} {...rest} />
    </FieldWrapper>
  );
});

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, required, className, options, placeholder, id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} id={id}>
      <select ref={ref} id={id} className={cn(inputClasses(!!error), "appearance-none", className)} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
});
