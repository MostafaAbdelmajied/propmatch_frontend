import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/src/lib/api/client";
import { ACCESS_TOKEN_COOKIE } from "@/src/lib/api/cookies";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ statusCode: 401, message: "Not authenticated" }, { status: 401 });
  }
  try {
    const ticket = await backendFetch<{ token: string }>("/auth/socket-ticket", {
      method: "POST",
      accessToken,
    });
    return NextResponse.json(ticket);
  } catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json({ statusCode: error.statusCode, message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}
