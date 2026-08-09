"use client";

import Link from "next/link";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import {
  useConfirmContractReview,
  useDownloadContractPdf,
  useRequestContractChanges,
} from "../hooks/useLeaseContract";
import { formatDate } from "@/src/utils/format";
import type { LeaseContract } from "@/src/lib/api/contracts/contract";
import { MANDATORY_CLAUSES, renderMandatoryClauseBody } from "../builder/mandatoryClauses";
import { useSession } from "@/src/features/auth/hooks/useSession";
import { OptionalServices } from "./OptionalServices";
import { UserReviewPanel } from "@/src/features/reviews/components/UserReviewPanel";

const errorMessage = (error: unknown, fallback: string) => {
  const code =
    typeof error === "object" && error && "message" in error ? String(error.message) : "";
  if (code.includes("CONTRACT_CHANGES_ALREADY_REQUESTED")) return "فيه طلب تعديل قائم بالفعل.";
  if (code.includes("CONTRACT_REVIEW_ALREADY_CONFIRMED"))
    return "المراجعة اتأكدت بالفعل، ومينفعش تطلب تعديلات جديدة.";
  if (code.includes("CONTRACT_CHANGES_PENDING"))
    return "لازم المالك يحفظ التعديلات المطلوبة قبل تأكيد المراجعة.";
  if (code.includes("CONTRACT_REVISION_CHANGED"))
    return "المسودة اتعدلت. راجع النسخة الجديدة قبل التأكيد.";
  return fallback;
};

