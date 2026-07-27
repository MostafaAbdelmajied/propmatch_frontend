import { z } from "zod";
import { PropertySummarySchema } from "./property";

/**
 * Mirrors the ERD's `OWNER_OFFER` — the landlord side of the reverse
 * marketplace (PRO-12/13). A landlord picks one of their approved properties,
 * writes a pitch and proposes a price against an approved TENANT_REQUEST.
 * Free Owners spend one of three direct-offer opportunities. Premium Owners
 * can initiate offers without a quota while their subscription is active.
 */

/** ERD: `status ENUM "SENT, VIEWED, ACCEPTED, REJECTED"`. */
export const OfferStatusSchema = z.enum(["SENT", "VIEWED", "ACCEPTED", "REJECTED"]);
export type OfferStatus = z.infer<typeof OfferStatusSchema>;

export const offerStatusLabels: Record<OfferStatus, string> = {
  SENT: "مُرسل",
  VIEWED: "تمت المشاهدة",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
};

export const CreateOfferRequestSchema = z.object({
  tenantRequestId: z.string(),
  /**
   * ERD marks this nullable ("if quick-add"), but V1 always selects an existing
   * APPROVED property (ASSUMPTIONS.md #12).
   */
  propertyId: z.string(),
  pitchMessage: z.string().min(10, "اكتب رسالة لا تقل عن ١٠ أحرف").max(1000),
  proposedPrice: z.number().positive(),
});
export type CreateOfferRequest = z.infer<typeof CreateOfferRequestSchema>;

/** The landlord's view of an offer they sent. */
export const SentOfferSchema = z.object({
  id: z.string(),
  tenantRequestId: z.string(),
  property: PropertySummarySchema,
  pitchMessage: z.string(),
  proposedPrice: z.number(),
  status: OfferStatusSchema,
  createdAt: z.string(),
  tenantName: z.string().nullable(),
  tenantPhoneNumber: z.string().nullable(),
  matchConnectionId: z.string().nullable(),
});
export type SentOffer = z.infer<typeof SentOfferSchema>;

/**
 * The tenant's offer inbox (PRO-13). The landlord's phone/name stay hidden
 * until the tenant accepts — reveal is per-connection (rbac.md).
 */
export const ReceivedOfferSchema = z.object({
  id: z.string(),
  tenantRequestId: z.string(),
  property: PropertySummarySchema,
  pitchMessage: z.string(),
  proposedPrice: z.number(),
  status: OfferStatusSchema,
  matchScore: z.number().min(0).max(100).nullable(),
  createdAt: z.string(),
  /** Populated only once status === ACCEPTED. */
  ownerName: z.string().nullable(),
  ownerPhoneNumber: z.string().nullable(),
  manualAddress: z.string().nullable(),
  matchConnectionId: z.string().nullable(),
});
export type ReceivedOffer = z.infer<typeof ReceivedOfferSchema>;

/**
 * Accepting an offer creates a CONNECTED MATCH_CONNECTION and reveals both
 * parties' phone numbers, then prompts the B2B opt-in (PRO-16).
 */
export const AcceptOfferResponseSchema = z.object({
  offerId: z.string(),
  status: OfferStatusSchema,
  ownerName: z.string(),
  ownerPhoneNumber: z.string(),
  manualAddress: z.string(),
  matchConnectionId: z.string(),
});
export type AcceptOfferResponse = z.infer<typeof AcceptOfferResponseSchema>;
