import { z } from "zod";

export const PaymentTypeSchema = z.enum([
  "PREMIUM_OWNER",
  "OWNER_PLUS",
  "NEW_LISTING",
  "BOOST_LISTING",
  "AI_ADDON",
  "DOCS_PACK",
  "REFILL_MATCHES",
  "OFFER_PACK",
]);
export type PaymentType = z.infer<typeof PaymentTypeSchema>;

export const paymentTypeLabels: Record<PaymentType, string> = {
  PREMIUM_OWNER: "اشتراك مالك بريميوم (999 ج.م)",
  OWNER_PLUS: "اشتراك مالك بلس (499 ج.م)",
  NEW_LISTING: "إضافة إعلان جديد",
  BOOST_LISTING: "تمييز إعلان عقاري",
  AI_ADDON: "حزمة الذكاء الاصطناعي",
  DOCS_PACK: "حزمة العقود والوثائق",
  REFILL_MATCHES: "محاولات مطابقة إضافية",
  OFFER_PACK: "باقة عروض إضافية",
};

/** ERD: `status ENUM "PENDING, SUCCESS, FAILED"`. */
export const PaymentStatusSchema = z.enum(["PENDING", "SUCCESS", "FAILED"]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const CreateCheckoutRequestSchema = z.object({
  paymentType: PaymentTypeSchema,
  /** For NEW_LISTING / BOOST_LISTING: the property the payment activates. */
  propertyId: z.string().optional(),
});
export type CreateCheckoutRequest = z.infer<typeof CreateCheckoutRequestSchema>;

export const CheckoutSessionSchema = z.object({
  providerOrderId: z.string(),
  amount: z.number(),
  currency: z.literal("EGP"),
  paymentType: PaymentTypeSchema,
  checkoutUrl: z.string().nullable(),
});
export type CheckoutSession = z.infer<typeof CheckoutSessionSchema>;

export const PaymentTransactionSchema = z.object({
  id: z.string(),
  providerOrderId: z.string(),
  providerTransactionId: z.string().nullable(),
  amount: z.number(),
  currency: z.literal("EGP"),
  paymentType: PaymentTypeSchema,
  status: PaymentStatusSchema,
  paidAt: z.string().nullable(),
  createdAt: z.string(),
});
export type PaymentTransaction = z.infer<typeof PaymentTransactionSchema>;

/**
 * ERD: `USER_QUOTA` — **landlords only** (1:1). Tenants have no row, so the UI
 * must tolerate its absence (requirements.md §6).
 */
export const UserQuotaSchema = z.object({
  planType: z.string().optional().default("FREE"),
  planExpiresAt: z.string().nullable().optional(),
  maxActiveListings: z.number().int().optional().default(1),
  freeListingsLeft: z.number().int(),
  optimizerUsesLeft: z.number().int(),
  freeOffersLeft: z.number().int(),
  lastResetDate: z.string().nullable(),
});
export type UserQuota = z.infer<typeof UserQuotaSchema>;

/** Which quota a paywall is about — maps 1:1 to the payment that refills it. */
export const QuotaFieldSchema = z.enum(["freeListingsLeft", "optimizerUsesLeft", "freeOffersLeft"]);
export type QuotaField = z.infer<typeof QuotaFieldSchema>;

export const quotaRefillPaymentType: Record<QuotaField, PaymentType> = {
  freeListingsLeft: "NEW_LISTING",
  optimizerUsesLeft: "REFILL_MATCHES",
  freeOffersLeft: "OFFER_PACK",
};