/** Read-only saved draft. Review actions are permissions-driven; server checks remain authoritative. */
export function ContractPreview({ contract }: { contract: LeaseContract }) {
  const session = useSession();
  const isTenant = session.data?.role === "tenant";
  const download = useDownloadContractPdf(contract.id);
  const requestChanges = useRequestContractChanges(contract.id);
  const confirm = useConfirmContractReview(contract.id);
  const [message, setMessage] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const review = contract.tenantReviewStatus;

  return (
    <div dir="rtl" className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-muted">
          مسودة للمراجعة فقط، وليست توقيعًا أو توثيقًا قانونيًا.
        </p>
        {contract.canDownloadPdf && (
          <Button onClick={() => download.mutate()} loading={download.isPending}>
            <Download className="size-4" aria-hidden /> تحميل نسخة PDF
          </Button>
        )}
      </div>

      {review === "CHANGES_REQUESTED" && contract.tenantChangeRequest && (
        <div className="rounded-card border border-warning/30 bg-warning-tint p-4 text-body">
          <b>التعديل المطلوب:</b> {contract.tenantChangeRequest}
          {contract.canEdit && (
            <p className="mt-2 text-small">
              بعد حفظ التعديلات هترجع المسودة للمستأجر عشان يراجع النسخة الجديدة.
            </p>
          )}
        </div>
      )}
      {review === "REVIEW_CONFIRMED" && (
        <div className="rounded-card border border-primary/30 bg-primary-tint p-4 text-body">
          {isTenant
            ? "تم تأكيد مراجعتك للنسخة الحالية، ومينفعش تطلب تعديلات جديدة عليها."
            : "المستأجر أكد مراجعة النسخة الحالية، لذلك المسودة مقفولة ضد التعديل."}
        </div>
      )}
      {review === "CHANGES_REQUESTED" && !contract.canEdit && (
        <p className="rounded-card border border-hairline p-4 text-body">
          طلب التعديل اتبعت للمالك. استنى حفظ النسخة المعدلة قبل تأكيد المراجعة.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {contract.canEdit && (
          <Link
            href={`/contracts/new?matchConnectionId=${contract.matchConnectionId}`}
            className="inline-flex h-11 items-center justify-center rounded-control bg-primary px-5 text-body font-semibold text-white"
          >
            تعديل المسودة
          </Link>
        )}
        {contract.canRequestChanges && (
          <Button variant="secondary" onClick={() => setRequestOpen(true)}>
            طلب تعديل
          </Button>
        )}
        {contract.canConfirmReview && (
          <Button onClick={() => setConfirmOpen(true)}>تأكيد مراجعة المسودة</Button>
        )}
      </div>

      {session.data && <OptionalServices role={session.data.role} />}

      {contract.status === "generated" && <UserReviewPanel contractId={contract.id} />}

      {requestOpen && (
        <section
          className="rounded-card border border-hairline bg-surface p-5"
          role="dialog"
          aria-modal="true"
        >
          <h2 className="text-title font-bold">اطلب تعديل على المسودة</h2>
          <p className="mt-1 text-small text-muted">
            اكتب التعديل المطلوب بوضوح. بعد ما المالك يحفظ النسخة الجديدة، هتقدر تراجعها من تاني.
          </p>
          <label className="mt-4 block text-small font-semibold">التعديل المطلوب</label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1000}
            className="mt-1 min-h-24 w-full rounded border p-2"
            placeholder="مثال: من فضلك عدّل تاريخ بداية العقد إلى 15 أغسطس."
          />
          {requestChanges.isError && (
            <p className="mt-2 text-small text-error">
              {errorMessage(
                requestChanges.error,
                "مقدرناش نرسل طلب التعديل حاليًا. حاول مرة تانية.",
              )}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => setRequestOpen(false)}>
              إلغاء
            </Button>
            <Button
              disabled={message.trim().length < 5 || requestChanges.isPending}
              loading={requestChanges.isPending}
              onClick={() =>
                requestChanges.mutate(
                  { message: message.trim() },
                  { onSuccess: () => setRequestOpen(false) },
                )
              }
            >
              إرسال طلب التعديل
            </Button>
          </div>
        </section>
      )}

      {confirmOpen && (
        <section
          className="rounded-card border border-hairline bg-surface p-5"
          role="dialog"
          aria-modal="true"
        >
          <h2 className="text-title font-bold">تأكيد مراجعة النسخة الحالية</h2>
          <p className="mt-2 text-body">
            بعد التأكيد، المالك مش هيقدر يعدّل المسودة، وإنت مش هتقدر تطلب تعديلات جديدة على النسخة
            دي.
          </p>
          <p className="mt-2 text-small text-muted">
            التأكيد ده معناه إنك راجعت المسودة الحالية فقط. هو مش توقيع إلكتروني، ومش توثيق أو
            اعتماد قانوني.
          </p>
          <label className="mt-4 flex gap-2 text-small">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />{" "}
            راجعت بيانات المسودة الحالية وفاهم إن التأكيد هيقفلها ضد التعديل.
          </label>
          {confirm.isError && (
            <p className="mt-2 text-small text-error">
              {errorMessage(confirm.error, "مقدرناش نأكد المراجعة حاليًا. حاول مرة تانية.")}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              إلغاء
            </Button>
            <Button
              disabled={!acknowledged || confirm.isPending || !contract.draftRevision}
              loading={confirm.isPending}
              onClick={() =>
                contract.draftRevision &&
                confirm.mutate(
                  { expectedRevision: contract.draftRevision },
                  { onSuccess: () => setConfirmOpen(false) },
                )
              }
            >
              تأكيد المراجعة
            </Button>
          </div>
        </section>
      )}

      <article className="flex flex-col gap-6 rounded-card border border-hairline bg-surface p-8 leading-loose shadow-card">
        <header className="border-b border-hairline pb-4 text-center">
          <h1 className="text-h1 font-bold text-ink">عقد إيجار</h1>
          <p className="text-small text-muted">مسودة عقد إيجار سكني</p>
        </header>
        <p className="text-body text-body-text">
          إنه في يوم {formatDate(contract.createdAt)}، تم الاتفاق بين كل من:
        </p>
        <div className="text-body text-body-text">
          <p>
            <b>الطرف الأول (المالك):</b> {contract.ownerName}
          </p>
          <p>
            <b>الطرف الثاني (المستأجر):</b> {contract.tenantName}
          </p>
        </div>
        <section className="flex flex-col gap-4 border-t border-hairline pt-4">
          {MANDATORY_CLAUSES.map((clause) => (
            <div key={clause.id} className="text-body leading-relaxed text-body-text">
              <p className="font-bold text-ink">{clause.title}</p>
              <p>{renderMandatoryClauseBody(clause, contract)}</p>
            </div>
          ))}
        </section>
        {contract.customClauses.length > 0 && (
          <section className="border-t border-hairline pt-4 text-body text-body-text">
            <p className="font-bold">بنود إضافية متفق عليها</p>
            {contract.customClauses.map((text, index) => (
              <p key={index}>{text}</p>
            ))}
          </section>
        )}
      </article>
    </div>
  );
}
