import { dispatch } from "../router";
import { db, resetDb, tokensFor, type MockVerification } from "../db";
import { setMockEventListener, type MockEvent } from "../events";

const user = () => db.users.find((item) => item.email === "tenant@example.com")!;
const auth = () => `Bearer ${tokensFor(user()).accessToken}`;
const call = (method: string, path: string, body?: unknown) =>
  dispatch(method, path, new URLSearchParams(), auth(), body);

function submission(nationalId?: string) {
  const formData = new FormData();
  const files = {
    nationalIdFront: new File(["front"], "front.jpg", { type: "image/jpeg" }),
    nationalIdBack: new File(["back"], "back.png", { type: "image/png" }),
    selfie: new File(["selfie"], "selfie.webp", { type: "image/webp" }),
  };
  const get = formData.get.bind(formData);
  if (nationalId !== undefined) formData.append("nationalId", nationalId);
  formData.append("nationalIdFront", "placeholder");
  formData.append("nationalIdBack", "placeholder");
  formData.append("selfie", "placeholder");
  formData.get = (name) => files[name as keyof typeof files] ?? get(name);
  return formData;
}

function setStatus(status: MockVerification["status"], nationalId = "29001011234567") {
  const row: MockVerification = {
    id: "ekyc_test",
    userId: user().id,
    nationalId,
    nationalIdFrontUrl: "private",
    nationalIdBackUrl: "private",
    selfieUrl: "private",
    status,
    reviewedBy: "usr_admin",
    rejectionReason: "Use clearer documents.",
    submittedAt: "2026-07-20T10:00:00.000Z",
    reviewedAt: "2026-07-20T11:00:00.000Z",
  };
  db.verifications.push(row);
  return row;
}

describe("verification mock contract", () => {
  let events: MockEvent[];

  beforeEach(() => {
    resetDb();
    events = [];
    setMockEventListener((event) => events.push(event));
  });

  afterEach(() => setMockEventListener(null));

  it("returns the exact safe GET response for a user without a row", () => {
    const result = call("GET", "/verification/me");
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      status: "NOT_SUBMITTED",
      rejectionReason: null,
      submittedAt: null,
      reviewedAt: null,
      canSubmit: true,
    });
    expect(Object.keys(result.body as object)).toEqual(["status", "rejectionReason", "submittedAt", "reviewedAt", "canSubmit"]);
  });

  it("submits multipart documents, emits a queue item, and returns PENDING", () => {
    const formData = submission("29001011234567");
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("nationalIdFront")).toBeInstanceOf(File);
    const result = call("POST", "/verification/submit", formData);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      status: "PENDING",
      rejectionReason: null,
      submittedAt: expect.any(String),
      reviewedAt: null,
      canSubmit: false,
    });
    expect(events.filter((event) => event.kind === "adminQueueItem")).toHaveLength(1);
  });

  it("rejects plain JSON, a missing file, and text values in document fields", () => {
    const missing = new FormData();
    missing.append("nationalIdFront", new File(["front"], "front.jpg", { type: "image/jpeg" }));
    missing.append("nationalIdBack", new File(["back"], "back.jpg", { type: "image/jpeg" }));
    expect(call("POST", "/verification/submit", missing).status).toBe(400);
    expect(call("POST", "/verification/submit", { nationalId: "29001011234567" }).status).toBe(400);

    const textFields = new FormData();
    textFields.append("nationalIdFront", "front.jpg");
    textFields.append("nationalIdBack", "back.jpg");
    textFields.append("selfie", "selfie.jpg");
    expect(call("POST", "/verification/submit", textFields).status).toBe(400);
  });

  it.each([
    ["PENDING", "طلب التحقق قيد المراجعة بالفعل."],
    ["APPROVED", "تم توثيق الهوية بالفعل."],
    ["REJECTED", "لا يمكن إعادة إرسال طلب التحقق في حالته الحالية."],
  ] as const)("returns the exact 409 conflict for %s", (status, message) => {
    setStatus(status);
    const result = call("POST", "/verification/submit", new FormData());
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ statusCode: 409, message });
  });

  it("allows RESUBMISSION_REQUIRED and preserves an omitted national ID", () => {
    const row = setStatus("RESUBMISSION_REQUIRED", "existing-national-id");
    const result = call("POST", "/verification/submit", submission());
    expect(result.status).toBe(200);
    expect(row.status).toBe("PENDING");
    expect(row.nationalId).toBe("existing-national-id");
    expect(row.rejectionReason).toBeNull();
    expect(row.reviewedBy).toBeNull();
    expect(row.reviewedAt).toBeNull();
  });

  it("keeps the legacy upload route isolated from final persistence", () => {
    const result = call("POST", "/verification/upload", { document: "selfie" });
    expect(result.status).toBe(200);
    expect(db.verifications.find((row) => row.userId === user().id)).toBeUndefined();
  });
});
