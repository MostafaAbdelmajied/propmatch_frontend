import { dispatchStream, toSseFrame, type StreamChunk } from "../stream";
import { legalAnswer, optimizedDescription, tokenize } from "../ai";
import { db, resetDb, tokensFor } from "../db";

/**
 * Streaming AI transport (PRO-10 optimizer, PRO-17 legal chatbot).
 *
 * The load-bearing rule: a gate must reject *before* the first token. Once an
 * SSE stream opens the status is already 200, and the client can no longer
 * open the paywall or bounce the user to eKYC.
 */

process.env.MOCK_STREAM_DELAY_MS = "0";

beforeEach(() => resetDb());

const auth = (email: string) => {
  const user = db.users.find((u) => u.email === email)!;
  return `Bearer ${tokensFor(user).accessToken}`;
};

const landlord = () => auth("landlord@example.com");
const tenant = () => auth("tenant@example.com");

async function collect(chunks: AsyncGenerator<StreamChunk>) {
  const tokens: string[] = [];
  let done: Extract<StreamChunk, { type: "done" }> | null = null;
  for await (const c of chunks) {
    if (c.type === "token") tokens.push(c.value);
    else done = c;
  }
  return { text: tokens.join(""), count: tokens.length, done };
}

describe("route matching", () => {
  it("ignores non-stream paths so the normal dispatcher keeps them", () => {
    expect(dispatchStream("POST", "/legal-chat", null, {})).toBeNull();
    expect(dispatchStream("GET", "/properties", null, undefined)).toBeNull();
  });

  it("ignores a GET to a stream path", () => {
    expect(dispatchStream("GET", "/legal-chat/stream", landlord(), {})).toBeNull();
  });
});

describe("legal chatbot stream (PRO-17)", () => {
  it("streams an on-topic answer in pieces that rebuild it exactly", async () => {
    const route = dispatchStream("POST", "/legal-chat/stream", tenant(), {
      message: "ما هي مدة الإخطار قبل إنهاء العقد؟",
    })!;
    expect(route.error).toBeUndefined();

    const { text, count, done } = await collect(route.chunks!);
    // Concatenation must reproduce the answer — no dropped or doubled spaces.
    expect(text).toBe(legalAnswer("عقد").content);
    expect(count).toBeGreaterThan(1);
    expect(done).toMatchObject({ type: "done", declined: false });
  });

  it("streams the off-topic decline and flags it on the terminal chunk", async () => {
    const route = dispatchStream("POST", "/legal-chat/stream", tenant(), {
      message: "ما هو أفضل مطعم؟",
    })!;
    const { text, done } = await collect(route.chunks!);

    expect(text).toContain("أقدر أساعدك فقط");
    expect(done).toMatchObject({ declined: true });
  });

  it("rejects an unauthenticated caller as JSON, not a stream", () => {
    const route = dispatchStream("POST", "/legal-chat/stream", null, { message: "عقد" })!;
    expect(route.chunks).toBeUndefined();
    expect(route.error?.status).toBe(401);
  });

  it("rejects an empty message", () => {
    expect(
      dispatchStream("POST", "/legal-chat/stream", tenant(), { message: "  " })!.error?.status,
    ).toBe(400);
  });
});

describe("description optimizer stream (PRO-10)", () => {
  const path = "/landlord/properties/draft/optimize-description/stream";

  it("streams the optimized text and spends one generation", async () => {
    const quota = db.quotas.find((q) => q.userId === "usr_landlord")!;
    quota.optimizerUsesLeft = 1;
    const before = quota.optimizerUsesLeft;

    const route = dispatchStream("POST", path, landlord(), { description: "شقة واسعة" })!;
    const { text } = await collect(route.chunks!);

    expect(text).toBe(optimizedDescription("شقة واسعة"));
    expect(db.quotas.find((q) => q.userId === "usr_landlord")!.optimizerUsesLeft).toBe(before - 1);
  });

  it("paywalls BEFORE streaming once the quota is gone", async () => {
    const quota = db.quotas.find((q) => q.userId === "usr_landlord")!;
    quota.optimizerUsesLeft = 0;

    const route = dispatchStream("POST", path, landlord(), { description: "شقة واسعة" })!;
    // Must be a JSON error: an opened stream is already a 200 and the client
    // could no longer show the paywall.
    expect(route.chunks).toBeUndefined();
    expect(route.error?.status).toBe(403);
    expect(route.error?.body).toMatchObject({
      code: "QUOTA_EXHAUSTED",
      paymentType: "AI_ADDON",
      trigger: "payment",
    });
  });

  it("does not spend a generation when the gate rejects", () => {
    const quota = db.quotas.find((q) => q.userId === "usr_landlord")!;
    quota.optimizerUsesLeft = 0;
    dispatchStream("POST", path, landlord(), { description: "شقة واسعة" });
    expect(quota.optimizerUsesLeft).toBe(0);
  });

  it("refuses a non-landlord", () => {
    expect(dispatchStream("POST", path, tenant(), { description: "شقة" })!.error?.status).toBe(403);
  });

  it("refuses an over-long description without spending quota", () => {
    const quota = db.quotas.find((q) => q.userId === "usr_landlord")!;
    const before = quota.optimizerUsesLeft;
    const route = dispatchStream("POST", path, landlord(), { description: "ش".repeat(2001) })!;

    expect(route.error?.status).toBe(400);
    expect(quota.optimizerUsesLeft).toBe(before);
  });
});

describe("SSE framing", () => {
  it("emits one parseable frame per chunk", () => {
    const frame = toSseFrame({ type: "token", value: "شقة " });
    expect(frame).toBe('data: {"type":"token","value":"شقة "}\n\n');
    // The client splits on a blank line, so each frame must end with exactly one.
    expect(frame.endsWith("\n\n")).toBe(true);
  });

  it("survives a round trip through JSON — Arabic and whitespace intact", () => {
    const chunk: StreamChunk = { type: "token", value: "المنصورة\n" };
    const parsed = JSON.parse(toSseFrame(chunk).slice(5).trim()) as StreamChunk;
    expect(parsed).toEqual(chunk);
  });
});

describe("tokenize", () => {
  it("rebuilds the source exactly", () => {
    const src = "وحدة بموقع استراتيجي\n\nوتشطيبات عالية.";
    expect([...tokenize(src)].join("")).toBe(src);
  });

  it("yields more than one chunk for a real answer", () => {
    expect([...tokenize(legalAnswer("عقد").content)].length).toBeGreaterThan(10);
  });
});
