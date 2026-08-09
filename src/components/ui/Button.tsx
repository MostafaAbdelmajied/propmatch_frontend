"use client";

import { forwardRef } from "react";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/src/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  success?: boolean;
  block?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-dark active:bg-primary-dark disabled:bg-primary/50",
  // Solid primary fill with white text — every teal-colored button reads the
  // same. Call sites can still override bg/text via className (e.g. the
  // white-on-hero button on the landing page).
  secondary:
    "bg-primary text-white hover:bg-primary-dark active:bg-primary-dark disabled:bg-primary/50",
  ghost: "bg-transparent text-primary hover:bg-primary-tint active:bg-primary/10 disabled:opacity-50",
  danger: "bg-error text-white hover:bg-error/90 active:bg-error/80 disabled:bg-error/50",
};

const sizeClasses: Record<Size, string> = {
  sm: "min-h-9 py-2 px-4 text-small leading-snug justify-center text-center",
  md: "min-h-11 py-2.5 px-5 text-body leading-normal justify-center text-center",
  lg: "min-h-12 py-3 px-6 text-body leading-normal justify-center text-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, success, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {success && !loading && <Check className="size-4" aria-hidden />}
      {children}
    </button>
  );
});
