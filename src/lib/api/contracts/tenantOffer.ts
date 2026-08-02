import { z } from "zod";
import { PropertySummarySchema } from "./property";

/**
 * Forward marketplace: a tenant makes a priced offer directly on a listing.
 * State: PENDING → (landlord) COUNTERED | ACCEPTED | DECLINED,
 * COUNTERED → (tenant) ACCEPTED | WITHDRAWN.
 */
export const TenantOfferStatusSchema = z.enum([
  "PENDING",
  "COUNTERED",
  "ACCEPTED",
  "DECLINED",
  "WITHDRAWN",
]);
export type TenantOfferStatus = z.infer<typeof TenantOfferStatusSchema>;

export const tenantOfferStatusLabels: Record<TenantOfferStatus, string> = {
  PENDING: "بانتظار المالك",
  COUNTERED: "عرض مضاد",
  ACCEPTED: "مقبول",
  DECLINED: "مرفوض",
  WITHDRAWN: "مسحوب",
};

export const CreateTenantOfferSchema = z.object({
  proposedPrice: z.number().positive("أدخل قيمة إيجار صحيحة"),
  message: z.string().min(1, "اكتب رسالة قصيرة").max(1000),
});
export type CreateTenantOfferInput = z.infer<typeof CreateTenantOfferSchema>;

export const CounterOfferSchema = z.object({
  counterPrice: z.number().positive("أدخل قيمة صحيحة"),
  counterMessage: z.string().max(1000).optional(),
});
export type CounterOfferInput = z.infer<typeof CounterOfferSchema>;

/** Tenant's view of an offer they sent. */
export const TenantOfferSchema = z.object({
  id: z.string(),
  status: TenantOfferStatusSchema,
  proposedPrice: z.number(),
  counterPrice: z.number().nullable().optional(),
  counterMessage: z.string().nullable().optional(),
  message: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  property: PropertySummarySchema,
});
export type TenantOffer = z.infer<typeof TenantOfferSchema>;

/** Landlord's view of an offer received on one of their listings. */
export const ReceivedTenantOfferSchema = TenantOfferSchema.extend({
  tenantName: z.string(),
});
export type ReceivedTenantOffer = z.infer<typeof ReceivedTenantOfferSchema>;
