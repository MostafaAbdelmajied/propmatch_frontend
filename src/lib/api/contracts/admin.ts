import { z } from "zod";
import { CapabilitySchema, ModerationStatusSchema, type Capability } from "./common";
import { PropertyTypeSchema } from "./property";
import { TenantRequestStatusSchema } from "./tenantRequest";

/**
 * Admin moderation surface (PRO-07/08) + admin management.
 *
 * Scoped admin sub-roles were deleted in Phase 2 as out-of-scope and restored
 * by explicit request — see `docs/analysis/conflicts.md` B2-R. They have **no
 * ERD entity and no PRO ticket**, so everything below the moderation queues is
 * a frontend contract the NestJS team has not agreed to
 * (`ASSUMPTIONS.md` #26).
 *
 * Roles are only bundles of capabilities; the UI and backend check
 * capabilities, never role names (docs/analysis/rbac.md). That is what keeps
 * the Later BROKER role addable without rework.
 */

export const AdminRoleSchema = z.enum([
  "super-admin",
  "listings-manager",
  "kyc-reviewer",
  "finance-admin",
  "reviews-manager",
  "customer-support",
  "read-only",
]);
export type AdminRole = z.infer<typeof AdminRoleSchema>;

export const adminRoleLabels: Record<AdminRole, string> = {
  "super-admin": "مشرف عام",
  "listings-manager": "مدير العقارات",
  "kyc-reviewer": "مراجع التوثيق",
  "finance-admin": "مدير مالي",
  "reviews-manager": "مدير التقييمات",
  "customer-support": "دعم العملاء",
  "read-only": "اطّلاع فقط",
};

/**
 * Named roles → capability sets. Single source of truth for the mock backend
 * and the admin-management UI.
 *
 * `pii:reveal` is deliberately absent (it existed pre-deletion): contact
 * reveal is a per-connection gate, never a role grant — see `common.ts`.
 */
export const ROLE_CAPABILITIES: Record<AdminRole, Capability[]> = {
  "super-admin": [
    "property:approve",
    "property:reject",
    "kyc:review",
    "request:approve",
    "request:reject",
    "review:moderate",
    "payment:view",
    "commercial:manage",
    "partner_lead:view",
    "report:export",
    "ticket:reply",
    "audit:view",
    "user:suspend",
    "admin:create",
    "admin:manage",
    "user:delete",
    "user:reactivate",
  ],
  "listings-manager": ["property:approve", "property:reject"],
  "kyc-reviewer": ["kyc:review"],
  "finance-admin": ["payment:view", "commercial:manage", "partner_lead:view", "report:export"],
  "reviews-manager": ["review:moderate", "request:approve", "request:reject"],
  "customer-support": ["ticket:reply"],
  "read-only": [],
};

/** Every capability a super-admin holds — the seed admin's set. */
export const ADMIN_CAPABILITIES = ROLE_CAPABILITIES["super-admin"];

export const AdminSessionSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  role: AdminRoleSchema,
  roleName: z.string(),
  capabilities: z.array(CapabilitySchema),
});
export type AdminSession = z.infer<typeof AdminSessionSchema>;

/**
 * Moderation queues: eKYC, new properties, edited properties, tenant requests
 * and property reviews. All share PENDING → APPROVED/REJECTED.
 */
export const QueueItemTypeSchema = z.enum(["kyc", "property", "propertyEdit", "request", "review"]);
export type QueueItemType = z.infer<typeof QueueItemTypeSchema>;

export const QueueItemSchema = z.object({
  id: z.string(),
  type: QueueItemTypeSchema,
  /** The moderated entity's id (user / property / tenant_request / review). */
  subjectId: z.string(),
  title: z.string(),
  subtitle: z.string(),
  submittedAt: z.string(),
  commercialPriority: z.enum(["FREEMIUM", "OWNER_PLUS", "PREMIUM"]).optional(),
});
export type QueueItem = z.infer<typeof QueueItemSchema>;

