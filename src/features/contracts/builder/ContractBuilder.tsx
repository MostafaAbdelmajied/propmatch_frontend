"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Plus, FileText, Send, CheckCircle2, XCircle, Download } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { formatDate, formatEGP } from "@/src/utils/format";
import type { LeaseContract, LeaseContractPrefill } from "@/src/lib/api/contracts/contract";
import { MANDATORY_CLAUSES, renderMandatoryClauseBody } from "./mandatoryClauses";
import { CustomClauseBlock } from "./CustomClauseBlock";
import type { ClauseState, CustomClause, DraftPayload } from "./types";

const inlineInputClasses =
  "border-b border-dashed border-primary/40 bg-transparent px-1 text-body text-ink outline-none focus:border-primary";
const witnessNameClasses =
  "w-full rounded-control border border-hairline bg-background px-3 py-2 text-body text-ink outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";
const NATIONAL_ID_PATTERN = /^\d{14}$/;

function isValidWitnessNationalId(value: string): boolean {
  return value === "" || NATIONAL_ID_PATTERN.test(value);
}
function defaultStartDate(): string {
  return new Date().toISOString().slice(0, 10);
}
function defaultEndDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

interface ContractBuilderProps {
  role: "landlord" | "tenant";
  /** Used to seed a brand-new draft when none exists yet (landlord only). */
  prefill: LeaseContractPrefill;
  /** The existing draft/contract for this match, if any. */
  contract: LeaseContract | null;
  onSendForReview: (payload: DraftPayload) => void;
  onApprove: () => void;
  onReject: (note?: string) => void;
  sending?: boolean;
  approving?: boolean;
  rejecting?: boolean;
}

/**
 * Handshake model: the landlord is the only one who can ever edit (while
 * `drafting`); sending for review locks it (`reviewing`) so the tenant sees
 * a strictly read-only canvas with only Approve/Reject actions — no input
 * element is ever rendered for the tenant, not just visually disabled, so
 * there's nothing in the DOM to tamper with. Only the tenant's approval
 * ever triggers PDF generation (see ContractGenerator).
 */
export function ContractBuilder({
  role,
  prefill,
  contract,
  onSendForReview,
  onApprove,
  onReject,
  sending = false,
  approving = false,
  rejecting = false,
}: ContractBuilderProps) {
  const status = contract?.status ?? "drafting";

  if (role === "tenant" && status === "drafting") {
    return (
      <div className="mx-auto max-w-2xl rounded-card border border-dashed border-hairline bg-surface p-10 text-center">
        <p className="text-body font-semibold text-ink">لم يُرسل المالك العقد للمراجعة بعد</p>
        <p className="mt-1 text-small text-muted">سيصلك إشعار بمجرد أن يكون العقد جاهزًا للمراجعة.</p>
      </div>
    );
  }

  if (role === "landlord" && status === "reviewing") {
    return <LockedForReview contract={contract!} />;
  }

  if (role === "landlord" && status === "drafting") {
    return (
      <LandlordDraftCanvas
        prefill={prefill}
        contract={contract}
        onSendForReview={onSendForReview}
        sending={sending}
      />
    );
  }

  if (role === "tenant" && status === "reviewing") {
    return (
      <TenantReviewCanvas
        contract={contract!}
        onApprove={onApprove}
        onReject={onReject}
        approving={approving}
        rejecting={rejecting}
      />
    );
  }

  // status === "generated": the parent redirects to /contracts/[id] once
  // this is reached, so this is only a brief fallback mid-transition.
  return (
    <div className="mx-auto max-w-2xl rounded-card border border-hairline bg-surface p-10 text-center">
      <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden />
      <p className="mt-2 text-body font-semibold text-ink">تم إنشاء العقد بنجاح.</p>
    </div>
  );
}

/** Landlord's view while a draft is locked pending tenant review. */
function LockedForReview({ contract }: { contract: LeaseContract }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="rounded-card border border-primary/30 bg-primary-tint/40 p-4 text-center">
        <p className="font-semibold text-ink">تم إرسال العقد إلى المستأجر للمراجعة</p>
        <p className="mt-1 text-small text-muted">لا يمكنك التعديل الآن حتى يوافق المستأجر أو يطلب تعديلات.</p>
      </div>
      <ReadOnlyDocument contract={contract} />
    </div>
  );
}

