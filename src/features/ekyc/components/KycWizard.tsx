"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, CreditCard, ScanFace, Loader2, BadgeCheck, XCircle, ArrowLeft } from "lucide-react";
import { useSubmitVerification, useVerificationState, validateVerificationFile } from "../hooks/useKyc";
import { useSession } from "@/src/features/auth/hooks/useSession";
import { isApiClientError } from "@/src/lib/api/browserClient";
import type { VerificationResponse } from "@/src/lib/api/contracts/verification";
import { kycDocumentLabels, type KycDocument } from "@/src/lib/api/contracts/verification";
import { UploadTile } from "./UploadTile";
import { OwnershipDisclaimer } from "@/src/components/ui/VerifiedBadge";
import { Button } from "@/src/components/ui/Button";
import { InputField } from "@/src/components/ui/Field";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { ErrorState } from "@/src/components/ui/States";

const stepConfig: { document: KycDocument; field: "nationalIdFront" | "nationalIdBack" | "selfie"; hint: string; Icon: typeof ScanLine }[] = [
  { document: "national_id_front", field: "nationalIdFront", hint: "صوّر وجه البطاقة الأمامي بوضوح", Icon: ScanLine },
  { document: "national_id_back", field: "nationalIdBack", hint: "صوّر وجه البطاقة الخلفي", Icon: CreditCard },
  { document: "selfie", field: "selfie", hint: "التقط صورة شخصية للتحقق", Icon: ScanFace },
];

type FileField = (typeof stepConfig)[number]["field"];
type Files = Record<FileField, File | null>;
type FileErrors = Partial<Record<FileField, string>>;

const emptyFiles = (): Files => ({ nationalIdFront: null, nationalIdBack: null, selfie: null });

function formatSubmittedAt(value: string | null) {
  return value ? new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : null;
}

