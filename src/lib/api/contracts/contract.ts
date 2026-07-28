import { z } from "zod";

/**
 * Mirrors the ERD's `LEASE_CONTRACT` (PRO-15 / SRS 3.5). Handshake model:
 * only the landlord may draft/edit (POST .../draft, .../send-for-review);
 * only the tenant may approve or reject a draft sent for review (POST
 * .../approve, .../reject) — approval is the only path that ever produces
 * a PDF, so `generatedByUserId` on the backend reflects the tenant as
 * final approver, not whoever drafted it. Owner/tenant names + property
 * address are always server-derived, never accepted from the client.
 * National IDs come from both parties' verified eKYC and appear in the
 * generated PDF only — the API always returns them masked to the last 4
 * digits.
 *
 * customClauses is one entry per Hybrid Contract Builder block (see
 * src/features/contracts/builder) — only `saved` blocks are ever sent.
 */

const nationalIdSchema = z.string().regex(/^\d{14}$/, "الرقم القومي 14 رقمًا");

/** Lifecycle: drafting (landlord editing) -> reviewing (locked, tenant's
 * turn) -> generated (tenant approved, PDF exists). Rejecting sends
 * `reviewing` back to `drafting` with a changeRequestNote attached. */
export const LeaseContractStatusSchema = z.enum(["drafting", "reviewing", "generated"]);
export type LeaseContractStatus = z.infer<typeof LeaseContractStatusSchema>;

/** What the landlord actually negotiates; everything else is server-derived.
 * Witnesses aren't platform users, so their name/ID are genuine free input. */
export const SaveDraftSchema = z.object({
  rentAmount: z.number().positive().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  customClauses: z.array(z.string().max(2000)).max(30).optional(),
  witness1Name: z.string().max(200).optional(),
  witness1NationalId: nationalIdSchema.optional(),
  witness2Name: z.string().max(200).optional(),
  witness2NationalId: nationalIdSchema.optional(),
});
export type SaveDraft = z.infer<typeof SaveDraftSchema>;

export const RejectDraftSchema = z.object({
  note: z.string().max(1000).optional(),
});
export type RejectDraft = z.infer<typeof RejectDraftSchema>;

export const LeaseContractSchema = z.object({
  id: z.string(),
  matchConnectionId: z.string(),
  status: LeaseContractStatusSchema,
  changeRequestNote: z.string().nullable(),
  ownerName: z.string(),
  tenantName: z.string(),
  /** Masked to the last 4 digits — the full ID never leaves the backend outside the PDF. */
  ownerNationalId: z.string().nullable(),
  tenantNationalId: z.string().nullable(),
  propertyAddress: z.string(),
  rentAmount: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  customClauses: z.array(z.string()),
  witness1Name: z.string().nullable(),
  witness1NationalId: z.string().nullable(),
  witness2Name: z.string().nullable(),
  witness2NationalId: z.string().nullable(),
  createdAt: z.string(),
  /** Short-lived signed URL to the real, backend-generated PDF. Only set once `status === "generated"`. */
  pdfUrl: z.string().nullable(),
});
export type LeaseContract = z.infer<typeof LeaseContractSchema>;

/** What the canvas needs before any draft exists — owner/tenant/address are
 * real (server-derived, IDs masked); rent is a suggestion the landlord can
 * still override when drafting. */
export const LeaseContractPrefillSchema = z.object({
  ownerName: z.string(),
  ownerNationalId: z.string().nullable(),
  tenantName: z.string(),
  tenantNationalId: z.string().nullable(),
  propertyAddress: z.string(),
  suggestedRentAmount: z.number(),
});
export type LeaseContractPrefill = z.infer<typeof LeaseContractPrefillSchema>;
