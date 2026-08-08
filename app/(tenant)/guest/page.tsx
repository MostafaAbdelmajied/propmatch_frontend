import { TenantBrowse } from "@/src/features/listings/components/TenantBrowse";
import { getServerSession } from "@/src/lib/api/serverSession";

export default async function GuestBrowsePage() {
  const user = await getServerSession();
  return <TenantBrowse canBrowseTenantRequests={user?.role !== "tenant"} />;
}
