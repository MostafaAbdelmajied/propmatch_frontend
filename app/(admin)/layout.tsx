import { AdminLogoutButton } from "@/src/components/nav/AdminLogoutButton";
import { AdminNavLinks } from "@/src/components/nav/AdminNavLinks";
import { NotificationBell } from "@/src/components/nav/RoleNav";
import { Logo } from "@/src/components/ui/Logo";
import { requireSession } from "@/src/lib/api/serverSession";
import { redirect } from "next/navigation";

/**
 * Admin surface is desktop-first (data-dense). Only role === "admin" may
 * enter — non-admins are redirected. Real authorization is still enforced by
 * the backend on every admin call (see docs/analysis/rbac.md).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession("/admin");
  if (user.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo href="/admin" />
            <span className="rounded-pill bg-primary-tint px-2 py-0.5 text-caption font-bold text-primary">
              لوحة المشرف
            </span>
          </div>
          <AdminNavLinks />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-small font-semibold text-body-text">{user.fullName}</span>
            <AdminLogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
