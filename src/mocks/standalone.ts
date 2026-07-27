import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dispatch } from "./router";
import { attachMockSocket } from "./socket";
import { dispatchStream, toSseFrame, type StreamRoute } from "./stream";

/**
 * Real HTTP server standing in for the NestJS backend, served on the same
 * origin as NESTJS_API_URL. Unlike MSW fetch-interception (which proved
 * unreliable for nested RSC → route-handler → backend calls inside Next.js),
 * a real server is reachable identically from every context. Started from
 * instrumentation.ts when API_MOCKING=enabled.
 *
 * Also hosts the PRO-06 Socket.io gateway on the same port — see ./socket.
 */

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      const raw = Buffer.concat(chunks);
      if (raw.length === 0) return resolve(undefined);
      try {
        if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
          const response = new Response(raw, {
            headers: { "content-type": req.headers["content-type"] },
          });
          resolve(await response.formData());
        } else {
          resolve(JSON.parse(raw.toString("utf-8")));
        }
      } catch {
        resolve(undefined);
      }
    });
    req.on("error", () => resolve(undefined));
  });
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  // The real NestJS backend serves under the `/api` global prefix; the mock's
  // router uses bare paths (`/auth/login`). Strip a leading `/api` so ONE
  // NESTJS_API_URL (`http://localhost:3001/api`) works against both the mock
  // and the real backend — see .env.example.
  const pathname = url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
  const method = req.method ?? "GET";
  const auth = req.headers.authorization ?? null;

  // Streaming routes (PRO-10/17) come first; dispatchStream returns null for
  // everything else, so the normal dispatcher still owns the rest of the API.
  const streamed = dispatchStream(method, pathname, auth, body);
  if (streamed) return sendStream(res, streamed);

  const result = dispatch(method, pathname, url.searchParams, auth, body);
  res.writeHead(result.status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(result.body));
}

async function sendStream(res: ServerResponse, route: StreamRoute) {
  // A gate said no. Answer as ordinary JSON so the client can react (e.g. open
  // the paywall) — an SSE stream would already have committed a 200.
  if (route.error || !route.chunks) {
    const e = route.error ?? { status: 500, body: { statusCode: 500, message: "stream error" } };
    res.writeHead(e.status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(e.body));
    return;
  }

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    // Next's proxy and any intermediary must not buffer this.
    "x-accel-buffering": "no",
  });

  try {
    for await (const chunk of route.chunks) {
      // The client hung up mid-generation — stop rather than write to a dead
      // socket.
      if (res.writableEnded || res.destroyed) return;
      res.write(toSseFrame(chunk));
    }
  } catch {
    res.write(toSseFrame({ type: "done", id: "error" }));
  } finally {
    if (!res.writableEnded) res.end();
  }
}

let started = false;

export function startMockServer(port: number) {
  if (started) return;
  started = true;
  const server = createServer((req, res) => {
    handle(req, res).catch(() => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ statusCode: 500, message: "mock server error" }));
    });
  });
  server.on("error", (e: NodeJS.ErrnoException) => {
    // Another dev instance already owns the port — reuse it (identical mock),
    // don't crash the server process.
    if (e.code === "EADDRINUSE") {
      console.log(`[mock] backend port ${port} already in use — reusing existing instance`);
    } else {
      console.error("[mock] backend error", e);
    }
  });
  attachMockSocket(server);
  server.listen(port, () => {
    console.log(`[mock] backend listening on http://localhost:${port} (+ socket.io)`);
  });
}
