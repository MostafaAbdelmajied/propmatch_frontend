"use client";

import { reconnectSocket } from "@/src/lib/socket/useRealtime";

/**
 * Browser-side fetch wrapper. Talks only to our own Next.js Route Handlers
 * (same origin), which attach the httpOnly token and proxy to the backend.
 * Never targets the NestJS origin directly, so no tokens are ever exposed to
 * client JS.
 */

export interface ApiClientError extends Error {
  statusCode: number;
  body: unknown;
}

function makeError(statusCode: number, message: string, body: unknown): ApiClientError {
  const err = new Error(message) as ApiClientError;
  err.name = "ApiClientError";
  err.statusCode = statusCode;
  err.body = body;
  return err;
}

const REFRESH_PATH = "/api/auth/refresh";
const AUTH_MUTATION_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  REFRESH_PATH,
  // Public, credential-based (email+password in the body) — called by a user
  // with no valid session (their token was revoked the moment the account
  // was soft-deleted). A 401 here is never fixable by refreshing; doing so
  // anyway would spend a request retrying with the same dead/absent
  // session before failing the exact same way.
  "/api/backend/auth/request-reactivation",
]);

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(REFRESH_PATH, {
      method: "POST",
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) return false;
        reconnectSocket();
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function executeRequest(method: string, path: string, body?: unknown): Promise<Response> {
  const isFormData = body instanceof FormData;

  return fetch(path, {
    method,
    headers: {
      "Accept-Language": "ar",
      ...(body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
    },
    // FormData deliberately has no manually supplied Content-Type: fetch adds
    // the multipart boundary required by the backend.
    body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res = await executeRequest(method, path, body);

  if (res.status === 401 && !AUTH_MUTATION_PATHS.has(path) && (await refreshSession())) {
    res = await executeRequest(method, path, body);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? Array.isArray((data as { message: unknown }).message)
          ? ((data as { message: string[] }).message.join(", "))
          : String((data as { message: unknown }).message)
        : "حدث خطأ غير متوقع";
    throw makeError(res.status, message, data);
  }

  return data as T;
}

/** Endpoints proxied through /api/backend/* to the NestJS backend. */
export const api = {
  get: <T>(path: string) => request<T>("GET", `/api/backend/${path}`),
  post: <T>(path: string, body?: unknown) => request<T>("POST", `/api/backend/${path}`, body),
  postForm: <T>(path: string, body: FormData) => request<T>("POST", `/api/backend/${path}`, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", `/api/backend/${path}`, body),
  delete: <T>(path: string) => request<T>("DELETE", `/api/backend/${path}`),
};

export async function downloadProtectedPdf(path: string): Promise<{ blob: Blob; filename: string }> {
  const target = `/api/backend/${path}`;
  const download = () => fetch(target, { cache: "no-store" });
  let res = await download();
  if (res.status === 401 && (await refreshSession())) res = await download();
  if (!res.ok) throw makeError(res.status, "تعذر تجهيز ملف PDF حاليًا.", await res.json().catch(() => null));
  if (!res.headers.get("content-type")?.includes("application/pdf")) throw makeError(502, "تعذر تجهيز ملف PDF حاليًا.", null);
  const raw = res.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/i)?.[1] ?? "rental-contract-draft.pdf";
  return { blob: await res.blob(), filename: raw.replace(/[^a-zA-Z0-9._-]/g, "_") || "rental-contract-draft.pdf" };
}

/** Auth endpoints live at /api/auth/* (they mint/clear cookies). */
export const authApi = {
  login: <T>(body: unknown) => request<T>("POST", "/api/auth/login", body),
  register: <T>(body: unknown) => request<T>("POST", "/api/auth/register", body),
  logout: () => request<{ success: boolean }>("POST", "/api/auth/logout", {}),
  me: <T>() => request<T>("GET", "/api/auth/me"),
  refresh: <T>() => request<T>("POST", REFRESH_PATH),
};

export function isApiClientError(e: unknown): e is ApiClientError {
  return e instanceof Error && e.name === "ApiClientError";
}

/* --------------------------- streaming (PRO-10/17) ------------------------ */

export type StreamChunk =
  | { type: "token"; value: string }
  | { type: "done"; id: string; declined?: boolean; escalated?: boolean; suggestedGuide?: string[] };


export interface StreamHandlers {
  onToken: (value: string) => void;
  signal?: AbortSignal;
}

/**
 * POST that consumes an SSE response token by token.
 *
 * A gate rejection (401/403 — e.g. QUOTA_EXHAUSTED) arrives as ordinary JSON
 * *before* any stream starts, and is thrown as a normal `ApiClientError` so
 * callers handle it exactly as they would a buffered call.
 *
 * Resolves with the terminal `done` chunk once generation completes.
 */
export async function streamPost(
  path: string,
  body: unknown,
  { onToken, signal }: StreamHandlers,
): Promise<Extract<StreamChunk, { type: "done" }>> {
  const stream = () =>
    fetch(`/api/backend/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream", "Accept-Language": "ar" },
      body: JSON.stringify(body),
      signal,
    });

  let res = await stream();
  if (res.status === 401 && !signal?.aborted && (await refreshSession())) res = await stream();

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : "حدث خطأ غير متوقع";
    throw makeError(res.status, message, data);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let done: Extract<StreamChunk, { type: "done" }> | null = null;

  try {
    for (;;) {
      const { value, done: finished } = await reader.read();
      if (finished) break;
      buffer += value;

      // SSE frames are separated by a blank line. A chunk can split a frame in
      // half, so only consume complete frames and keep the remainder buffered.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const line = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        let chunk: StreamChunk;
        try {
          chunk = JSON.parse(line.slice(5).trim()) as StreamChunk;
        } catch {
          continue;
        }
        if (chunk.type === "token") onToken(chunk.value);
        else done = chunk;
      }
    }
  } finally {
    reader.releaseLock();
  }

  return done ?? { type: "done", id: "unknown" };
}