export const AdminQueuesResponseSchema = z.object({
  kycQueue: z.array(QueueItemSchema),
  propertyQueue: z.array(QueueItemSchema),
  editedPropertyQueue: z.array(QueueItemSchema),
  requestQueue: z.array(QueueItemSchema),
  reviewQueue: z.array(QueueItemSchema),
});
export type AdminQueuesResponse = z.infer<typeof AdminQueuesResponseSchema>;

/** Rejection requires a reason (stored on the entity for the user to correct). */
export const ReviewDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

/**
 * eKYC review detail. Per ERD, the reviewer sees the extracted national_id and
 * the three document URLs. `nationalId` is masked to the last 4 everywhere
 * except this screen (requirements.md §3).
 */
export const KycReviewDetailSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  nationalId: z.string().nullable(),
  nationalIdFrontUrl: z
    .string()
    .url()
    .refine((value) => /^https?:\/\//.test(value)),
  nationalIdBackUrl: z
    .string()
    .url()
    .refine((value) => /^https?:\/\//.test(value)),
  selfieUrl: z
    .string()
    .url()
    .refine((value) => /^https?:\/\//.test(value)),
  submittedAt: z.string(),
});
export type KycReviewDetail = z.infer<typeof KycReviewDetailSchema>;

/** Safe, admin-only projection used to moderate a property listing. */
export const AdminPropertyReviewDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  governorate: z.string(),
  city: z.string(),
  district: z.string(),
  manualAddress: z.string(),
  propertyType: PropertyTypeSchema,
  rentAmount: z.number(),
  areaM2: z.number(),
  bedrooms: z.number().int(),
  bathrooms: z.number().int(),
  isFurnished: z.boolean(),
  hasElevator: z.boolean(),
  hasParking: z.boolean(),
  propertyAroundServices: z.string().nullable(),
  status: ModerationStatusSchema,
  createdAt: z.string(),
  images: z.array(
    z.object({
      id: z.string(),
      imageUrl: z.string(),
      displayOrder: z.number().int(),
      isCover: z.boolean(),
    }),
  ),
  ownerName: z.string(),
  ownerVerificationStatus: z.string(),
});
export type AdminPropertyReviewDetail = z.infer<typeof AdminPropertyReviewDetailSchema>;

/**
 * Tenant-request moderation detail (PRO-08). The admin *does* see the tenant's
 * identity here — unlike a landlord browsing — because catching PII the tenant
 * typed into the free-text fields is precisely what this screen is for
 * (ASSUMPTIONS.md #20).
 */
export const AdminTenantRequestDetailSchema = z.object({
  id: z.string(),
  tenantName: z.string(),
  tenantVerificationStatus: z.string(),
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
  createdAt: z.string(),
});
export type AdminTenantRequestDetail = z.infer<typeof AdminTenantRequestDetailSchema>;

/** Property-review moderation detail (PRO-08 / SRS 3.7). */
export const AdminReviewDetailSchema = z.object({
  id: z.string(),
  reviewerName: z.string(),
  propertyId: z.string(),
  propertyTitle: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string(),
  status: ModerationStatusSchema,
  createdAt: z.string(),
});
export type AdminReviewDetail = z.infer<typeof AdminReviewDetailSchema>;

/**
 * Admin records views (build prompt §8.13): Payment Records + Partner Lead
 * Records with Recharts stats. Sourced from PAYMENT_TRANSACTION /
 * PARTNER_LEAD — not a separate ERD entity.
 */
export const AdminStatsSchema = z.object({
  summary: z.object({
    totalRevenue: z.number(),
    totalTransactions: z.number(),
    activeListings: z.number(),
    pendingModeration: z.number(),
  }),
  monthlyRevenue: z.array(
    z.object({ month: z.string(), revenue: z.number(), transactions: z.number() }),
  ),
  moderationDistribution: z.array(z.object({ label: z.string(), value: z.number() })),
});
export type AdminStats = z.infer<typeof AdminStatsSchema>;

