import { z } from "zod";
import { ModerationStatusSchema } from "./common";

/**
 * Mirrors the ERD's `PROPERTY_REVIEW` (SRS 3.7). One-way: a tenant reviews a
 * property. Mutual tenant↔owner reputation is Later (conflicts.md A4).
 * Reviews enter PENDING and need admin approval before public display.
 */

export const CreateReviewRequestSchema = z.object({
  propertyId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5, "اكتب تعليقًا لا يقل عن ٥ أحرف").max(1000),
});
export type CreateReviewRequest = z.infer<typeof CreateReviewRequestSchema>;

export const PropertyReviewSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  reviewerName: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  status: ModerationStatusSchema,
  createdAt: z.string(),
});
export type PropertyReview = z.infer<typeof PropertyReviewSchema>;

/** Public review block on a property page — APPROVED only. */
export const PropertyReviewsResponseSchema = z.object({
  items: z.array(PropertyReviewSchema),
  averageRating: z.number().nullable(),
  total: z.number().int(),
  /** 5→1 star counts for the distribution chart. */
  distribution: z.array(z.object({ rating: z.number().int(), count: z.number().int() })),
});
export type PropertyReviewsResponse = z.infer<typeof PropertyReviewsResponseSchema>;
