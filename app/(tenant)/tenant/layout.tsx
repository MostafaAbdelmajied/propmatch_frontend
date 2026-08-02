import { requireRole } from "@/src/lib/api/serverSession";

export default async function TenantGuardLayout({ children }: { children: React.ReactNode }) {
  await requireRole("tenant", "/tenant");
  return <>{children}</>;
}
