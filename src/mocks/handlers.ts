import { http, HttpResponse } from "msw";
import { dispatch } from "./router";

/**
 * For Jest only: a single catch-all MSW handler that delegates to the shared
 * mock router (src/mocks/router). At dev/prod runtime the same router is
 * served over real HTTP by src/mocks/standalone instead — so behaviour is
 * identical in tests and in the running app, with one source of truth.
 */
async function resolve({ request }: { request: Request }) {
  const url = new URL(request.url);
  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : request.headers.get("content-type")?.startsWith("multipart/form-data")
      ? await request.formData()
      : await request.json().catch(() => undefined);
  const result = dispatch(
    request.method,
    url.pathname,
    url.searchParams,
    request.headers.get("authorization"),
    body,
  );
  return HttpResponse.json(result.body as object, { status: result.status });
}

export const handlers = [
  http.get("*", resolve),
  http.post("*", resolve),
  http.patch("*", resolve),
  http.delete("*", resolve),
];
