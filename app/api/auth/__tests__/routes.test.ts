import type { NextRequest } from "next/server";
import { BackendApiError, backendFetch } from "@/src/lib/api/client";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/src/lib/api/cookies";
import { POST as login } from "../login/route";
import { GET as me } from "../me/route";
import { POST as refresh } from "../refresh/route";
import { POST as register } from "../register/route";

jest.mock("@/src/lib/api/client", () => {
  const actual = jest.requireActual("@/src/lib/api/client");
  return { ...actual, backendFetch: jest.fn() };
});

const mockedBackendFetch = jest.mocked(backendFetch);
const backendUser = {
  id: "user-1",
  fullName: "Sarah Ahmed",
  email: "sara@example.com",
  phoneNumber: "01012345678",
  role: "admin",
  isActive: true,
  lastLoginAt: null,
  createdAt: "2026-07-20T10:22:39.215Z",
  updatedAt: "2026-07-20T10:22:39.215Z",
  verificationStatus: "NOT_SUBMITTED",
};
const validTokens = { accessToken: "access-token", refreshToken: "refresh-token", user: backendUser };

function authRequest(url: string, body: unknown) {
  return new Request(url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }) as unknown as NextRequest;
}

const registration = { fullName: "Sarah Ahmed", email: "sara@example.com", phoneNumber: "01012345678", password: "12345678", role: "tenant" };

describe("auth BFF routes", () => {
  beforeEach(() => mockedBackendFetch.mockReset());

  it("returns only the user and httpOnly cookies for a valid current login response", async () => {
    mockedBackendFetch.mockResolvedValue(validTokens);

    const response = await login(authRequest("http://localhost/api/auth/login", { email: registration.email, password: registration.password }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user: expect.objectContaining({ role: "admin", verificationStatus: "NOT_SUBMITTED", phoneNumber: "01012345678" }) });
    const cookies = response.headers.get("set-cookie") ?? "";
    expect(cookies).toContain("propmatch_access_token=access-token");
    expect(cookies).toContain("propmatch_refresh_token=refresh-token");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).not.toContain('"accessToken"');
  });

  it("returns a resolved 502 without cookies for an invalid successful login contract", async () => {
    mockedBackendFetch.mockResolvedValue({ refreshToken: "refresh-token", user: backendUser });

    const response = await login(authRequest("http://localhost/api/auth/login", { email: registration.email, password: registration.password }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ statusCode: 502, message: "Invalid authentication response from backend" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("preserves backend login failures", async () => {
    mockedBackendFetch.mockRejectedValue(new BackendApiError(401, "Unauthorized"));
    const response = await login(authRequest("http://localhost/api/auth/login", { email: registration.email, password: registration.password }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ statusCode: 401, message: "Unauthorized" });
  });

  it("maps a registration to the backend and keeps tokens cookie-only", async () => {
    mockedBackendFetch.mockResolvedValue(validTokens);
    const response = await register(authRequest("http://localhost/api/auth/register", registration));

    expect(mockedBackendFetch).toHaveBeenCalledWith("/auth/register", { method: "POST", body: { ...registration, role: "TENANT" } });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user: expect.any(Object) });
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("returns 502 without cookies for an invalid successful registration contract", async () => {
    mockedBackendFetch.mockResolvedValue({ accessToken: "access-token", user: backendUser });
    const response = await register(authRequest("http://localhost/api/auth/register", registration));
    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("preserves registration validation and backend conflicts", async () => {
    expect((await register(authRequest("http://localhost/api/auth/register", { role: "admin" }))).status).toBe(400);
    mockedBackendFetch.mockRejectedValue(new BackendApiError(409, "Email already exists."));
    const response = await register(authRequest("http://localhost/api/auth/register", registration));
    expect(response.status).toBe(409);
  });

  it("parses the direct backend auth/me response into the browser wrapper", async () => {
    mockedBackendFetch.mockResolvedValue(backendUser);
    const request = { cookies: { get: jest.fn().mockReturnValue({ value: "access-token" }) } } as unknown as NextRequest;
    const response = await me(request);

    expect(request.cookies.get).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE);
    expect(mockedBackendFetch).toHaveBeenCalledWith("/auth/me", { accessToken: "access-token" });
    await expect(response.json()).resolves.toEqual({ user: expect.objectContaining({ id: "user-1", phoneNumber: "01012345678" }) });
  });

  it("returns 502 for an invalid successful auth/me response", async () => {
    mockedBackendFetch.mockResolvedValue({ ...backendUser, phoneNumber: undefined });
    const request = { cookies: { get: jest.fn().mockReturnValue({ value: "access-token" }) } } as unknown as NextRequest;
    const response = await me(request);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ statusCode: 502, message: "Invalid authentication response from backend" });
  });

  it("preserves missing-cookie and backend auth/me 401 responses", async () => {
    const missing = await me({ cookies: { get: jest.fn().mockReturnValue(undefined) } } as unknown as NextRequest);
    expect(missing.status).toBe(401);
    mockedBackendFetch.mockRejectedValue(new BackendApiError(401, "Unauthorized"));
    const expired = await me({ cookies: { get: jest.fn().mockReturnValue({ value: "expired-token" }) } } as unknown as NextRequest);
    expect(expired.status).toBe(401);
  });

  it("rotates cookie-only tokens from the refresh-token cookie", async () => {
    mockedBackendFetch.mockResolvedValue(validTokens);
    const request = {
      cookies: { get: jest.fn().mockReturnValue({ value: "old-refresh-token" }) },
    } as unknown as NextRequest;

    const response = await refresh(request);

    expect(request.cookies.get).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE);
    expect(mockedBackendFetch).toHaveBeenCalledWith("/auth/refresh", {
      method: "POST",
      body: { refreshToken: "old-refresh-token" },
    });
    expect(response.status).toBe(200);
    const cookies = response.headers.get("set-cookie") ?? "";
    expect(cookies).toContain("propmatch_access_token=access-token");
    expect(cookies).toContain("propmatch_refresh_token=refresh-token");
    await expect(response.json()).resolves.toEqual({
      user: expect.objectContaining({
        id: backendUser.id,
        role: backendUser.role,
        verificationStatus: backendUser.verificationStatus,
      }),
    });
  });

  it("clears auth cookies when the backend rejects a refresh token", async () => {
    mockedBackendFetch.mockRejectedValue(new BackendApiError(401, "Invalid refresh token"));
    const request = {
      cookies: { get: jest.fn().mockReturnValue({ value: "invalid-refresh-token" }) },
    } as unknown as NextRequest;

    const response = await refresh(request);

    expect(response.status).toBe(401);
    const cookies = response.headers.get("set-cookie") ?? "";
    expect(cookies).toContain("propmatch_access_token=");
    expect(cookies).toContain("propmatch_refresh_token=");
  });
});
