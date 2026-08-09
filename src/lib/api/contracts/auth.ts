import { z } from "zod";
import { VerificationStatusSchema } from "./verification";

/**
 * Mirrors the Final ERD's `USER` entity. ERD fields are snake_case; the API
 * boundary is assumed to map them to camelCase (ASSUMPTIONS.md #2).
 * `password_hash` never crosses the wire.
 */

/**
 * ERD: `USER.role ENUM "TENANT, LANDLORD, ADMIN"` — one role per account.
 * Someone who is both an owner and a tenant creates two separate accounts,
 * each with its own eKYC (docs/analysis/conflicts.md A1). `BROKER` is a Later
 * role (A2): add it here, never by hardcoding role names in UI/logic.
 */
export const AccountRoleSchema = z.enum(["tenant", "landlord", "admin"]);
export type AccountRole = z.infer<typeof AccountRoleSchema>;

/** Public signup is explicitly Tenant OR Landlord (PRO-02). Admins are seeded. */
export const SignupRoleSchema = z.enum(["tenant", "landlord"]);
export type SignupRole = z.infer<typeof SignupRoleSchema>;

export const RegisterRequestSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phoneNumber: z.string().min(8),
  password: z.string().min(8),
  role: SignupRoleSchema,
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const EmailVerificationRequestSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});
export type EmailVerificationRequest = z.infer<typeof EmailVerificationRequestSchema>;

export const ResendEmailVerificationRequestSchema = z.object({
  email: z.string().email(),
});
export type ResendEmailVerificationRequest = z.infer<typeof ResendEmailVerificationRequestSchema>;

export const RegistrationVerificationSchema = z.object({
  verificationRequired: z.literal(true),
  email: z.string().email(),
  resendAvailableAt: z.string().datetime(),
});
export type RegistrationVerification = z.infer<typeof RegistrationVerificationSchema>;

export const RequestAccountReviewSchema = LoginRequestSchema.extend({
  message: z.string().min(10).max(1000).optional(),
});
export type RequestAccountReview = z.infer<typeof RequestAccountReviewSchema>;

export const UserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  phoneNumber: z.string(),
  role: AccountRoleSchema,
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  /** Canonical lifecycle value; GET /verification/me remains the gate source. */
  verificationStatus: VerificationStatusSchema,
});
export type User = z.infer<typeof UserSchema>;

/** What the BFF returns to the browser — never the raw tokens. */
export const AuthResponseSchema = z.object({ user: UserSchema });
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/** Shape returned by Nest; consumed only inside app/api/auth/*. */
const BackendUserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  phoneNumber: z.string(),
  role: AccountRoleSchema,
  avatarUrl: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  lastLoginAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  verificationStatus: VerificationStatusSchema,
});

export const BackendUserResponseSchema = BackendUserSchema.transform((user): User => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  phoneNumber: user.phoneNumber,
  role: user.role,
  avatarUrl: user.avatarUrl ?? null,
  createdAt: user.createdAt,
  verificationStatus: user.verificationStatus,
}));

export const BackendMeResponseSchema = z.union([
  BackendUserResponseSchema,
  z.object({ user: BackendUserResponseSchema }).transform(({ user }) => user),
]);

export const BackendAuthTokensSchema = z.object({
  accessToken: z.string().optional(),
  accesstoken: z.string().optional(),
  refreshToken: z.string(),
  user: BackendUserResponseSchema,
}).refine((tokens) => Boolean(tokens.accessToken ?? tokens.accesstoken), {
  message: "Backend auth response must include an access token.",
  path: ["accessToken"],
}).transform((tokens) => ({
  accessToken: tokens.accessToken ?? tokens.accesstoken!,
  refreshToken: tokens.refreshToken,
  user: tokens.user,
}));
export type BackendAuthTokens = z.infer<typeof BackendAuthTokensSchema>;

/** POST /auth/login's 403 body for a soft-deleted account (see JwtStrategy /
 * AuthService.signIn — ERD-adjacent, not a formal ERD field). */
export const AccountSuspendedErrorSchema = z.object({
  statusCode: z.literal(403),
  code: z.literal("ACCOUNT_SUSPENDED"),
  message: z.string(),
});
export type AccountSuspendedError = z.infer<typeof AccountSuspendedErrorSchema>;

/** POST /auth/request-reactivation response. */
export const RequestReactivationResponseSchema = z.object({
  id: z.string(),
  kind: z.literal("SUSPENSION_APPEAL").optional(),
  status: z.enum([
    "PENDING",
    "APPROVED",
    "REJECTED",
    "new",
    "assigned",
    "in_progress",
    "waiting",
    "closed",
  ]),
});
export type RequestReactivationResponse = z.infer<typeof RequestReactivationResponseSchema>;