/** Tenant's view: strictly read-only, with Approve/Reject actions. */
function TenantReviewCanvas({
  contract,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  contract: LeaseContract;
  onApprove: () => void;
  onReject: (note?: string) => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [note, setNote] = useState("");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-24">
      <div>
        <h1 className="flex items-center gap-2 text-h1 font-bold text-ink">
          <FileText className="size-6 text-primary" aria-hidden />
          مراجعة العقد
        </h1>
        <p className="mt-1 text-small text-muted">
          راجع بنود العقد بعناية. الموافقة تُنشئ نسخة PDF نهائية من العقد.
        </p>
      </div>

      <ReadOnlyDocument contract={contract} />

      <div className="sticky bottom-4 flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card">
        {showRejectForm ? (
          <>
            <label htmlFor="reject-note" className="text-small font-semibold text-ink">
              وضّح التعديلات المطلوبة (اختياري)
            </label>
            <textarea
              id="reject-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="مثال: أرغب في تعديل قيمة التأمين النقدي…"
              className="w-full resize-y rounded-control border border-hairline bg-background px-3 py-2.5 text-body text-ink outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex items-center gap-2">
              <Button variant="danger" onClick={() => onReject(note.trim() || undefined)} loading={rejecting}>
                تأكيد الرفض وإرسال التعديلات
              </Button>
              <Button variant="ghost" onClick={() => setShowRejectForm(false)} disabled={rejecting}>
                تراجع
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={onApprove} loading={approving} disabled={rejecting}>
              <CheckCircle2 className="size-4" aria-hidden />
              الموافقة وتوليد العقد PDF
            </Button>
            <Button variant="danger" size="lg" onClick={() => setShowRejectForm(true)} disabled={approving}>
              <XCircle className="size-4" aria-hidden />
              رفض / طلب تعديل
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Landlord's editable canvas: fixed A4-style document, editable rent/dates/
 * witnesses/custom clauses. Seeded from an existing (rejected) draft if
 * present, otherwise from the match's prefill data. */
function LandlordDraftCanvas({
  prefill,
  contract,
  onSendForReview,
  sending,
}: {
  prefill: LeaseContractPrefill;
  contract: LeaseContract | null;
  onSendForReview: (payload: DraftPayload) => void;
  sending: boolean;
}) {
  const [rentAmount, setRentAmount] = useState(contract?.rentAmount ?? prefill.suggestedRentAmount);
  const [startDate, setStartDate] = useState(contract?.startDate.slice(0, 10) ?? defaultStartDate());
  const [endDate, setEndDate] = useState(contract?.endDate.slice(0, 10) ?? defaultEndDate());
  const [customClauses, setCustomClauses] = useState<CustomClause[]>(() =>
    (contract?.customClauses ?? []).map((content, i) => ({
      id: `existing-${i}`,
      content,
      state: "saved" as const,
    })),
  );
  const [witness1Name, setWitness1Name] = useState(contract?.witness1Name ?? "");
  const [witness1NationalId, setWitness1NationalId] = useState("");
  const [witness2Name, setWitness2Name] = useState(contract?.witness2Name ?? "");
  const [witness2NationalId, setWitness2NationalId] = useState("");
  const idBase = useId();
  const nextIndex = useRef(0);

  const visibleClauses = customClauses.filter(
    (c): c is CustomClause & { state: Exclude<ClauseState, "removed"> } => c.state !== "removed",
  );

  const headerData = useMemo(
    () => ({
      ownerName: prefill.ownerName,
      ownerNationalId: prefill.ownerNationalId ?? "—",
      tenantName: prefill.tenantName,
      tenantNationalId: prefill.tenantNationalId ?? "—",
      propertyAddress: prefill.propertyAddress,
      rentAmount,
      startDate,
      endDate,
    }),
    [prefill, rentAmount, startDate, endDate],
  );

  function addClause() {
    nextIndex.current += 1;
    setCustomClauses((prev) => [
      ...prev,
      { id: `${idBase}-${nextIndex.current}`, content: "", state: "draft" },
    ]);
  }
  function saveClause(id: string, content: string) {
    setCustomClauses((prev) => prev.map((c) => (c.id === id ? { ...c, content, state: "saved" } : c)));
  }
  function deleteClause(id: string) {
    setCustomClauses((prev) => prev.map((c) => (c.id === id ? { ...c, state: "removed" } : c)));
  }

  function handleSendForReview() {
    const payload: DraftPayload = {
      rentAmount,
      startDate,
      endDate,
      // Belt-and-suspenders: CustomClauseBlock already refuses to save an
      // empty clause, but never trust that alone at the payload boundary.
      customClauses: customClauses
        .filter((c) => c.state === "saved" && c.content.trim().length > 0)
        .map((c) => c.content.trim()),
      witness1:
        witness1Name.trim() && witness1NationalId
          ? { name: witness1Name.trim(), nationalId: witness1NationalId }
          : undefined,
      witness2:
        witness2Name.trim() && witness2NationalId
          ? { name: witness2Name.trim(), nationalId: witness2NationalId }
          : undefined,
    };
    onSendForReview(payload);
  }

  const hasUnsavedDraft = customClauses.some((c) => c.state === "draft");
  const datesValid = new Date(endDate) > new Date(startDate);
  const witness1IdValid = isValidWitnessNationalId(witness1NationalId);
  const witness2IdValid = isValidWitnessNationalId(witness2NationalId);
  const witness1Complete = Boolean(witness1Name.trim()) === Boolean(witness1NationalId);
  const witness2Complete = Boolean(witness2Name.trim()) === Boolean(witness2NationalId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-24">
      <div>
        <h1 className="flex items-center gap-2 text-h1 font-bold text-ink">
          <FileText className="size-6 text-primary" aria-hidden />
          إنشاء العقد
        </h1>
        <p className="mt-1 text-small text-muted">
          حدّد شروط العقد، ثم أرسله للمستأجر للمراجعة والموافقة عليه.
        </p>
      </div>

      {contract?.changeRequestNote && (
        <div className="rounded-card border border-pending/40 bg-pending-tint p-4">
          <p className="font-semibold text-ink">طلب المستأجر تعديلات على المسودة السابقة:</p>
          <p className="mt-1 text-small text-body-text">{contract.changeRequestNote}</p>
        </div>
      )}

      <article
        dir="rtl"
        className="flex flex-col gap-6 rounded-card border border-hairline bg-surface p-8 leading-loose shadow-card"
      >
        <header className="border-b border-hairline pb-4 text-center">
          <h2 className="text-h1 font-bold text-ink">عقد إيجار</h2>
          <p className="text-small text-muted">جمهورية مصر العربية — عقد إيجار سكني</p>
        </header>

        <section className="flex flex-col gap-2 text-body text-body-text">
          <p>
            <b className="text-ink">الطرف الأول (المالك):</b> {headerData.ownerName} — الرقم القومي:{" "}
            <span dir="ltr">{headerData.ownerNationalId}</span>
          </p>
          <p>
            <b className="text-ink">الطرف الثاني (المستأجر):</b> {headerData.tenantName} — الرقم القومي:{" "}
            <span dir="ltr">{headerData.tenantNationalId}</span>
          </p>
          <p className="flex flex-wrap items-center gap-1">
            <b className="text-ink">مدة الإيجار:</b> من
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inlineInputClasses}
              aria-label="تاريخ بداية الإيجار"
            />
            حتى
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inlineInputClasses}
              aria-label="تاريخ نهاية الإيجار"
            />
          </p>
          {!datesValid && <p className="text-caption text-error">تاريخ النهاية يجب أن يكون بعد تاريخ البداية.</p>}
          <p className="flex items-center gap-1">
            <b className="text-ink">القيمة الإيجارية:</b>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={rentAmount}
              onChange={(e) => setRentAmount(Number(e.target.value))}
              className={`${inlineInputClasses} w-24`}
              aria-label="قيمة الإيجار الشهري"
            />
            ج.م شهريًا
          </p>
        </section>

        <section className="flex flex-col gap-4 border-t border-hairline pt-4">
          {MANDATORY_CLAUSES.map((clause) => (
            <div key={clause.id} className="text-body leading-relaxed text-body-text">
              <p className="font-bold text-ink">{clause.title}</p>
              <p>{renderMandatoryClauseBody(clause, headerData)}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3 border-t border-hairline pt-4">
          <p className="font-bold text-ink">بنود إضافية متفق عليها</p>
          {visibleClauses.length === 0 && <p className="text-small text-muted">لا توجد بنود إضافية بعد.</p>}
          {visibleClauses.map((clause, i) => (
            <CustomClauseBlock key={clause.id} clause={clause} index={i} onSave={saveClause} onDelete={deleteClause} />
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={addClause} disabled={hasUnsavedDraft} className="self-start">
            <Plus className="size-4" aria-hidden />
            إضافة بند إضافي
          </Button>
        </section>

        <footer className="mt-6 grid grid-cols-2 gap-8 pt-6 text-center text-small text-body-text">
          <div>
            <p className="mb-8 font-bold text-ink">الطرف الأول (المالك)</p>
            <p className="border-t border-hairline pt-2">{headerData.ownerName}</p>
          </div>
          <div>
            <p className="mb-8 font-bold text-ink">الطرف الثاني (المستأجر)</p>
            <p className="border-t border-hairline pt-2">{headerData.tenantName}</p>
          </div>
        </footer>

        <section className="flex flex-col gap-3 border-t border-hairline pt-4">
          <p className="font-bold text-ink">الشهود (اختياري)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <p className="text-small font-semibold text-ink">الشاهد الأول</p>
              <input
                value={witness1Name}
                onChange={(e) => setWitness1Name(e.target.value)}
                placeholder="اسم الشاهد الأول"
                className={witnessNameClasses}
                aria-label="اسم الشاهد الأول"
              />
              <input
                value={witness1NationalId}
                onChange={(e) => setWitness1NationalId(e.target.value)}
                placeholder="الرقم القومي (14 رقمًا)"
                inputMode="numeric"
                dir="ltr"
                className={witnessNameClasses}
                aria-label="الرقم القومي للشاهد الأول"
              />
              {!witness1IdValid && <p className="text-caption text-error">الرقم القومي يجب أن يكون 14 رقمًا.</p>}
              {witness1IdValid && !witness1Complete && (
                <p className="text-caption text-error">أدخل اسم الشاهد ورقمه القومي معًا.</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-small font-semibold text-ink">الشاهد الثاني</p>
              <input
                value={witness2Name}
                onChange={(e) => setWitness2Name(e.target.value)}
                placeholder="اسم الشاهد الثاني"
                className={witnessNameClasses}
                aria-label="اسم الشاهد الثاني"
              />
              <input
                value={witness2NationalId}
                onChange={(e) => setWitness2NationalId(e.target.value)}
                placeholder="الرقم القومي (14 رقمًا)"
                inputMode="numeric"
                dir="ltr"
                className={witnessNameClasses}
                aria-label="الرقم القومي للشاهد الثاني"
              />
              {!witness2IdValid && <p className="text-caption text-error">الرقم القومي يجب أن يكون 14 رقمًا.</p>}
              {witness2IdValid && !witness2Complete && (
                <p className="text-caption text-error">أدخل اسم الشاهد ورقمه القومي معًا.</p>
              )}
            </div>
          </div>
        </section>
      </article>

      <div className="sticky bottom-4 flex justify-end">
        <Button
          size="lg"
          onClick={handleSendForReview}
          loading={sending}
          disabled={
            hasUnsavedDraft ||
            !datesValid ||
            rentAmount <= 0 ||
            !witness1IdValid ||
            !witness2IdValid ||
            !witness1Complete ||
            !witness2Complete
          }
        >
          <Send className="size-4" aria-hidden />
          إرسال للمستأجر للمراجعة
        </Button>
      </div>
      {hasUnsavedDraft && <p className="text-end text-caption text-muted">أكمل حفظ البند الإضافي المفتوح قبل الإرسال.</p>}
    </div>
  );
}

/**
 * Fully read-only rendering of the document — used for both the locked
 * landlord view and the tenant's review. No input/textarea elements exist
 * here at all, so there's nothing in the DOM for either party to tamper
 * with while it's out of the landlord's editing control.
 */
function ReadOnlyDocument({ contract }: { contract: LeaseContract }) {
  return (
    <article dir="rtl" className="flex flex-col gap-6 rounded-card border border-hairline bg-surface p-8 leading-loose shadow-card">
      <header className="border-b border-hairline pb-4 text-center">
        <h2 className="text-h1 font-bold text-ink">عقد إيجار</h2>
        <p className="text-small text-muted">جمهورية مصر العربية — عقد إيجار سكني</p>
      </header>

      <section className="flex flex-col gap-2 text-body text-body-text">
        <p>
          <b className="text-ink">الطرف الأول (المالك):</b> {contract.ownerName} — الرقم القومي:{" "}
          <span dir="ltr">{contract.ownerNationalId ?? "—"}</span>
        </p>
        <p>
          <b className="text-ink">الطرف الثاني (المستأجر):</b> {contract.tenantName} — الرقم القومي:{" "}
          <span dir="ltr">{contract.tenantNationalId ?? "—"}</span>
        </p>
        <p>
          <b className="text-ink">مدة الإيجار:</b> من {formatDate(contract.startDate)} حتى {formatDate(contract.endDate)}
        </p>
        <p>
          <b className="text-ink">القيمة الإيجارية:</b> {formatEGP(contract.rentAmount)} شهريًا
        </p>
      </section>

      <section className="flex flex-col gap-4 border-t border-hairline pt-4">
        {MANDATORY_CLAUSES.map((clause) => (
          <div key={clause.id} className="text-body leading-relaxed text-body-text">
            <p className="font-bold text-ink">{clause.title}</p>
            <p>{renderMandatoryClauseBody(clause, contract)}</p>
          </div>
        ))}
      </section>

      {contract.customClauses.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-hairline pt-4 text-body text-body-text">
          <p className="font-bold text-ink">بنود إضافية متفق عليها</p>
          {contract.customClauses.map((text, i) => (
            <p key={i}>
              <b className="text-ink">بند إضافي {i + 1}:</b> {text}
            </p>
          ))}
        </section>
      )}

      <footer className="mt-6 grid grid-cols-2 gap-8 pt-6 text-center text-small text-body-text">
        <div>
          <p className="mb-8 font-bold text-ink">الطرف الأول (المالك)</p>
          <p className="border-t border-hairline pt-2">{contract.ownerName}</p>
        </div>
        <div>
          <p className="mb-8 font-bold text-ink">الطرف الثاني (المستأجر)</p>
          <p className="border-t border-hairline pt-2">{contract.tenantName}</p>
        </div>
      </footer>

      {(contract.witness1Name || contract.witness2Name) && (
        <section className="border-t border-hairline pt-4">
          <p className="mb-3 text-center font-bold text-ink">الشهود</p>
          <div className="grid grid-cols-2 gap-8 text-center text-small text-body-text">
            <div>
              <p className="mb-2 font-bold text-ink">الشاهد الأول</p>
              {contract.witness1Name && <p>{contract.witness1Name}</p>}
              {contract.witness1NationalId && (
                <p className="text-caption text-muted">
                  الرقم القومي: <span dir="ltr">{contract.witness1NationalId}</span>
                </p>
              )}
            </div>
            <div>
              <p className="mb-2 font-bold text-ink">الشاهد الثاني</p>
              {contract.witness2Name && <p>{contract.witness2Name}</p>}
              {contract.witness2NationalId && (
                <p className="text-caption text-muted">
                  الرقم القومي: <span dir="ltr">{contract.witness2NationalId}</span>
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {contract.pdfUrl && (
        <a
          href={contract.pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="mx-auto inline-flex h-11 items-center gap-2 rounded-control bg-primary px-5 text-body text-white hover:bg-primary-dark active:bg-primary-dark"
        >
          <Download className="size-4" aria-hidden />
          تحميل العقد PDF
        </a>
      )}
    </article>
  );
}
