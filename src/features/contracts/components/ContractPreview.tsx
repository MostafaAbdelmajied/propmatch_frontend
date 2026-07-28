"use client";

import { Download } from "lucide-react";
import { formatDate } from "@/src/utils/format";
import type { LeaseContract } from "@/src/lib/api/contracts/contract";
import { MANDATORY_CLAUSES, renderMandatoryClauseBody } from "../builder/mandatoryClauses";

/**
 * Renders the backend-generated contract's data — same 15 mandatory
 * clauses as the builder canvas and the actual PDF. The download button
 * links to the real, server-rendered PDF (a short-lived signed URL) — no
 * more window.print(); national IDs shown here are already masked by the API.
 */
export function ContractPreview({ contract }: { contract: LeaseContract }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-small text-muted">تم إنشاء العقد بنجاح.</p>
        {contract.pdfUrl && (
          <a
            href={contract.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-control bg-primary px-5 text-body text-white hover:bg-primary-dark active:bg-primary-dark"
          >
            <Download className="size-4" aria-hidden />
            تحميل العقد PDF
          </a>
        )}
      </div>

      <article className="flex flex-col gap-6 rounded-card border border-hairline bg-surface p-8 leading-loose shadow-card">
        <header className="border-b border-hairline pb-4 text-center">
          <h1 className="text-h1 font-bold text-ink">عقد إيجار</h1>
          <p className="text-small text-muted">جمهورية مصر العربية — عقد إيجار سكني</p>
        </header>

        <p className="text-body text-body-text">
          إنه في يوم {formatDate(contract.createdAt)}، تم الاتفاق بين كل من:
        </p>

        <div className="flex flex-col gap-2 text-body text-body-text">
          <p>
            <b className="text-ink">الطرف الأول (المالك):</b> {contract.ownerName} — الرقم القومي:{" "}
            <span dir="ltr">{contract.ownerNationalId}</span>
          </p>
          <p>
            <b className="text-ink">الطرف الثاني (المستأجر):</b> {contract.tenantName} — الرقم القومي:{" "}
            <span dir="ltr">{contract.tenantNationalId}</span>
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
      </article>
    </div>
  );
}
