import { ApiErrorSchema } from "./contracts/common";

/**
 * Server-only fetch wrapper for calling the NestJS backend. Used exclusively
 * from Route Handlers (app/api/**) and Server Components/Actions — never
 * imported into client components, since it targets the backend origin
 * directly and callers here are trusted to attach auth headers themselves.
 *
 * In development, requests are intercepted by MSW (see src/mocks) unless
 * NESTJS_API_URL points at a real running backend — see .env.example.
 */

export class BackendApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    /**
     * Full parsed error body. Preserved so callers (e.g. the BFF proxy) can
     * forward domain-specific error payloads like the quota-exhausted 403
     * that carries { trigger, product, priceEgp } — see SRS FR2.5.
     */
    public body?: unknown,
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}

function getBackendUrl(): string {
  const url = process.env.NESTJS_API_URL;

  if (!url) {
    throw new Error(
      "NESTJS_API_URL is not set. Copy .env.example to .env.local, or enable API_MOCKING for local dev.",
    );
  }
  return url;
}

interface BackendFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  accessToken?: string;
}

/**
 * Like `backendFetch`, but hands back the raw `Response` so the caller can
 * pass a body stream straight through (PRO-10/17 SSE). Buffering it here —
 * which `backendFetch` does via `.json()` — would defeat the point: the client
 * would wait for the whole answer and then paint it at once.
 */
export async function backendStream(
  path: string,
  options: BackendFetchOptions = {},
): Promise<Response> {
  const { body, accessToken, headers, ...rest } = options;
  return fetch(`${getBackendUrl()}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
}

/** Raw backend response for protected binary downloads (never JSON-parse it). */
export async function backendRaw(
  path: string,
  options: BackendFetchOptions = {},
): Promise<Response> {
  const { body, accessToken, headers, ...rest } = options;
  return fetch(`${getBackendUrl()}${path}`, {
    ...rest,
    headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
}

export async function backendFetch<T>(path: string, options: BackendFetchOptions = {}): Promise<T> {
  const { body, accessToken, headers, ...rest } = options;

  const response = await fetch(`${getBackendUrl()}${path}`, {
    ...rest,
    headers: {
      ...(body !== undefined && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const rawBody = await response.json().catch(() => null);
    const parsed = ApiErrorSchema.safeParse(rawBody);
    const message = parsed.success
      ? Array.isArray(parsed.data.message)
        ? parsed.data.message.join(", ")
        : parsed.data.message
      : response.statusText;
    throw new BackendApiError(response.status, message, rawBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
