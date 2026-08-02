import { requireRole } from "@/src/lib/api/serverSession";
import { TenantRequestForm } from "@/src/features/matching/components/TenantRequestForm";

export default async function NewTenantRequestPage() {
  await requireRole("tenant", "/tenant/requests/new");
  return <TenantRequestForm />;
}
