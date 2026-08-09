import { z } from "zod";

/** Checkout SKUs accepted by the backend's server-authoritative catalog. */
export const PaymentTypeSchema = z.enum([
  "OWNER_PLUS_MONTHLY",
  "OWNER_PLUS_YEARLY",
  "PREMIUM_MONTHLY",
  "PREMIUM_YEARLY",
  "EXTRA_LISTING_60D",
  "OFFERS_10_60D",
  "BOOST_7D",
  "BOOST_14D",
  "BOOST_30D",
  "AI_USES_10_90D",
]);
export type CheckoutPaymentType = z.infer<typeof PaymentTypeSchema>;
/** @deprecated Compatibility only for the retired mock router. */
export type PaymentType = string;

export const paymentTypeLabels: Record<CheckoutPaymentType, string> = {
  OWNER_PLUS_MONTHLY: "Owner Plus شهري",
  OWNER_PLUS_YEARLY: "Owner Plus سنوي",
  PREMIUM_MONTHLY: "Premium شهري",
  PREMIUM_YEARLY: "Premium سنوي",
  EXTRA_LISTING_60D: "عقار نشط إضافي",
  OFFERS_10_60D: "عروض مطابقة",
  BOOST_7D: "Boost",
  BOOST_14D: "Boost",
  BOOST_30D: "Boost",
  AI_USES_10_90D: "استخدامات الذكاء الإصطناعي",
};

export const paymentTypePrices: Record<CheckoutPaymentType, number> = {
  OWNER_PLUS_MONTHLY: 299,
  OWNER_PLUS_YEARLY: 2_990,
  PREMIUM_MONTHLY: 699,
  PREMIUM_YEARLY: 6_990,
  EXTRA_LISTING_60D: 99,
  OFFERS_10_60D: 49,
  BOOST_7D: 79,
  BOOST_14D: 149,
  BOOST_30D: 249,
  AI_USES_10_90D: 39,
};

export const OwnerPlanTypeSchema = z.enum(["FREE", "OWNER_PLUS", "PREMIUM"]);
export type OwnerPlanType = z.infer<typeof OwnerPlanTypeSchema>;

export const PlanAllowancesSchema = z.object({
  activeListings: z.number().int().positive(),
  offers: z.number().int().nonnegative(),
  aiUses: z.number().int().nonnegative(),
  boostCredits: z.number().int().nonnegative(),
  boostDurationDays: z.number().int().positive(),
});
export type PlanAllowances = z.infer<typeof PlanAllowancesSchema>;

export const CommercialProductSchema = z.object({
  paymentType: PaymentTypeSchema,
  priceEgp: z.number().int().positive(),
  enabled: z.boolean(),
  billing: z.enum(["MONTHLY", "YEARLY", "ONE_TIME"]),
  kind: z.enum(["SUBSCRIPTION", "ENTITLEMENT", "BOOST"]),
  planType: OwnerPlanTypeSchema.exclude(["FREE"]).optional(),
  entitlementType: z.enum(["ACTIVE_LISTING", "MATCHED_OFFER", "AI_OPTIMIZER_USE"]).optional(),
  quantity: z.number().int().positive().optional(),
  validityDays: z.number().int().positive().optional(),
  durationDays: z.number().int().positive().optional(),
});
export type CommercialProduct = z.infer<typeof CommercialProductSchema>;

export const CommercialCatalogSchema = z.object({
  plans: z.object({
    FREE: PlanAllowancesSchema,
    OWNER_PLUS: PlanAllowancesSchema,
    PREMIUM: PlanAllowancesSchema,
  }),
  products: z.record(PaymentTypeSchema, CommercialProductSchema),
});
export type CommercialCatalog = z.infer<typeof CommercialCatalogSchema>;

export const PaymentStatusSchema = z.enum(["PENDING", "SUCCESS", "FAILED"]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

const EgyptianMobileSchema = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(?:\+20|0020|0)1[0125]\d{8}$/));

export const CreateCheckoutRequestSchema = z
  .object({
    paymentType: PaymentTypeSchema,
    /** Required for a BOOST SKU; the backend verifies ownership and approval. */
    propertyId: z.string().uuid().optional(),
    method: z.enum(["CARD", "WALLET"]).optional(),
    walletPhone: EgyptianMobileSchema.optional(),
  })
  .superRefine((request, context) => {
    if (request.method === "WALLET" && !request.walletPhone) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["walletPhone"],
        message: "Wallet phone is required for mobile wallet payments",
      });
    }
    if (request.paymentType.startsWith("BOOST_") && !request.propertyId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["propertyId"],
        message: "Property is required for a boost",
      });
    }
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
    "PREMIUM_OWNER",
    "OWNER_PLUS",
    "SINGLE_LISTING",
    "SINGLE_OFFER",
    "BOOST_LISTING",
    "AI_ADDON",
    "DOCS_PACK",
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

/** Server-authoritative owner plan, period, expiring add-ons, and usage. */
export const UserQuotaSchema = z.object({
  planType: z.enum(["FREE", "OWNER_PLUS", "PREMIUM"]),
  billingInterval: z.enum(["MONTHLY", "YEARLY"]).nullable(),
  planExpiresAt: z.string().nullable(),
  currentPeriodStartsAt: z.string().nullable(),
  currentPeriodEndsAt: z.string().nullable(),
  maxActiveListings: z.number().int().positive(),
  activeUnitCount: z.number().int().nonnegative(),
  listingGraceEndsAt: z.string().nullable(),
  freeListingsLeft: z.number().int().nonnegative(),
  optimizerUsesLeft: z.number().int().nonnegative(),
  freeOffersLeft: z.number().int().nonnegative(),
  boostCreditsLeft: z.number().int().nonnegative(),
  boostCreditDurationDays: z.number().int().positive(),
  lastResetDate: z.string().nullable(),
});
export type UserQuota = z.infer<typeof UserQuotaSchema>;
