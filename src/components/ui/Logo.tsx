"use client";

import { cn } from "@/src/utils/cn";
import Link from "next/link";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  href?: string;
  withCard?: boolean;
}

export function Logo({
  className,
  size = "md",
  showText = false,
  href = "/",
  withCard = false,
}: LogoProps) {
  const dimensions = {
    sm: "h-7 w-auto",
    md: "h-9 w-auto",
    lg: "h-12 w-auto",
    xl: "h-14 w-auto",
  }[size];

  const content = (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative overflow-hidden shrink-0 flex items-center justify-center transition-all",
          withCard
            ? "rounded-[22px] bg-white shadow-md border border-white/60 p-3.5 sm:p-4 hover:shadow-lg"
            : "bg-transparent border-0 shadow-none p-0",
          dimensions,
        )}
      >
        <img
          src="/logo.png"
          alt="PropMatch Logo"
          className="h-full w-auto object-contain"
        />
      </div>
      {showText && (
        <span className="text-h2 font-bold tracking-tight text-ink">
          PropMatch <span className="text-primary font-medium text-caption">AI</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block transition-transform hover:scale-105 active:scale-95">
        {content}
      </Link>
    );
  }

  return content;
}
