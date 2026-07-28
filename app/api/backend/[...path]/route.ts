import { NextRequest, NextResponse } from "next/server";
import { backendFetch, backendStream, backendRaw, BackendApiError } from "@/src/lib/api/client";
import { ACCESS_TOKEN_COOKIE } from "@/src/lib/api/cookies";

/**
 * Generic BFF proxy. The browser calls `/api/backend/<path>`; this handler
 * attaches the httpOnly access token and forwards to the NestJS backend
 * (or the MSW mock). Keeps tokens out of client JS while avoiding a bespoke
 * Route Handler per endpoint. Auth endpoints stay separate (app/api/auth/*)
 * because they mint/clear cookies.
 */

/** Routes whose response is piped straight through rather than buffered. */
const isStreamPath = (path: string[]) => path.at(-1) === "stream";
const isPdfPath = (path: string[]) => path.at(-1) === "pdf" && path.at(-3) === "contracts";

async function forwardPdf(request: NextRequest, path: string[]) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const upstream = await backendRaw(`/${path.join("/")}${request.nextUrl.search}`, { method: "GET", accessToken });
  if (!upstream.ok) return new NextResponse(await upstream.text(), { status: upstream.status, headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" } });
  return new Response(upstream.body, { status: upstream.status, headers: {
    "content-type": upstream.headers.get("content-type") ?? "application/pdf",
    "content-disposition": upstream.headers.get("content-disposition") ?? "attachment; filename=\"rental-contract-draft.pdf\"",
    "cache-control": upstream.headers.get("cache-control") ?? "private, no-store",
    ...(upstream.headers.get("content-length") ? { "content-length": upstream.headers.get("content-length")! } : {}),
  }});
}

/**
 * Pipe an SSE response through untouched (PRO-10/17). The gates still run
 * upstream, and a rejected request comes back as ordinary JSON — so pass the
 * upstream status and content-type through rather than assuming a 200 stream.
 */
async function forwardStream(request: NextRequest, path: string[]) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const target = `/${path.join("/")}${request.nextUrl.search}`;
  const body = await request.json().catch(() => undefined);

  const upstream = await backendStream(target, { method: "POST", accessToken, body });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

async function forward(request: NextRequest, path: string[], hasBody: boolean) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const search = request.nextUrl.search;
  const target = `/${path.join("/")}${search}`;

  let body: unknown;
  if (hasBody) {
    body = request.headers.get("content-type")?.startsWith("multipart/form-data")
      ? await request.formData()
      : await request.json().catch(() => undefined);
  }

  try {
    const data = await backendFetch<unknown>(target, {
      method: request.method,
      accessToken,
      body,
    });
    return NextResponse.json(data ?? { ok: true });
  } catch (error) {
    if (error instanceof BackendApiError) {
      // Forward the full domain error body (e.g. quota-exhausted 403 with its
      // payment trigger payload), falling back to a minimal shape.
      const payload =
        error.body && typeof error.body === "object"
          ? error.body
          : { statusCode: error.statusCode, message: error.message };
      return NextResponse.json(payload, { status: error.statusCode });
    }
    throw error;
  }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (isPdfPath(path)) return forwardPdf(request, path);
  return forward(request, path, false);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (isStreamPath(path)) return forwardStream(request, path);
  return forward(request, path, true);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(request, path, true);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(request, path, false);
}
