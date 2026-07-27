"use client";

import { Skeleton } from "@/src/components/ui/Skeleton";
import { ErrorState } from "@/src/components/ui/States";
import { useLeaseContractById } from "../hooks/useLeaseContract";
import { ContractPreview } from "./ContractPreview";

/**
 * The canonical view for one specific lease contract, addressed by its own
 * UUID (never re-derived from an owner/tenant pair) — see
 * useLeaseContractById.
 */
export function ContractView({ contractId }: { contractId: string }) {
  const { data, isLoading, isError, refetch } = useLeaseContractById(contractId);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return <ContractPreview contract={data} />;
}
