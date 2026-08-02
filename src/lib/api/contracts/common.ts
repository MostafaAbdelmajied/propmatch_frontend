import { z } from "zod";

/**
 * Shapes shared across contracts. Mirrors NestJS defaults: the built-in
 * exception filter shape for errors, class-validator's array-of-strings
 * message shape for 400s, and a conventional offset-based pagination envelope.
 *
 * These are assumptions until the real NestJS OpenAPI spec lands — see
 * ASSUMPTIONS.md.
 */

export const ApiErrorSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const PaginationQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const paginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  });

/**
 * Capability-based permissions — see docs/analysis/rbac.md for the matrix.
 * Check capabilities, never role names: that is what lets the Later `BROKER`
 * role be added without rework (conflicts.md A2).
 *
 * Note: PII reveal is deliberately NOT a capability, even though the restored
 * admin sub-roles (conflicts.md B2-R) previously carried a `pii:reveal` one.
 * It is a per-connection relationship gate (an ACCEPTED offer / CONNECTED
 * match) enforced by the backend omitting the fields — see rbac.md and
 * requirements.md §1.2. Re-adding it as a capability would let a support admin
 * unmask an owner's phone by role alone, which is exactly what the gate
 * exists to prevent. Admins see contact via `contactUnlocked`'s explicit
 * admin branch, which is auditable; a capability would not be.
 */
export const CapabilitySchema = z.enum([
  // Tenant
  "request:create",
  "request:close",
  "offer:accept",
  "offer:reject",
  "review:create",
  "favorite:manage",
  // Landlord
  "listing:create",
  "listing:archive",
  "listing:boost",
  "offer:send",
  // Shared
  "contract:generate",
  // Admin — bundled into named sub-roles by ROLE_CAPABILITIES in ./admin.
  "property:approve",
  "property:reject",
  "kyc:review",
  "request:approve",
  "request:reject",
  "review:moderate",
  "payment:view",
  "partner_lead:view",
  "report:export",
  "ticket:reply",
  "audit:view",
  "admin:create",
  "admin:manage",
]);
export type Capability = z.infer<typeof CapabilitySchema>;

/** ERD: `PROPERTY.status ENUM "PENDING, APPROVED, REJECTED, ARCHIVED"`. */
export const PropertyStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED", "ARCHIVED"]);
export type PropertyStatus = z.infer<typeof PropertyStatusSchema>;

/** ERD: shared PENDING/APPROVED/REJECTED moderation shape (eKYC, reviews). */
export const ModerationStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type ModerationStatus = z.infer<typeof ModerationStatusSchema>;
