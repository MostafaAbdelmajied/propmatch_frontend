"use client";

import { cn } from "@/src/utils/cn";
import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { UnifiedAiAssistant } from "./UnifiedAiAssistant";

export function FloatingAiWidget() {
  const [open, setOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 start-6 z-40">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex items-center gap-2.5 rounded-pill bg-primary px-5 py-3 text-small font-bold text-white shadow-xl hover:bg-primary-dark active:scale-95 transition-transform",
            open && "bg-ink hover:bg-ink",
          )}
          aria-label={open ? "إغلاق المساعد الذكي" : "فتح المساعد الذكي"}
        >
          {open ? (
            <>
              <X className="size-5" aria-hidden />
              <span>إغلاق</span>
            </>
          ) : (
            <>
              <Sparkles className="size-5 text-accent-gold" aria-hidden />
              <span>المساعد الذكي</span>
            </>
          )}
        </button>
      </div>

      {/* Floating Window / Fullscreen Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-ink/60">
          <div
            className={cn(
              "relative flex flex-col overflow-hidden bg-surface shadow-2xl",
              isFullscreen
                ? "fixed inset-0 z-50 size-full max-w-none rounded-none"
                : "h-[92vh] w-[95vw] max-w-7xl rounded-card",
            )}
          >
            {/* Embedded Unified Assistant (Single Header Bar inside) */}
            <div className="flex-1 overflow-hidden">
              <UnifiedAiAssistant
                isFullscreen={isFullscreen}
                onToggleFullscreen={() => setIsFullscreen((f) => !f)}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
