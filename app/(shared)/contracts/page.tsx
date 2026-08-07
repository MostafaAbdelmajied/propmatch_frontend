import { MyContracts } from "@/src/features/contracts/components/MyContracts";
import { sharedRouteRoles } from "@/src/features/auth/routePolicy";
import { requireAnyRole } from "@/src/lib/api/serverSession";

export default async function ContractsPage() {
  await requireAnyRole(sharedRouteRoles.contracts, "/contracts");
  return <MyContracts />;
}
