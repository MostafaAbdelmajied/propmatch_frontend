import { z } from "zod";
import { PropertyStatusSchema } from "./common";

/**
 * Mirrors the ERD's `PROPERTY` + `PROPERTY_IMAGE`.
 *
 * Data masking (SRS 3.4): `manualAddress` and the owner's phone are omitted by
 * the backend until this tenant has an ACCEPTED offer / CONNECTED match. The
 * UI shows the general area (governorate/city/district) pre-reveal and must
 * never rely on client-side hiding (requirements.md §1.2).
 */

/** ERD: `property_type ENUM "APARTMENT, VILLA, STUDIO"` — 3 types only (conflicts.md A6). */
export const PropertyTypeSchema = z.enum(["APARTMENT", "VILLA", "STUDIO"]);
export type PropertyType = z.infer<typeof PropertyTypeSchema>;

export const propertyTypeLabels: Record<PropertyType, string> = {
  APARTMENT: "شقة",
  VILLA: "فيلا",
  STUDIO: "ستوديو",
};

/** ERD: `PROPERTY_IMAGE` — order matters and one image is the cover. */
export const PropertyImageSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  displayOrder: z.number().int(),
  isCover: z.boolean(),
});
export type PropertyImage = z.infer<typeof PropertyImageSchema>;

/** Landlord-authored fields (PRO-04). */
export const CreatePropertyRequestSchema = z.object({
  title: z.string().min(4),
  description: z.string().min(20),
  governorate: z.string().min(1),
  city: z.string().min(1),
  district: z.string().min(1),
  /** Exact address — masked from tenants until connection. */
  manualAddress: z.string().min(5),
  propertyType: PropertyTypeSchema,
  /** Free text fed to the AI matcher (ERD: "Used by AI for matching"). */
  propertyAroundServices: z.string().optional(),
  rentAmount: z.number().positive(),
  areaM2: z.number().positive(),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  isFurnished: z.boolean(),
  hasElevator: z.boolean(),
  hasParking: z.boolean(),
  images: z.array(z.string()).min(1, "أضف صورة واحدة على الأقل"),
});
export type CreatePropertyRequest = z.infer<typeof CreatePropertyRequestSchema>;

/** Card/list projection — never carries masked fields. */
export const PropertySummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  governorate: z.string(),
  city: z.string(),
  district: z.string(),
  propertyType: PropertyTypeSchema,
  rentAmount: z.number(),
  areaM2: z.number(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  isFurnished: z.boolean(),
  isBoosted: z.boolean(),
  status: PropertyStatusSchema,
  coverImage: z.string().nullable(),
  ownerVerified: z.boolean(),
});
export type PropertySummary = z.infer<typeof PropertySummarySchema>;

/** Backend-owned, deterministic explanation for a semantic property result. */
export const SemanticMatchReasonSchema = z.object({
  code: z.enum([
    "LOCATION_MENTION_MATCH",
    "PROPERTY_TYPE_MENTION_MATCH",
    "BEDROOM_MENTION_MATCH",
    "FURNISHING_MENTION_MATCH",
    "MATCHES_SEARCH_INTENT",
  ]),
  text: z.string(),
});
export type SemanticMatchReason = z.infer<typeof SemanticMatchReasonSchema>;

/** Narrow semantic-search extension; ordinary property cards remain unchanged. */
export const SemanticPropertySearchItemSchema = PropertySummarySchema.extend({
  semanticSimilarity: z.number(),
  matchReasons: z.array(SemanticMatchReasonSchema).max(3),
});
export type SemanticPropertySearchItem = z.infer<typeof SemanticPropertySearchItemSchema>;

export const SemanticPropertySearchResponseSchema = z.object({
  items: z.array(SemanticPropertySearchItemSchema),
  total: z.number().int().nonnegative(),
  resultCount: z.number().int().nonnegative(),
  page: z.literal(1),
  pageSize: z.number().int().min(1).max(20),
  reason: z.literal("NO_RELEVANT_SEMANTIC_MATCH").optional(),
});
export type SemanticPropertySearchResponse = z.infer<typeof SemanticPropertySearchResponseSchema>;

export const PropertyDetailSchema = PropertySummarySchema.extend({
  description: z.string(),
  propertyAroundServices: z.string().nullable(),
  hasElevator: z.boolean(),
  hasParking: z.boolean(),
  ownerId: z.string(),
  images: z.array(PropertyImageSchema),
  /** True once this viewer's connection unlocks contact (ERD: contact_revealed). */
  contactRevealed: z.boolean(),
  /** Present ONLY when contactRevealed — omitted by the backend otherwise. */
  manualAddress: z.string().nullable(),
  ownerPhoneNumber: z.string().nullable(),
  ownerName: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  approvedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type PropertyDetail = z.infer<typeof PropertyDetailSchema>;

/** PRO-10: AI Form Optimizer — user must review before publishing. */
export const OptimizeDescriptionRequestSchema = z.object({
  description: z.string().min(1).max(2000),
});
export type OptimizeDescriptionRequest = z.infer<typeof OptimizeDescriptionRequestSchema>;

export const OptimizeDescriptionResponseSchema = z.object({
  optimized: z.string(),
  optimizerUsesLeft: z.number().int(),
});
export type OptimizeDescriptionResponse = z.infer<typeof OptimizeDescriptionResponseSchema>;

/** Hybrid search filters (PRO-11): hard SQL filters + free-text semantic query. */
export const PropertySearchQuerySchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  propertyType: PropertyTypeSchema.optional(),
  minRent: z.number().optional(),
  maxRent: z.number().optional(),
  bedrooms: z.number().int().optional(),
  isFurnished: z.boolean().optional(),
});
export type PropertySearchQuery = z.infer<typeof PropertySearchQuerySchema>;

export type SemanticPropertySearchInput = {
  query: string;
  limit?: number;
};
