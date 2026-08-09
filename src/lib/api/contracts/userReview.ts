import { z } from "zod";

export const UserReviewDirectionSchema = z.enum(["TENANT_TO_LANDLORD", "LANDLORD_TO_TENANT"]);
export type UserReviewDirection = z.infer<typeof UserReviewDirectionSchema>;

const RatingSchema = z.number().int().min(1).max(5);

export const CreateUserReviewSchema = z.object({
  overallRating: RatingSchema,
  communicationRating: RatingSchema,
  responsivenessRating: RatingSchema,
  propertyAccuracyRating: RatingSchema.optional(),
  commitmentRating: RatingSchema.optional(),
});
export type CreateUserReview = z.infer<typeof CreateUserReviewSchema>;

export const UserReviewSchema = z.object({
  id: z.string(),
  direction: UserReviewDirectionSchema,
  overallRating: RatingSchema,
  communicationRating: RatingSchema,
  responsivenessRating: RatingSchema,
  propertyAccuracyRating: RatingSchema.nullable(),
  commitmentRating: RatingSchema.nullable(),
  createdAt: z.string(),
});
export type UserReview = z.infer<typeof UserReviewSchema>;

export const UserReviewSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  overallRating: z.number().min(1).max(5).nullable(),
  communicationRating: z.number().min(1).max(5).nullable(),
  responsivenessRating: z.number().min(1).max(5).nullable(),
  propertyAccuracyRating: z.number().min(1).max(5).nullable(),
  commitmentRating: z.number().min(1).max(5).nullable(),
});
export type UserReviewSummary = z.infer<typeof UserReviewSummarySchema>;

export const ContractUserReviewStatusSchema = z.object({
  eligible: z.boolean(),
  submitted: z.boolean(),
  direction: UserReviewDirectionSchema,
  revieweeId: z.string(),
  revieweeName: z.string(),
  review: UserReviewSchema.nullable(),
  receivedSummary: UserReviewSummarySchema,
});
export type ContractUserReviewStatus = z.infer<typeof ContractUserReviewStatusSchema>;
