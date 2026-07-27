import { z } from "zod";

/** Products that can be purchased under the revised, broker-free plan. */
export const PaymentTypeSchema = z.enum([
  "PREMIUM_OWNER",
  "BOOST_LISTING",
  "AI_ADDON",
  "DOCS_PACK",
]);
export type PaymentType = z.infer<typeof PaymentTypeSchema>;

export const paymentTypeLabels: Record<PaymentType, string> = {
  PREMIUM_OWNER: "اشتراك المالك المميز",
  BOOST_LISTING: "تمييز إعلان عقاري",
  AI_ADDON: "حزمة الذكاء الاصطناعي",
  DOCS_PACK: "حزمة تنظيم المستندات",
};

export const paymentTypePrices: Record<PaymentType, number> = {
  PREMIUM_OWNER: 999,
  BOOST_LISTING: 349,
  AI_ADDON: 199,
  DOCS_PACK: 299,
};

export const PaymentStatusSchema = z.enum(["PENDING", "SUCCESS", "FAILED"]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const CreateCheckoutRequestSchema = z.object({
  paymentType: PaymentTypeSchema,
  /** Required for BOOST_LISTING; the backend verifies ownership and approval. */
  propertyId: z.string().uuid().optional(),
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

const HistoricalPaymentTypeSchema = z.union([
  PaymentTypeSchema,
  z.enum([
    "LEGACY_OWNER_PLUS",
    "LEGACY_NEW_LISTING",
    "LEGACY_BOOST_LISTING",
    "LEGACY_REFILL_MATCHES",
    "LEGACY_OFFER_PACK",
  ]),
]);

export const PaymentTransactionSchema = z.object({
  id: z.string(),
  providerOrderId: z.string(),
  providerTransactionId: z.string().nullable(),
  amount: z.number(),
  currency: z.literal("EGP"),
  paymentType: HistoricalPaymentTypeSchema,
  status: PaymentStatusSchema,
  paidAt: z.string().nullable(),
  createdAt: z.string(),
});
export type PaymentTransaction = z.infer<typeof PaymentTransactionSchema>;

/** Server-authoritative owner plan and usage snapshot. */
export const UserQuotaSchema = z.object({
  planType: z.enum(["FREE", "PREMIUM"]),
  planExpiresAt: z.string().nullable(),
  maxActiveListings: z.number().int().positive(),
  activeUnitCount: z.number().int().nonnegative(),
  offersUnlimited: z.boolean(),
  freeListingsLeft: z.number().int(),
  optimizerUsesLeft: z.number().int().nonnegative(),
  freeOffersLeft: z.number().int().nonnegative(),
  documentationPackCredits: z.number().int().nonnegative(),
  lastResetDate: z.string().nullable(),
});
export type UserQuota = z.infer<typeof UserQuotaSchema>;
