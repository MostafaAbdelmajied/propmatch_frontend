import { api } from "../../browserClient";
import { backendFetch } from "../../client";
import { getMyVerification, submitVerification } from "../../verification";
import { VerificationResponseSchema } from "../verification";

const response = {
  status: "PENDING",
  rejectionReason: null,
  submittedAt: "2026-07-20T12:00:00.000Z",
  reviewedAt: null,
  canSubmit: false,
} as const;

function input(nationalId?: string) {
  return {
    ...(nationalId === undefined ? {} : { nationalId }),
    nationalIdFront: new File(["front"], "front.jpg", { type: "image/jpeg" }),
    nationalIdBack: new File(["back"], "back.png", { type: "image/png" }),
    selfie: new File(["selfie"], "selfie.webp", { type: "image/webp" }),
  };
}

describe("verification API contract", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it("accepts the exact five-status safe response", async () => {
    for (const status of ["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED", "RESUBMISSION_REQUIRED"]) {
      expect(VerificationResponseSchema.safeParse({ ...response, status }).success).toBe(true);
    }
    expect(VerificationResponseSchema.shape).not.toHaveProperty("nationalId");
    expect(VerificationResponseSchema.shape).not.toHaveProperty("nationalIdLast4");
    expect(VerificationResponseSchema.shape).not.toHaveProperty("uploadedDocuments");

    fetchMock.mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));
    await expect(getMyVerification()).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith("/api/backend/verification/me", expect.objectContaining({ method: "GET" }));
  });

  it("submits exactly the required multipart fields without nationalId when omitted", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));
    await submitVerification(input());

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const form = options.body as FormData;
    expect([...form.keys()]).toEqual(["nationalIdFront", "nationalIdBack", "selfie"]);
    expect(options.headers).toBeUndefined();
  });

  it("includes nationalId only when provided and preserves a backend 409", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(response), { status: 200 }));
    await submitVerification(input("29001011234567"));
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect([...(options.body as FormData).keys()]).toEqual(["nationalId", "nationalIdFront", "nationalIdBack", "selfie"]);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ statusCode: 409, message: "Verification request is already pending." }), { status: 409 }),
    );
    await expect(submitVerification(input())).rejects.toMatchObject({
      name: "ApiClientError",
      statusCode: 409,
      message: "Verification request is already pending.",
    });

  });

  it("keeps browser JSON requests JSON encoded", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await api.post("verification/example", { example: true });

    expect(fetchMock).toHaveBeenCalledWith("/api/backend/verification/example", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ example: true }),
    });
  });

  it("forwards no body, JSON, and FormData through the server client with correct headers", async () => {
    const previousUrl = process.env.NESTJS_API_URL;
    process.env.NESTJS_API_URL = "https://backend.example.test";
    fetchMock.mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));

    await backendFetch("/verification/me", { method: "GET", accessToken: "token" });
    expect(fetchMock).toHaveBeenLastCalledWith("https://backend.example.test/verification/me", expect.objectContaining({
      headers: { Authorization: "Bearer token" },
      body: undefined,
    }));

    fetchMock.mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));

    await backendFetch("/verification/me", { method: "POST", accessToken: "token", body: { example: true } });
    expect(fetchMock).toHaveBeenLastCalledWith("https://backend.example.test/verification/me", expect.objectContaining({
      headers: expect.objectContaining({ "Content-Type": "application/json", Authorization: "Bearer token" }),
      body: JSON.stringify({ example: true }),
    }));

    const formData = new FormData();
    formData.append("selfie", new File(["selfie"], "selfie.jpg", { type: "image/jpeg" }));
    fetchMock.mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));
    await backendFetch("/verification/submit", { method: "POST", accessToken: "token", body: formData });
    const [, options] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    expect(options.body).toBe(formData);
    expect(options.headers).toEqual({ Authorization: "Bearer token" });

    process.env.NESTJS_API_URL = previousUrl;
  });
});
