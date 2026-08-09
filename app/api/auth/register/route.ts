import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/src/lib/api/client";
import { RegisterRequestSchema, RegistrationVerificationSchema } from "@/src/lib/api/contracts/auth";

export async function POST(request: NextRequest) {
  const parsed = RegisterRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { statusCode: 400, message: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  try {
    const backendResponse = await backendFetch<unknown>("/auth/register", {
      method: "POST",
      body: { ...parsed.data, role: parsed.data.role.toUpperCase() },
    });

    const result = RegistrationVerificationSchema.safeParse(backendResponse);
    if (!result.success) {
      return NextResponse.json(
        { statusCode: 502, message: "Invalid registration response from backend" },
        { status: 502 },
      );
    }
    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json({ statusCode: error.statusCode, message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}
