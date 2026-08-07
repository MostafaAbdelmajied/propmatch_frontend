import { ContractView } from "@/src/features/contracts/components/ContractView";
import { sharedRouteRoles } from "@/src/features/auth/routePolicy";
import { requireAnyRole } from "@/src/lib/api/serverSession";

export default async function ContractByIdPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyRole(sharedRouteRoles.contracts, "/contracts");
  const { id } = await params;
  return <ContractView contractId={id} />;
}
