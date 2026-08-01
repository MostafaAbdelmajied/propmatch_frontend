"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/src/utils/cn";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Prevent dismissal while an operation is in flight. */
  dismissible?: boolean;
  maxWidth?: "md" | "lg" | "xl" | "2xl" | "3xl";
}

/**
 * Bottom sheet on mobile/tablet, centered modal on desktop (design spec §4.3):
 * scrim at ink/45%, rounded top corners + drag handle on mobile.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  dismissible = true,
  maxWidth = "lg",
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  const widthClass = {
    md: "md:max-w-md",
    lg: "md:max-w-lg",
    xl: "md:max-w-xl",
    "2xl": "md:max-w-2xl",
    "3xl": "md:max-w-3xl",
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div
        className="absolute inset-0 bg-scrim"
        onClick={dismissible ? onClose : undefined}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full max-h-[90dvh] overflow-y-auto bg-surface shadow-sheet",
          "rounded-t-card md:rounded-card",
          widthClass,
          "animate-[sheet-in_.25s_ease-out]",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-pill bg-hairline md:hidden" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-4">
          {title && <h2 className="text-title font-bold text-ink">{title}</h2>}
          {dismissible && (
            <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label="إغلاق">
              <X className="size-5" aria-hidden />
            </button>
          )}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
