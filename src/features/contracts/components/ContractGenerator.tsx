"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { useSession } from "@/src/features/auth/hooks/useSession";
import { useLeaseContract, useLeaseContractPrefill, useSaveDraft } from "../hooks/useLeaseContract";
import { ContractBuilder } from "../builder/ContractBuilder";
import type { DraftPayload } from "../builder/types";

const EMPTY_PREFILL = { ownerName: "", ownerNationalId: null, tenantName: "", tenantNationalId: null, propertyAddress: "", suggestedRentAmount: 0 };

/** The builder only saves draft revisions. Tenant review happens on the saved detail page. */
export function ContractGenerator() {
  const router = useRouter();
  const matchConnectionId = useSearchParams().get("matchConnectionId") ?? "";
  const role = useSession().data?.role === "landlord" ? "landlord" : "tenant";
  const existing = useLeaseContract(matchConnectionId);
  // A saved draft already contains all server-derived values. Avoid making a
  // second match-prefill request before a landlord can reopen it for editing.
  const prefill = useLeaseContractPrefill(role === "landlord" && !existing.data ? matchConnectionId : "");
  const saveDraft = useSaveDraft(matchConnectionId);
  if (!matchConnectionId) return <EmptyState title="لا يمكن إنشاء عقد بدون صفقة قائمة" description="عقد الإيجار يُنشأ من محادثة صفقة متصلة بين المالك والمستأجر." />;
  if (existing.isLoading || (!existing.data && prefill.isLoading)) return <div className="mx-auto flex max-w-2xl flex-col gap-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-64 w-full" /></div>;
  if (existing.isError || (!existing.data && role === "landlord" && prefill.isError)) return <ErrorState onRetry={() => { existing.refetch(); prefill.refetch(); }} />;
  const save = (payload: DraftPayload) => saveDraft.mutate({ rentAmount: payload.rentAmount, startDate: payload.startDate, endDate: payload.endDate, customClauses: payload.customClauses }, { onSuccess: (contract) => router.push(`/contracts/${contract.id}`) });
  return <div className="flex flex-col gap-3"><ContractBuilder role={role} prefill={prefill.data ?? EMPTY_PREFILL} contract={existing.data ?? null} onSendForReview={save} onApprove={() => existing.data && router.push(`/contracts/${existing.data.id}`)} onReject={() => undefined} sending={saveDraft.isPending} approving={false} rejecting={false} />{saveDraft.isError && <p className="mx-auto max-w-3xl text-end text-small text-error" role="alert">تعذر حفظ المسودة. حاول مرة أخرى.</p>}</div>;
}
