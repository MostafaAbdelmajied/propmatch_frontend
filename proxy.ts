import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/src/lib/api/cookies";

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const expiry = token ? decodeJwtExpiry(token) : null;
  const isLikelyValid = expiry !== null && expiry * 1000 > Date.now();

  if (!isLikelyValid) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
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
