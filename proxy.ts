import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/src/lib/api/client";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "@/src/lib/api/cookies";
import { BackendAuthTokensSchema } from "@/src/lib/api/contracts/auth";

/**
 * Coarse route protection only — redirects unauthenticated users away from
 * role-scoped areas for UX. This is NOT the authorization boundary: the
 * signature isn't verified here (Edge runtime doesn't have the backend's
 * JWT secret), so every Route Handler / Server Component must still treat
 * NestJS's 401/403 as authoritative. See docs/analysis/rbac.md, "Enforcement
 * layers".
 */

const PROTECTED_PREFIXES = [
  "/admin",
  "/landlord",
  "/profile",
  "/verify",
  // Role-agnostic support ticket deep links (from notifications).
  "/support",
  // Browsing (/tenant) stays open; the tenant's own surfaces don't.
  "/tenant/requests",
  "/tenant/offers",
  "/tenant/favorites",
];

function decodeJwtExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirectTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const expiry = token ? decodeJwtExpiry(token) : null;
  const isLikelyValid = expiry !== null && expiry * 1000 > Date.now();

  if (isLikelyValid) return NextResponse.next();

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return redirectToLogin(request);

  try {
    const backendResponse = await backendFetch<unknown>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
    const tokens = BackendAuthTokensSchema.parse(backendResponse);

    // Cookies set on this response are visible only on the next request. Reload
    // the same protected URL so its Server Components receive the fresh token.
    const response = NextResponse.redirect(request.nextUrl);
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    const response = redirectToLogin(request);
    if (error instanceof BackendApiError && error.statusCode === 401) clearAuthCookies(response);
    return response;
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/landlord/:path*",
    "/profile/:path*",
    "/verify/:path*",
    "/support/:path*",
    "/tenant/requests/:path*",
    "/tenant/offers/:path*",
    "/tenant/favorites/:path*",
  ],
};
