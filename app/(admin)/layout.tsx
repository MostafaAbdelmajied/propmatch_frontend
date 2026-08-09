import { AdminSidebar } from "@/src/components/nav/AdminSidebar";
import { requireRole } from "@/src/lib/api/serverSession";

/**
 * Admin surface is desktop-first (data-dense). Only role === "admin" may
 * enter — non-admins are redirected. Real authorization is still enforced by
 * the backend on every admin call (see docs/analysis/rbac.md).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin", "/admin");

  return (
    <div className="min-h-dvh bg-background lg:flex">
      <AdminSidebar userName={user.fullName} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
