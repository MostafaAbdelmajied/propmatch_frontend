import { ContractView } from "@/src/features/contracts/components/ContractView";

export default async function ContractByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContractView contractId={id} />;
}
