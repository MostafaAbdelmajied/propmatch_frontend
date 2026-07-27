import { z } from "zod";
import { PropertyTypeSchema } from "./property";

/**
 * Mirrors the ERD's `TENANT_REQUEST` — the tenant side of the reverse
 * marketplace (PRO-05). Requests enter PENDING and require admin approval
 * (anti-spam, SRS 3.2.2) before being published to verified landlords with the
 * tenant's PII hidden.
 */

/** ERD: `status ENUM "PENDING, APPROVED, REJECTED, FULFILLED, CLOSED"`. */
export const TenantRequestStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "FULFILLED",
  "CLOSED",
]);
export type TenantRequestStatus = z.infer<typeof TenantRequestStatusSchema>;

export const tenantRequestStatusLabels: Record<TenantRequestStatus, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "منشور",
  REJECTED: "مرفوض",
  FULFILLED: "تم إتمامه",
  CLOSED: "مغلق",
};

export const CreateTenantRequestSchema = z
  .object({
    minBudget: z.number().min(0),
    maxBudget: z.number().positive(),
    /** ERD: free text. */
    preferredLocations: z.string().min(2, "اذكر المناطق المفضلة"),
    propertyType: PropertyTypeSchema,
    requiredBedrooms: z.number().int().min(0),
    needsFurnished: z.boolean(),
    /** ERD: "e.g., 1 to 10" — how flexible the tenant is on their criteria. */
    flexibilityScore: z.number().int().min(1).max(10),
    /** ERD: "Free text for AI matching" — the signature open field. */
    lifestyleRequirements: z.string().min(10, "اكتب وصفًا لا يقل عن ١٠ أحرف"),
  })
  .refine((v) => v.maxBudget >= v.minBudget, {
    message: "أعلى ميزانية يجب أن تكون أكبر من أقلها",
    path: ["maxBudget"],
  });
export type CreateTenantRequest = z.infer<typeof CreateTenantRequestSchema>;

export const TenantRequestSuggestionFieldSchema = z.enum([
  "minBudget",
  "maxBudget",
  "preferredLocations",
  "propertyType",
  "requiredBedrooms",
  "needsFurnished",
  "flexibilityScore",
  "lifestyleRequirements",
]);
export type TenantRequestSuggestionField = z.infer<typeof TenantRequestSuggestionFieldSchema>;

export const ExtractTenantRequestSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});
export type ExtractTenantRequest = z.infer<typeof ExtractTenantRequestSchema>;

export const TenantRequestExtractionSuggestionsSchema = z
  .object({
    minBudget: z.number().finite().nullable(),
    maxBudget: z.number().finite().nullable(),
    preferredLocations: z.string().nullable(),
    propertyType: PropertyTypeSchema.nullable(),
    requiredBedrooms: z.number().int().min(0).nullable(),
    needsFurnished: z.boolean().nullable(),
    flexibilityScore: z.number().int().min(1).max(10).nullable(),
    lifestyleRequirements: z.string().nullable(),
  })
  .strict();
export type TenantRequestExtractionSuggestions = z.infer<
  typeof TenantRequestExtractionSuggestionsSchema
>;

export const TenantRequestExtractionResponseSchema = z
  .object({
    originalText: z.string(),
    suggestions: TenantRequestExtractionSuggestionsSchema,
    missingFields: z.array(TenantRequestSuggestionFieldSchema),
  })
  .strict();
export type TenantRequestExtractionResponse = z.infer<typeof TenantRequestExtractionResponseSchema>;

export const tenantRequestExtractionErrorCodes = [
  "TENANT_REQUEST_EXTRACTION_UNAVAILABLE",
  "TENANT_REQUEST_EXTRACTION_TIMEOUT",
  "TENANT_REQUEST_EXTRACTION_INVALID_RESPONSE",
] as const;
export type TenantRequestExtractionErrorCode = (typeof tenantRequestExtractionErrorCodes)[number];

/** The tenant's own view of their request. */
export const TenantRequestSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  minBudget: z.number(),
  maxBudget: z.number(),
  preferredLocations: z.string(),
  propertyType: PropertyTypeSchema,
  requiredBedrooms: z.number(),
  needsFurnished: z.boolean(),
  flexibilityScore: z.number(),
  lifestyleRequirements: z.string(),
  status: TenantRequestStatusSchema,
  rejectionReason: z.string().nullable(),
  offersCount: z.number().int(),
  createdAt: z.string(),
});
export type TenantRequest = z.infer<typeof TenantRequestSchema>;

/**
 * What a landlord sees when browsing approved requests (PRO-13). The tenant's
 * identity stays hidden until they accept an offer (requirements.md §3) — so
 * no name, phone or email here.
 */
export const BrowsableTenantRequestSchema = z.object({
  id: z.string(),
  minBudget: z.number(),
  maxBudget: z.number(),
  preferredLocations: z.string(),
  propertyType: PropertyTypeSchema,
  requiredBedrooms: z.number(),
  needsFurnished: z.boolean(),
  flexibilityScore: z.number(),
  lifestyleRequirements: z.string(),
  createdAt: z.string(),
  /** Best match score across this landlord's own properties (0–100), if any. */
  matchScore: z.number().min(0).max(100).nullable(),
  /** True once this landlord has already offered on this request. */
  alreadyOffered: z.boolean(),
  bestMatchingProperty: z
    .object({
      id: z.string(),
      title: z.string(),
    })
    .nullable()
    .optional(),
});
export type BrowsableTenantRequest = z.infer<typeof BrowsableTenantRequestSchema>;
