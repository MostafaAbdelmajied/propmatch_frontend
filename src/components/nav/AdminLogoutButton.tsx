"use client";

import { useLogout } from "@/src/features/auth/hooks/useSession";
import { LogOut } from "lucide-react";

export function AdminLogoutButton() {
  const logout = useLogout();

  return (
    <button
      type="button"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      className="text-muted hover:text-ink transition-colors disabled:opacity-50"
      aria-label="تسجيل الخروج"
      title="تسجيل الخروج"
    >
      <LogOut className="size-5" aria-hidden />
    </button>
  );
}