export function KycWizard() {
  const router = useRouter();
  const verification = useVerificationState();
  const submit = useSubmitVerification();
  const { data: session } = useSession();
  const targetDashboard = session?.role === "tenant" ? "/tenant" : session?.role === "admin" ? "/admin" : "/landlord";
  const [files, setFiles] = useState<Files>(emptyFiles);
  const [fileErrors, setFileErrors] = useState<FileErrors>({});
  const [nationalId, setNationalId] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  if (verification.isLoading) return <Skeleton className="h-96 w-full" />;
  if (verification.isError || !verification.data) {
    return <ErrorState message="تعذر تحميل حالة التحقق. حاول مرة أخرى." onRetry={() => verification.refetch()} />;
  }

  const state = verification.data;
  if (state.status !== "NOT_SUBMITTED" && state.status !== "RESUBMISSION_REQUIRED") {
    return <VerificationResult state={state} onContinue={() => router.push(targetDashboard)} />;
  }

  const updateFile = (field: FileField, file: File | null) => {
    const error = validateVerificationFile(file);
    setFiles((current) => ({ ...current, [field]: file }));
    setFileErrors((current) => ({ ...current, [field]: error ?? undefined }));
  };

  const submitRequest = () => {
    const errors = Object.fromEntries(
      (Object.keys(files) as FileField[]).map((field) => [field, validateVerificationFile(files[field]) ?? undefined]),
    ) as FileErrors;
    setFileErrors(errors);
    if (Object.values(errors).some(Boolean) || submit.isPending) return;

    setSubmissionError(null);
    submit.mutate(
      {
        nationalId: nationalId.trim() || undefined,
        nationalIdFront: files.nationalIdFront!,
        nationalIdBack: files.nationalIdBack!,
        selfie: files.selfie!,
      },
      {
        onSuccess: () => {
          setFiles(emptyFiles());
          setFileErrors({});
          setNationalId("");
        },
        onError: async (error) => {
          const message = isApiClientError(error)
            ? error.statusCode === 400 || error.statusCode === 409
              ? error.message
              : "تعذر إرسال طلب التحقق الآن. حاول مرة أخرى."
            : "تعذر إرسال طلب التحقق الآن. حاول مرة أخرى.";
          setSubmissionError(message);
          if (isApiClientError(error) && error.statusCode === 409) await verification.refetch();
        },
      },
    );
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5" aria-busy={submit.isPending}>
      <div>
        <h1 className="text-h1 font-bold text-ink">توثيق الهوية</h1>
        <p className="mt-1 text-small text-muted">التوثيق مطلوب مرة واحدة قبل نشر إعلان أو طلب، وقبل قبول العروض.</p>
      </div>

      <OwnershipDisclaimer />

      {state.status === "RESUBMISSION_REQUIRED" && state.rejectionReason && (
        <div className="flex items-start gap-3 rounded-card border border-error/30 bg-error-tint px-4 py-3" role="alert">
          <XCircle className="mt-0.5 size-5 shrink-0 text-error" aria-hidden />
          <div>
            <p className="text-small font-bold text-error">مطلوب إعادة تقديم المستندات</p>
            <p className="text-caption text-body-text">سبب طلب إعادة التقديم: {state.rejectionReason}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {stepConfig.map(({ document, field, hint, Icon }) => {
          const error = fileErrors[field];
          return (
            <UploadTile
              key={document}
              title={kycDocumentLabels[document]}
              hint={hint}
              Icon={Icon}
              reason={error}
              state={submit.isPending ? "locked" : files[field] ? "captured" : error ? "bad-quality" : "empty"}
              onFileChange={(file) => updateFile(field, file)}
            />
          );
        })}
      </div>

      <InputField
        label="الرقم القومي (اختياري)"
        inputMode="numeric"
        dir="ltr"
        value={nationalId}
        disabled={submit.isPending}
        onChange={(event) => setNationalId(event.target.value)}
        hint="يمكن تركه فارغًا عند إعادة الإرسال."
      />

      {submissionError && <p className="text-small text-error" role="alert" aria-live="polite">{submissionError}</p>}

      <Button size="lg" block loading={submit.isPending} disabled={!state.canSubmit || submit.isPending} onClick={submitRequest}>
        {submit.isPending
          ? "جارٍ إرسال طلب التحقق..."
          : state.status === "RESUBMISSION_REQUIRED"
            ? "إعادة تقديم المستندات"
            : "إرسال للمراجعة"}
      </Button>
    </div>
  );
}

function VerificationResult({ state, onContinue }: { state: VerificationResponse; onContinue: () => void }) {
  const submittedAt = formatSubmittedAt(state.submittedAt);
  if (state.status === "PENDING") {
    return <ResultCard tone="pending" Icon={Loader2} spin title="طلب التوثيق قيد المراجعة" body={<><p>تم إرسال طلب التحقق بنجاح وهو قيد المراجعة.</p>{submittedAt && <p className="text-caption">تاريخ الإرسال: {submittedAt}</p>}</>} action={<Button variant="secondary" onClick={onContinue}>العودة</Button>} />;
  }
  if (state.status === "APPROVED") {
    return <ResultCard tone="success" Icon={BadgeCheck} title="تم توثيق هويتك بنجاح" body={<div className="flex flex-col gap-2"><p>يمكنك الآن استخدام الميزات المتاحة للحساب الموثّق.</p><OwnershipDisclaimer /></div>} action={<Button onClick={onContinue}>المتابعة <ArrowLeft className="size-4" aria-hidden /></Button>} />;
  }
  return <ResultCard tone="error" Icon={XCircle} title="تم رفض طلب التوثيق" body={<div className="flex flex-col gap-2"><p>{state.rejectionReason ?? "لا يمكن إرسال طلب جديد في الحالة الحالية."}</p><p className="text-caption">لا يمكن إعادة الإرسال في الحالة الحالية.</p></div>} action={<Button variant="secondary" onClick={onContinue}>العودة</Button>} />;
}

function ResultCard({ tone, Icon, title, body, action, spin }: { tone: "success" | "error" | "pending"; Icon: typeof BadgeCheck; title: string; body: React.ReactNode; action?: React.ReactNode; spin?: boolean }) {
  const toneClass = { success: "bg-success-tint text-success", error: "bg-error-tint text-error", pending: "bg-pending-tint text-pending" }[tone];
  return <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-card border border-hairline bg-surface p-8 text-center shadow-card" aria-live="polite"><span className={`flex size-16 items-center justify-center rounded-full ${toneClass}`}><Icon className={`size-8 ${spin ? "animate-spin" : ""}`} aria-hidden /></span><h1 className="text-h2 font-bold text-ink">{title}</h1><div className="text-body text-body-text">{body}</div>{action}</div>;
}
