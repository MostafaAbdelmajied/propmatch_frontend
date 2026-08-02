import { z } from "zod";

/**
 * Mirrors the ERD's `IDENTITY_VERIFICATION` (1:1 with USER).
 *
 * eKYC verifies **identity, not ownership** — always pair a verified badge with
 * the ownership disclaimer. National ID images are the most sensitive data in
 * the system: never send them to any AI/LLM, never store them in the vector DB
 * (build prompt §6/§4), and mask `national_id` to the last 4 everywhere except
 * the admin review screen and the generated contract.
 */

/**
 * The backend persists every state except `NOT_SUBMITTED`, which represents
 * the absence of an IDENTITY_VERIFICATION row.
 */
export const VerificationStatusSchema = z.enum([
  "NOT_SUBMITTED",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "RESUBMISSION_REQUIRED",
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

/** Safe, user-facing verification state returned by the backend. */
export const VerificationResponseSchema = z.object({
  status: VerificationStatusSchema,
  rejectionReason: z.string().nullable(),
  submittedAt: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  canSubmit: z.boolean(),
}).strict();
export type VerificationResponse = z.infer<typeof VerificationResponseSchema>;

/** Browser-only input for the multipart verification submission endpoint. */
export type SubmitVerificationInput = {
  nationalId?: string;
  nationalIdFront: File;
  nationalIdBack: File;
  selfie: File;
};

/** The statuses persisted on an existing verification row. */
export const PersistedVerificationStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED", "RESUBMISSION_REQUIRED"]);
export type PersistedVerificationStatus = z.infer<typeof PersistedVerificationStatusSchema>;

/** The eKYC wizard's upload steps (ERD: front/back/selfie URLs). */
export const KycDocumentSchema = z.enum(["national_id_front", "national_id_back", "selfie"]);
export type KycDocument = z.infer<typeof KycDocumentSchema>;

export const kycDocumentLabels: Record<KycDocument, string> = {
  national_id_front: "وجه البطاقة الأمامي",
  national_id_back: "وجه البطاقة الخلفي",
  selfie: "صورة شخصية للتحقق",
};

/** PRO-03: images upload to S3/Cloudinary, then the row is created as PENDING. */
export const KycUploadResponseSchema = z.object({
  document: KycDocumentSchema,
  accepted: z.boolean(),
  /** Set when accepted=false (e.g. OCR could not read the ID). */
  reason: z.string().nullable(),
});
export type KycUploadResponse = z.infer<typeof KycUploadResponseSchema>;

/** @deprecated Legacy JSON-only wizard input; not the backend submission contract. */
export const LegacyKycSubmitRequestSchema = z.object({
  nationalId: z.string().regex(/^\d{14}$/, "الرقم القومي 14 رقمًا"),
});
export type LegacyKycSubmitRequest = z.infer<typeof LegacyKycSubmitRequestSchema>;

/**
 * Legacy wizard-local state retained temporarily for existing UI compatibility.
 * It is not the GET /verification/me response contract.
 */
export const LegacyKycWizardStateSchema = z.object({
  status: VerificationStatusSchema,
  uploadedDocuments: z.array(KycDocumentSchema),
  /** Masked to the last 4 (requirements.md §3). Null until submitted. */
  nationalIdLast4: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  submittedAt: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  /** Whether the user may submit/resubmit right now. */
  canSubmit: z.boolean(),
});
export type LegacyKycWizardState = z.infer<typeof LegacyKycWizardStateSchema>;

/** @deprecated Legacy wizard-only compatibility alias, not an API response. */
export type VerificationState = LegacyKycWizardState;
