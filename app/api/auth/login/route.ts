import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/src/lib/api/client";
import { setAuthCookies } from "@/src/lib/api/cookies";
import { LoginRequestSchema, BackendAuthTokensSchema, type AuthResponse } from "@/src/lib/api/contracts/auth";

export async function POST(request: NextRequest) {
  const parsed = LoginRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ statusCode: 400, message: parsed.error.issues.map((i) => i.message) }, { status: 400 });
  }

  try {
    const backendResponse = await backendFetch<unknown>("/auth/login", {
      method: "POST",
      body: parsed.data,
    });
    const tokensResult = BackendAuthTokensSchema.safeParse(backendResponse);
    if (!tokensResult.success) {
      return NextResponse.json(
        { statusCode: 502, message: "Invalid authentication response from backend" },
        { status: 502 },
      );
    }

    const body: AuthResponse = { user: tokensResult.data.user };
    const response = NextResponse.json(body);
    setAuthCookies(response, tokensResult.data);
    return response;
  } catch (error) {
    if (error instanceof BackendApiError) {
      // Forward the full backend body (not just statusCode/message) so a
      // domain-specific payload like ACCOUNT_SUSPENDED's { code } survives
      // the proxy — see BackendApiError's own doc comment for this exact
      // precedent (the quota-exhausted 403).
      const body =
        error.body && typeof error.body === "object" ? error.body : { statusCode: error.statusCode, message: error.message };
      return NextResponse.json(body, { status: error.statusCode });
    }
    throw error;
  }
}
