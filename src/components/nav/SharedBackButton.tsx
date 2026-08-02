"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function SharedBackButton({ fallbackHref = "/" }: { fallbackHref?: string }) {
  const router = useRouter();

  const handleBack = () => {
    // If browser has history in same session, go back; otherwise use fallback route based on role
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1 text-small text-muted transition-colors hover:text-ink"
      aria-label="رجوع"
    >
      <ArrowRight className="size-4" aria-hidden />
      <span>رجوع</span>
    </button>
  );
}
