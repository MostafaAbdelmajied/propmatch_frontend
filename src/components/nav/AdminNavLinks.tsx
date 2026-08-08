"use client";

import { useAdminSession } from "@/src/features/admin/hooks/useTeam";
import type { Capability } from "@/src/lib/api/contracts/common";
import { cn } from "@/src/utils/cn";
import { BarChart3, ClipboardCheck, Globe, Headset, ScrollText, UserCheck, Users, UserX } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminLink {
  href: string;
  label: string;
  Icon: typeof ClipboardCheck;
  exact: boolean;
  /** Capability (or any-of a set) required to see this link; undefined = any admin. */
  cap?: Capability | Capability[];
}

const links: AdminLink[] = [
  { href: "/admin", label: "المراجعة", Icon: ClipboardCheck, exact: true },
  { href: "/admin/support", label: "الدعم", Icon: Headset, exact: false, cap: "ticket:reply" },
  { href: "/admin/reports", label: "السجلات", Icon: BarChart3, exact: false, cap: "payment:view" },
  { href: "/admin/team", label: "الفريق", Icon: Users, exact: false, cap: "admin:manage" },
  // Shared page: suspend console (search + pagination) and Active/Suspended/
  // Deleted tabs live behind one /admin/users route now — visible to anyone
  // who can suspend OR delete, matching the backend's GET /admin/users guard.
  { href: "/admin/users", label: "المستخدمون", Icon: UserX, exact: false, cap: ["user:suspend", "user:delete"] },
  { href: "/admin/reactivations", label: "إعادة التفعيل", Icon: UserCheck, exact: false, cap: "user:reactivate" },
  { href: "/admin/activity", label: "السجل", Icon: ScrollText, exact: false, cap: "audit:view" },
  { href: "/admin/settings/regions", label: "المناطق", Icon: Globe, exact: false, cap: "admin:manage" },
];

/**
 * Capability-aware admin nav — scoped sub-roles restored per conflicts.md
 * B2-R, so a kyc-reviewer no longer sees the team or support sections.
 *
 * Hiding a link is UX only; the backend's capability guard is authoritative
 * (docs/analysis/rbac.md, "Enforcement layers").
 */
export function AdminNavLinks() {
  const pathname = usePathname();
  const { data: session } = useAdminSession();
  const caps = session?.capabilities ?? [];

  const isVisible = (cap?: Capability | Capability[]): boolean => {
    if (!cap) return true;
    const required = Array.isArray(cap) ? cap : [cap];
    return required.some((c) => caps.includes(c));
  };
  const visible = links.filter((l) => isVisible(l.cap));

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {visible.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 rounded-control px-3 py-2 text-small font-semibold transition-colors",
              active ? "bg-primary-tint text-primary" : "text-body-text hover:bg-background",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
