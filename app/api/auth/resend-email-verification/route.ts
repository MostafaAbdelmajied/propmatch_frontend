import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/src/lib/api/client";
import { ResendEmailVerificationRequestSchema } from "@/src/lib/api/contracts/auth";

export async function POST(request: NextRequest) {
  const parsed = ResendEmailVerificationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ statusCode: 400, message: parsed.error.issues.map((issue) => issue.message) }, { status: 400 });
  }
  try {
    const response = await backendFetch<{ sent: true }>("/auth/resend-email-verification", {
      method: "POST",
      body: parsed.data,
    });
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json({ statusCode: error.statusCode, message: error.message }, { status: error.statusCode });
    }
    throw error;
  }
}
