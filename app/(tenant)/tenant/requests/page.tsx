import { requireRole } from "@/src/lib/api/serverSession";
import { TenantRequestList } from "@/src/features/matching/components/TenantRequestList";

// Browse (/tenant) stays public; a tenant's own surfaces are tenant-only —
// otherwise a landlord renders this and every call 403s.
export default async function TenantRequestsPage() {
  await requireRole("tenant", "/tenant/requests");
  return <TenantRequestList />;
}
