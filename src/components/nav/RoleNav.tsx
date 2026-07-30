"use client";

import { Logo } from "@/src/components/ui/Logo";
import { useLogout, useSession } from "@/src/features/auth/hooks/useSession";
import { useHideOnScroll } from "@/src/hooks/useHideOnScroll";
import { useSessionUiStore } from "@/src/lib/store/useSessionUiStore";
import { cn } from "@/src/utils/cn";
import { BadgeCheck, Bell, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "./NotificationBell";

export interface NavItem {
  href: string;
  label: string;
  Icon: typeof Bell;
}

export function UserProfileHeaderNav() {
  const { data: user } = useSession();
  const logout = useLogout();

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <NotificationBell />

      {user && (
        <>
          {/* Profile Link Badge */}
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-pill border border-hairline bg-surface/80 px-2.5 py-1 hover:border-primary/40 hover:bg-surface transition-all shadow-xs"
            title="الصفحة الشخصية"
          >
            <div className="relative">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="size-7 rounded-full object-cover border border-primary/30"
                />
              ) : (
                <span className="flex size-7 items-center justify-center rounded-full bg-primary-tint text-caption font-bold text-primary">
                  {user.fullName.charAt(0)}
                </span>
              )}
              {user.verificationStatus === "APPROVED" && (
                <span className="absolute -bottom-0.5 -inset-e-0.5 flex size-3.5 items-center justify-center rounded-full bg-success text-white ring-1 ring-surface shadow-xs" title="حساب موثق">
                  <BadgeCheck className="size-2.5" />
                </span>
              )}
            </div>
            <span className="text-small font-bold text-ink max-w-27.5 truncate hidden sm:inline">
              {user.fullName}
            </span>
          </Link>


          {/* Logout Button */}
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-error-tint hover:text-error transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Mobile: sticky bottom tab bar. Desktop: fixed top nav. Shared between
 * tenant/landlord/admin surfaces — pass role-specific items.
 */
export function RoleNav({
  items,
  rightSlot,
}: {
  items: NavItem[];
  brand?: string;
  rightSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const bottomNavVisible = useSessionUiStore((s) => s.bottomNavVisible);
  useHideOnScroll();

  return (
    <>
      {/* Desktop top nav */}
      <header className="sticky top-0 z-30 hidden border-b border-hairline bg-surface/90 backdrop-blur md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo href="/" />
          <nav className="flex items-center gap-1">
            {items.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-control px-3 py-2 text-small font-semibold transition-colors",
                  isActive(href) ? "bg-primary-tint text-primary" : "text-body-text hover:bg-background",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">{rightSlot}</div>
        </div>
      </header>

      {/* Mobile bottom tab bar — hides on scroll-down, reveals on scroll-up (§4.5) */}
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-hairline bg-surface transition-transform duration-300 md:hidden",
          bottomNavVisible ? "translate-y-0" : "translate-y-full",
        )}
      >
        {items.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-caption font-medium transition-colors",
              isActive(href) ? "text-primary" : "text-muted",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}

export { NotificationBell } from "./NotificationBell";
