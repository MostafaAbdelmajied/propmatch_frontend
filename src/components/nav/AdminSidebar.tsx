"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Globe,
  Headset,
  LayoutDashboard,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { Logo } from "@/src/components/ui/Logo";
import { cn } from "@/src/utils/cn";
import { useAdminSession } from "@/src/features/admin/hooks/useTeam";
import { useAdminQueues } from "@/src/features/admin/hooks/useAdmin";
import type { Capability } from "@/src/lib/api/contracts/common";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { NotificationBell } from "./RoleNav";

interface SidebarLink {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  cap?: Capability;
  badge?: "moderation";
}

const groups: Array<{ label: string; links: SidebarLink[] }> = [
  {
    label: "نظرة عامة",
    links: [{ href: "/admin", label: "لوحة المراجعة", Icon: LayoutDashboard, badge: "moderation" }],
  },
  {
    label: "التشغيل",
    links: [
      { href: "/admin/support", label: "دعم العملاء", Icon: Headset, cap: "ticket:reply" },
    ],
  },
  {
    label: "المستخدمون والفريق",
    links: [
      { href: "/admin/users", label: "المستخدمون", Icon: UserX, cap: "user:suspend" },
      { href: "/admin/reactivations", label: "إعادة التفعيل", Icon: UserCheck, cap: "user:reactivate" },
      { href: "/admin/team", label: "الفريق والصلاحيات", Icon: Users, cap: "admin:manage" },
    ],
  },
  {
    label: "التقارير والإعدادات",
    links: [
      {
        href: "/admin/reports",
        label: "التقارير والتحليلات",
        Icon: BarChart3,
        cap: "payment:view",
      },
      {
        href: "/admin/settings/pricing",
        label: "الأسعار والكوتا",
        Icon: BadgeDollarSign,
        cap: "commercial:manage",
      },
      {
        href: "/admin/settings/regions",
        label: "المناطق والإعدادات",
        Icon: Globe,
        cap: "admin:manage",
      },
      { href: "/admin/activity", label: "سجل النشاط", Icon: Activity, cap: "audit:view" },
    ],
  },
];

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const { data: session } = useAdminSession();
  const { data: queues } = useAdminQueues();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const caps = session?.capabilities ?? [];
  const moderationCount = queues
    ? queues.kycQueue.length +
      queues.propertyQueue.length +
      queues.editedPropertyQueue.length +
      queues.requestQueue.length +
      queues.reviewQueue.length
    : 0;

  const content = (compact: boolean, onNavigate?: () => void) => (
    <>
      <div
        className={cn(
          "flex h-16 items-center border-b border-hairline px-4",
          compact ? "justify-center" : "justify-between",
        )}
      >
        {!compact && <Logo href="/admin" />}
        <button
          type="button"
          onClick={() => (onNavigate ? setMobileOpen(false) : setCollapsed((value) => !value))}
          className={cn(
            "size-9 items-center justify-center rounded-control text-muted hover:bg-background hover:text-ink",
            onNavigate ? "flex" : "hidden lg:flex",
          )}
          aria-label={compact ? "توسيع القائمة" : "طي القائمة"}
        >
          {compact ? <PanelRightOpen className="size-5" /> : <PanelRightClose className="size-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="أقسام لوحة المشرف">
        {groups.map((group) => {
          const visible = group.links.filter((link) => !link.cap || caps.includes(link.cap));
          if (visible.length === 0) return null;
          return (
            <section key={group.label} className="mb-5">
              {!compact && (
                <p className="mb-1 px-3 text-[11px] font-bold text-muted">{group.label}</p>
              )}
              <div className="flex flex-col gap-1">
                {visible.map(({ href, label, Icon, badge }, index) => {
                  const exactHome = href === "/admin";
                  const active = exactHome
                    ? pathname === "/admin" && index === 0
                    : pathname.startsWith(href);
                  return (
                    <Link
                      key={`${group.label}:${label}`}
                      href={href}
                      onClick={onNavigate}
                      title={compact ? label : undefined}
                      className={cn(
                        "flex min-h-10 items-center rounded-control text-small font-semibold transition-colors",
                        compact ? "justify-center px-2" : "gap-3 px-3",
                        active ? "bg-primary text-white" : "text-body-text hover:bg-background",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {!compact && <span className="min-w-0 flex-1 truncate">{label}</span>}
                      {badge === "moderation" && moderationCount > 0 && (
                        <span
                          className={cn(
                            "rounded-pill px-1.5 text-[10px] font-extrabold",
                            active ? "bg-white/20 text-white" : "bg-error-tint text-error",
                          )}
                        >
                          {moderationCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </nav>

      <div className="border-t border-hairline p-3">
        <div className={cn("flex items-center", compact ? "flex-col gap-2" : "gap-2")}>
          <NotificationBell placement={compact ? "end" : "start"} />
          {!compact && (
            <span className="min-w-0 flex-1 truncate text-caption font-bold text-body-text">
              {userName}
            </span>
          )}
          <AdminLogoutButton />
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-l border-hairline bg-surface transition-[width] duration-200 lg:flex",
          collapsed ? "w-20" : "w-72",
        )}
      >
        {content(collapsed)}
      </aside>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-hairline bg-surface px-4 lg:hidden">
        <Logo href="/admin" />
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex size-10 items-center justify-center rounded-control border border-hairline"
            aria-label="فتح قائمة المشرف"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="قائمة المشرف"
        >
          <button
            className="absolute inset-0 bg-ink/50"
            onClick={() => setMobileOpen(false)}
            aria-label="إغلاق القائمة"
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(88vw,22rem)] flex-col bg-surface shadow-xl">
            {content(false, () => setMobileOpen(false))}
          </aside>
        </div>
      )}
    </>
  );
}