/* ------------------------- admin & RBAC management ------------------------ */
/* Restored per conflicts.md B2-R. No ERD entity backs any of this.           */

export const AdminTeamMemberSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: AdminRoleSchema,
  capabilities: z.array(CapabilitySchema),
  disabled: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminTeamMember = z.infer<typeof AdminTeamMemberSchema>;

export const CreateAdminRequestSchema = z.object({
  fullName: z.string().min(2, "الاسم مطلوب"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  phoneNumber: z.string().regex(/^0(10|11|12|15)\d{8}$/, "رقم هاتف مصري غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن لا تقل عن 8 أحرف"),
  role: AdminRoleSchema,
});
export type CreateAdminRequest = z.infer<typeof CreateAdminRequestSchema>;

export const UpdateAdminRequestSchema = z.object({
  role: AdminRoleSchema.optional(),
  disabled: z.boolean().optional(),
});
export type UpdateAdminRequest = z.infer<typeof UpdateAdminRequestSchema>;

/** Append-only record of sensitive admin actions. */
export const AuditLogEntrySchema = z.object({
  id: z.string(),
  actorName: z.string(),
  action: z.string(),
  subjectId: z.string(),
  at: z.string(),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

export const LoginHistoryEntrySchema = z.object({
  id: z.string(),
  adminName: z.string(),
  ip: z.string(),
  at: z.string(),
  success: z.boolean(),
});
export type LoginHistoryEntry = z.infer<typeof LoginHistoryEntrySchema>;

/**
 * GET /admin/users item — platform accounts (tenants, landlords, admins).
 * Deliberately minimal (no ERD entity of its own; this mirrors what
 * AdminService.listUsers()/toUserRow() actually returns).
 *
 * Carries BOTH lifecycle states an admin can put an account into — they're
 * orthogonal (see the backend User.deletedAt schema comment): `deletedAt`
 * is a soft-delete "ghost" account with its own reactivation flow;
 * `suspended`/`suspendedUntil`/etc. is a live account an admin has
 * temporarily or permanently blocked.
 */
export const AdminUserListItemSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  phoneNumber: z.string().optional(),
  role: z.enum(["TENANT", "LANDLORD", "ADMIN"]),
  isActive: z.boolean(),
  createdAt: z.string(),
  /** Set once soft-deleted (self-delete or admin delete); null otherwise. */
  deletedAt: z.string().nullable(),
  suspended: z.boolean().optional(),
  /** ISO date, or null for a permanent suspension. */
  suspendedUntil: z.string().nullable().optional(),
  suspendedAt: z.string().nullable().optional(),
  suspensionReason: z.string().nullable().optional(),
  suspensionReasonLabel: z.string().nullable().optional(),
  suspensionNote: z.string().nullable().optional(),
});
export type AdminUserListItem = z.infer<typeof AdminUserListItemSchema>;

export const AdminUsersResponseSchema = z.object({
  items: z.array(AdminUserListItemSchema),
  total: z.number().int().optional(),
  page: z.number().int().optional(),
  pageSize: z.number().int().optional(),
});
export type AdminUsersResponse = z.infer<typeof AdminUsersResponseSchema>;

/** GET /admin/users?status= — mirrors AdminService.listUsers's default. */
export type AdminUserStatusFilter = "active" | "deleted" | "all";

/**
 * GET /admin/reactivations item — a soft-deleted user's self-service
 * request to have an admin restore their account. Always PENDING here
 * (the endpoint only lists pending ones); approving/rejecting removes it
 * from this list rather than changing its rendered status.
 */
export const AdminReactivationRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userFullName: z.string(),
  userEmail: z.string(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminReactivationRequest = z.infer<typeof AdminReactivationRequestSchema>;

export const AdminReactivationRequestsResponseSchema = z.object({
  items: z.array(AdminReactivationRequestSchema),
});
export type AdminReactivationRequestsResponse = z.infer<
  typeof AdminReactivationRequestsResponseSchema
>;
