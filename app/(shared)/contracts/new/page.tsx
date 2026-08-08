import { ContractGenerator } from "@/src/features/contracts/components/ContractGenerator";
import { sharedRouteRoles } from "@/src/features/auth/routePolicy";
import { requireAnyRole } from "@/src/lib/api/serverSession";
import { Suspense } from "react";

export default async function NewContractPage() {
  await requireAnyRole(sharedRouteRoles.contracts, "/contracts/new");
  return (
    <Suspense>
      <ContractGenerator />
    </Suspense>
  );
}
