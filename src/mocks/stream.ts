import type { ChatRequest } from "@/src/lib/api/contracts/support";
import { findUserByToken, nextId, quotaFor } from "./db";
import { legalAnswer, optimizedDescription, tokenize } from "./ai";
import type { MockResponse } from "./router";

/**
 * Streaming half of the mock backend (PRO-10 / PRO-17).
 *
 * Kept out of router.ts because `dispatch` is synchronous and returns a whole
 * body — streaming needs a generator. Same auth/gate semantics, different
 * transport.
 *
 * **Gates are evaluated before the first token.** A quota-exhausted optimizer
 * must fail as a normal JSON 403 so the paywall opens; once an SSE stream has
 * started, the status is already 200 and the client can no longer react to it.
 */

export type StreamChunk =
  { type: "token"; value: string } | { type: "done"; id: string; declined?: boolean };

export interface StreamRoute {
  /** Set when a gate rejected the request — send this as JSON instead. */
  error?: MockResponse;
  chunks?: AsyncGenerator<StreamChunk>;
}

const err = (status: number, message: string): MockResponse => ({
  status,
  body: { statusCode: status, message },
});
const codedErr = (
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): MockResponse => ({ status, body: { statusCode: status, code, message, ...extra } });

/**
 * Between-token delay — enough to look like generation. Read per call, not at
 * module load, so tests can set it to 0 without import-order games.
 */
const tokenDelayMs = () => Number(process.env.MOCK_STREAM_DELAY_MS ?? 18);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function* emit(text: string, id: string, declined?: boolean): AsyncGenerator<StreamChunk> {
  const delay = tokenDelayMs();
  for (const value of tokenize(text)) {
    if (delay > 0) await sleep(delay);
    yield { type: "token", value };
  }
  yield { type: "done", id, declined };
}

/**
 * Returns null when `path` is not a streaming route, so the caller can fall
 * through to the normal dispatcher.
 */
export function dispatchStream(
  method: string,
  path: string,
  authorization: string | null,
  body: unknown,
): StreamRoute | null {
  const seg = path.replace(/^\//, "").split("/");
  if (method !== "POST" || seg.at(-1) !== "stream") return null;

  const user = findUserByToken(authorization);

  /* ------------------------ legal chatbot (PRO-17) ----------------------- */
  if (path === "/legal-chat/stream") {
    if (!user) return { error: err(401, "غير مصرح") };
    const { message } = (body ?? {}) as ChatRequest;
    if (!message?.trim()) return { error: err(400, "الرسالة مطلوبة") };

    const { content, declined } = legalAnswer(message);
    return { chunks: emit(content, nextId("msg"), declined) };
  }

  /* --------------------- description optimizer (PRO-10) ------------------ */
  if (seg[0] === "landlord" && seg[1] === "properties" && seg[3] === "optimize-description") {
    if (!user) return { error: err(401, "غير مصرح") };
    if (user.role !== "landlord") return { error: err(403, "غير مسموح") };

    const { description } = (body ?? {}) as { description?: string };
    if (!description?.trim()) return { error: err(400, "الوصف مطلوب") };
    if (description.length > 2000) return { error: err(400, "الوصف أطول من المسموح") };

    const quota = quotaFor(user.id);
    if (!quota || quota.optimizerUsesLeft <= 0) {
      return {
        error: codedErr(403, "QUOTA_EXHAUSTED", "انتهت محاولاتك المجانية", {
          trigger: "payment",
          paymentType: "AI_ADDON",
          priceEgp: 199,
        }),
      };
    }

    // Spent up-front, matching the buffered endpoint. A user who disconnects
    // mid-stream still consumed the generation.
    quota.optimizerUsesLeft -= 1;
    return { chunks: emit(optimizedDescription(description), nextId("opt")) };
  }

  return null;
}

/** Serialise a chunk as an SSE frame. */
export const toSseFrame = (chunk: StreamChunk): string => `data: ${JSON.stringify(chunk)}\n\n`;
