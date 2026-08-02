import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/src/lib/api/client";
import { ACCESS_TOKEN_COOKIE } from "@/src/lib/api/cookies";
import { BackendMeResponseSchema } from "@/src/lib/api/contracts/auth";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ statusCode: 401, message: "Not authenticated" }, { status: 401 });
  }

  try {
    const backendResponse = await backendFetch<unknown>("/auth/me", { accessToken });
    const userResult = BackendMeResponseSchema.safeParse(backendResponse);
    if (!userResult.success) {
      return NextResponse.json(
        { statusCode: 502, message: "Invalid authentication response from backend" },
        { status: 502 },
      );
    }
    return NextResponse.json({ user: userResult.data });
  } catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json({ statusCode: error.statusCode, message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}
