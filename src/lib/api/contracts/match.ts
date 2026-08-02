import { z } from "zod";
import { PropertySummarySchema } from "./property";

/**
 * Mirrors the ERD's `MATCH_CONNECTION` and `FAVORITE`.
 *
 * `MATCH_CONNECTION` is the **anchor of the PII gate**: once its status is
 * CONNECTED (or an offer is ACCEPTED) the backend starts sending the owner's
 * phone and the exact address. `PROPERTY.contact_revealed` is too coarse to
 * express a per-tenant reveal — see requirements.md §1.2 / ASSUMPTIONS.md #8.
 */

/** ERD: `status ENUM "INTERESTED, CONNECTED, REJECTED"`. */
export const MatchConnectionStatusSchema = z.enum(["INTERESTED", "CONNECTED", "REJECTED"]);
export type MatchConnectionStatus = z.infer<typeof MatchConnectionStatusSchema>;

export const MatchConnectionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  propertyId: z.string(),
  ownerId: z.string(),
  /** ERD: "Stored AI calculated score". Server-authoritative (ASSUMPTIONS #7). */
  matchScore: z.number().min(0).max(100),
  /** Explainability — why this connection's score came out the way it did. */
  matchReasons: z.array(z.object({ code: z.string(), text: z.string() })).optional(),
  status: MatchConnectionStatusSchema,
  createdAt: z.string(),
});
export type MatchConnection = z.infer<typeof MatchConnectionSchema>;

/**
 * A ranked search/match result (PRO-11/13). The score here is transient — a
 * MATCH_CONNECTION row only exists once the tenant shows interest.
 */
export const MatchResultSchema = z.object({
  property: PropertySummarySchema,
  matchScore: z.number().min(0).max(100),
  /** Explainability — why this result scored the way it did. */
  matchReasons: z.array(z.object({ code: z.string(), text: z.string() })).optional(),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;

export const MatchResultsResponseSchema = z.object({
  results: z.array(MatchResultSchema),
});
export type MatchResultsResponse = z.infer<typeof MatchResultsResponseSchema>;

/** ERD: `FAVORITE` — tenant bookmarks. */
export const FavoriteSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  createdAt: z.string(),
});
export type Favorite = z.infer<typeof FavoriteSchema>;

/**
 * The viewer's connection state for a property — drives the gated-contact UI.
 * `contact` is populated only when the gate has passed.
 */
export const ConnectionStateSchema = z.object({
  status: MatchConnectionStatusSchema.nullable(),
  contact: z
    .object({
      ownerName: z.string(),
      ownerPhoneNumber: z.string(),
      manualAddress: z.string(),
    })
    .nullable(),
});
export type ConnectionState = z.infer<typeof ConnectionStateSchema>;
