import { ContractGenerator } from "@/src/features/contracts/components/ContractGenerator";
import { Suspense } from "react";

export default function NewContractPage() {
  return (
    <Suspense>
      <ContractGenerator />
    </Suspense>
  );
}
