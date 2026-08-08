"use client";

import { Button } from "@/src/components/ui/Button";
import { useSuspensionStore } from "@/src/lib/store/useSuspensionStore";
import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Blocking, real-time suspension notice. Shown the instant an admin suspends
 * the logged-in user (pushed over the socket → useSuspensionStore). The user
 * can only acknowledge, which logs them out and returns them to /login — the
 * server already blocks every request, this makes it immediate and visible.
 */
export function SuspensionModal() {
  const suspension = useSuspensionStore((s) => s.suspension);
  const setSuspension = useSuspensionStore((s) => s.setSuspension);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!suspension) return null;

  async function acknowledge() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Even if logout fails, the account is blocked server-side.
    }
    setSuspension(null);
    router.replace("/login");
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-card border border-error/30 bg-surface p-6 text-center shadow-card">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-error-tint text-error">
          <Ban className="size-7" aria-hidden />
        </div>
        <h2 className="text-h2 font-bold text-ink">تم إيقاف حسابك</h2>
        <p className="mt-2 text-body leading-relaxed text-body-text">{suspension.message}</p>
        {suspension.suspendedUntil ? (
          <p className="mt-3 rounded-control bg-error-tint/50 px-3 py-2 text-small font-bold text-error">
            ينتهي الإيقاف في {suspension.suspendedUntil.slice(0, 10)}
          </p>
        ) : (
          <p className="mt-3 rounded-control bg-error-tint/50 px-3 py-2 text-small font-bold text-error">
            هذا الإيقاف دائم
          </p>
        )}
        <p className="mt-3 text-caption text-muted">
          إذا كنت تعتقد أن هذا خطأ، تواصل مع فريق الدعم.
        </p>
        <Button
          variant="primary"
          block
          loading={loading}
          onClick={acknowledge}
          className="mt-6"
        >
          حسنًا، تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}
