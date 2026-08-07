import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AuthResponseSchema,
  BackendAuthTokensSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
} from "../auth";

const backendUser = {
  id: "user-1",
  fullName: "Sarah Ahmed",
  email: "sara@example.com",
  phoneNumber: "01012345678",
  role: "tenant",
  isActive: true,
  lastLoginAt: null,
  createdAt: "2026-07-20T10:22:39.215Z",
  updatedAt: "2026-07-20T10:22:39.215Z",
};

describe("auth contracts", () => {
  it("accepts a valid login payload", () => {
    expect(LoginRequestSchema.safeParse({ email: "a@b.com", password: "12345678" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(LoginRequestSchema.safeParse({ email: "not-an-email", password: "12345678" }).success).toBe(false);
  });

  const registerBase = {
    fullName: "سارة أحمد",
    email: "sara@example.com",
    phoneNumber: "01012345678",
    password: "12345678",
  };

  it.each(["tenant", "landlord"])("accepts signing up explicitly as %s", (role) => {
    expect(RegisterRequestSchema.safeParse({ ...registerBase, role }).success).toBe(true);
  });

  it.each(["admin", "user", "both", "broker"])("rejects the non-V1 role %s", (role) => {
    expect(RegisterRequestSchema.safeParse({ ...registerBase, role }).success).toBe(false);
  });

  it.each(["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED", "RESUBMISSION_REQUIRED"])(
    "accepts the canonical backend verification status %s",
    (verificationStatus) => {
      expect(BackendAuthTokensSchema.safeParse({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: { ...backendUser, verificationStatus },
      }).success).toBe(true);
    },
  );

  it("normalizes the backend public user without exposing backend-only fields or tokens", () => {
    const tokens = BackendAuthTokensSchema.parse({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: { ...backendUser, verificationStatus: "APPROVED" },
    });
    const browserResponse = AuthResponseSchema.parse({ user: tokens.user });

    expect(browserResponse).toEqual({
      user: {
        id: "user-1",
        fullName: "Sarah Ahmed",
        email: "sara@example.com",
        phoneNumber: "01012345678",
        role: "tenant",
        verificationStatus: "APPROVED",
        avatarUrl: null,
        createdAt: "2026-07-20T10:22:39.215Z",
      },
    });
    expect(browserResponse.user).not.toHaveProperty("isActive");
    expect(browserResponse.user).not.toHaveProperty("lastLoginAt");
    expect(browserResponse.user).not.toHaveProperty("updatedAt");
  });

  it("rejects obsolete backend user fields and missing access tokens", () => {
    const obsoleteUser = { ...backendUser, phone: backendUser.phoneNumber, verificationStatus: "verified" };
    delete (obsoleteUser as Partial<typeof obsoleteUser>).phoneNumber;
    expect(BackendAuthTokensSchema.safeParse({ accessToken: "access-token", refreshToken: "refresh-token", user: obsoleteUser }).success).toBe(false);
    expect(BackendAuthTokensSchema.safeParse({ accessToken: "access-token", refreshToken: "refresh-token", user: { ...backendUser, verificationStatus: "verified" } }).success).toBe(false);
    expect(BackendAuthTokensSchema.safeParse({ refreshToken: "refresh-token", user: { ...backendUser, verificationStatus: "PENDING" } }).success).toBe(false);
  });

  it("documents the local NestJS API prefix and port", () => {
    const example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    expect(example).toContain("NESTJS_API_URL=http://localhost:3001/api");
    expect(example).toContain("PRODCUTION=false");
    expect(example).toContain("NESTJS_API_URL_PROUDCTION=https://api.example.com/api");
    expect(example).not.toMatch(/(?:PASSWORD|TOKEN|SECRET|DATABASE_URL)=/);
  });
});
