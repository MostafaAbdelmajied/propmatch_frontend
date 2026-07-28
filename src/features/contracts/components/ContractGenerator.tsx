"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { isApiClientError } from "@/src/lib/api/browserClient";
import { useSession } from "@/src/features/auth/hooks/useSession";
import {
  useApproveContract,
  useLeaseContract,
  useLeaseContractPrefill,
  useRejectContract,
  useSaveDraft,
  useSendForReview,
} from "../hooks/useLeaseContract";
import { ContractBuilder } from "../builder/ContractBuilder";
import type { DraftPayload } from "../builder/types";

const EMPTY_PREFILL = {
  ownerName: "",
  ownerNationalId: null,
  tenantName: "",
  tenantNationalId: null,
  propertyAddress: "",
  suggestedRentAmount: 0,
};

/**
 * Tied to a real CONNECTED match (?matchConnectionId=...). Handshake model:
 * the landlord drafts here directly; the tenant reviews here too, but only
 * once the landlord has sent it (status "reviewing"). Once the tenant
 * approves (status "generated"), this redirects to /contracts/[id] — the
 * canonical, UUID-addressed view. Two different transactions between the
 * same two people (e.g. a different unit later) are two different match
 * connections, so this never re-shows a stale contract by accident.
 */
export function ContractGenerator() {
  const router = useRouter();
  const matchConnectionId = useSearchParams().get("matchConnectionId") ?? "";
  const session = useSession();
  const role = session.data?.role === "landlord" ? "landlord" : "tenant";

  const existing = useLeaseContract(matchConnectionId);
  // Only the landlord ever needs prefill data (to seed a brand-new draft).
  const prefill = useLeaseContractPrefill(role === "landlord" ? matchConnectionId : "");
  const saveDraft = useSaveDraft(matchConnectionId);
  const sendForReview = useSendForReview(matchConnectionId);
  const approve = useApproveContract(matchConnectionId);
  const reject = useRejectContract(matchConnectionId);

  useEffect(() => {
    if (existing.data?.status === "generated") {
      router.replace(`/contracts/${existing.data.id}`);
    }
  }, [existing.data, router]);

  useEffect(() => {
    if (approve.data?.status === "generated") {
      router.replace(`/contracts/${approve.data.id}`);
    }
  }, [approve.data, router]);

  if (!matchConnectionId) {
    return (
      <EmptyState
        title="لا يمكن إنشاء عقد بدون صفقة قائمة"
        description="عقد الإيجار يُنشأ من صفحة محادثة صفقة متصلة بين المالك والمستأجر."
      />
    );
  }

  if (session.isLoading || existing.isLoading || existing.data?.status === "generated" || approve.data) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (existing.isError) {
    return <ErrorState onRetry={() => existing.refetch()} />;
  }

  const needsPrefill = role === "landlord" && (existing.data?.status ?? "drafting") === "drafting";
  if (needsPrefill && prefill.isLoading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (needsPrefill && (prefill.isError || !prefill.data)) {
    return <ErrorState onRetry={() => prefill.refetch()} />;
  }

  function actionErrorMessage(error: unknown, fallback: string): string | null {
    if (!error) return null;
    const code = isApiClientError(error) ? (error.body as { code?: string } | undefined)?.code : undefined;
    if (code === "IDENTITY_NOT_VERIFIED") return "لا يمكن الموافقة قبل اكتمال توثيق الهوية لطرفي الصفقة.";
    if (code === "DRAFT_LOCKED") return "العقد بانتظار مراجعة المستأجر، لا يمكن تعديله الآن.";
    return fallback;
  }

  const actionError =
    actionErrorMessage(saveDraft.error, "تعذر حفظ المسودة. حاول مرة أخرى.") ??
    actionErrorMessage(sendForReview.error, "تعذر إرسال العقد. حاول مرة أخرى.") ??
    actionErrorMessage(approve.error, "تعذر إتمام الموافقة. حاول مرة أخرى.") ??
    actionErrorMessage(reject.error, "تعذر إرسال طلب التعديل. حاول مرة أخرى.");

  /** "Send to Tenant for Review" is one click but two calls: save the
   * draft's current contents, then lock it — send-for-review requires an
   * existing draft row to exist. */
  function handleSendForReview(payload: DraftPayload) {
    saveDraft.mutate(
      {
        rentAmount: payload.rentAmount,
        startDate: payload.startDate,
        endDate: payload.endDate,
        customClauses: payload.customClauses,
        witness1Name: payload.witness1?.name,
        witness1NationalId: payload.witness1?.nationalId,
        witness2Name: payload.witness2?.name,
        witness2NationalId: payload.witness2?.nationalId,
      },
      { onSuccess: () => sendForReview.mutate() },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ContractBuilder
        role={role}
        prefill={prefill.data ?? EMPTY_PREFILL}
        contract={existing.data ?? null}
        onSendForReview={handleSendForReview}
        onApprove={() => approve.mutate()}
        onReject={(note) => reject.mutate({ note })}
        sending={saveDraft.isPending || sendForReview.isPending}
        approving={approve.isPending}
        rejecting={reject.isPending}
      />
      {actionError && (
        <p className="mx-auto max-w-3xl text-end text-small text-error" role="alert">
          {actionError}
        </p>
      )}
    </div>
  );
}
