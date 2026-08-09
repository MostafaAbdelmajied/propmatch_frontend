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

function input(nationalId = "29001011234567") {
  return {
    nationalId,
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

  it("submits all required multipart fields including nationalId", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));
    await submitVerification(input());

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const form = options.body as FormData;
    expect([...form.keys()]).toEqual(["nationalId", "nationalIdFront", "nationalIdBack", "selfie"]);
    expect(form.get("nationalId")).toBe("29001011234567");
    expect(options.headers).toEqual({ "Accept-Language": "ar" });
  });

  it("includes nationalId and preserves a backend 409", async () => {
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
      headers: { "Accept-Language": "ar", "Content-Type": "application/json" },
      body: JSON.stringify({ example: true }),
    });
  });

  it("forwards no body, JSON, and FormData through the server client with correct headers", async () => {
    const previousUrl = process.env.NESTJS_API_URL;
    const previousProduction = process.env.PRODCUTION;
    const previousProductionUrl = process.env.NESTJS_API_URL_PROUDCTION;
    process.env.PRODCUTION = "false";
    process.env.NESTJS_API_URL = "https://backend.example.test";
    fetchMock.mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));

    await backendFetch("/verification/me", { method: "GET", accessToken: "token" });
    expect(fetchMock).toHaveBeenLastCalledWith("https://backend.example.test/verification/me", expect.objectContaining({
      headers: { "Accept-Language": "ar", Authorization: "Bearer token" },
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
    expect(options.headers).toEqual({ "Accept-Language": "ar", Authorization: "Bearer token" });

    if (previousUrl === undefined) delete process.env.NESTJS_API_URL;
    else process.env.NESTJS_API_URL = previousUrl;
    if (previousProduction === undefined) delete process.env.PRODCUTION;
    else process.env.PRODCUTION = previousProduction;
    if (previousProductionUrl === undefined) delete process.env.NESTJS_API_URL_PROUDCTION;
    else process.env.NESTJS_API_URL_PROUDCTION = previousProductionUrl;
  });
});
