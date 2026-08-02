import { dispatch } from "../router";
import { db, resetDb, tokensFor } from "../db";
import { emitMockEvent, setMockEventListener, type MockEvent } from "../events";

/**
 * PRO-06 emit plumbing. The Socket.io wiring itself lives in ./socket (it
 * needs a real server); what's pinned here is the part the app logic owns:
 * *what* gets emitted, *to whom*, and that nothing emits when no gateway is
 * listening (Jest imports db/router with no socket server anywhere).
 */

let events: MockEvent[] = [];

beforeEach(() => {
  resetDb();
  events = [];
  setMockEventListener((e) => events.push(e));
});

afterEach(() => setMockEventListener(null));

const auth = (email: string) => {
  const user = db.users.find((u) => u.email === email)!;
  return `Bearer ${tokensFor(user).accessToken}`;
};
const call = (method: string, path: string, token: string | null, body?: unknown) =>
  dispatch(method, path, new URLSearchParams(), token, body);

const admin = () => auth("admin@example.com");
const tenant2 = () => auth("tenant2@example.com");

const notifications = () => events.filter((e) => e.kind === "notification");
const queueItems = () => events.filter((e) => e.kind === "adminQueueItem");

const verificationSubmission = () => {
  const formData = new FormData();
  const files = {
    nationalIdFront: new File(["front"], "front.jpg", { type: "image/jpeg" }),
    nationalIdBack: new File(["back"], "back.jpg", { type: "image/jpeg" }),
    selfie: new File(["selfie"], "selfie.jpg", { type: "image/jpeg" }),
  };
  const get = formData.get.bind(formData);
  formData.append("nationalId", "29001011234567");
  formData.append("nationalIdFront", "placeholder");
  formData.append("nationalIdBack", "placeholder");
  formData.append("selfie", "placeholder");
  formData.get = (name) => files[name as keyof typeof files] ?? get(name);
  return formData;
};

describe("emitting with no listener registered", () => {
  it("is a no-op — the mock must work under Jest with no gateway", () => {
    setMockEventListener(null);
    expect(() => emitMockEvent({ kind: "adminQueueItem", payload: { id: "x", type: "kyc", subjectId: "y", title: "t", subtitle: "s", submittedAt: "now" } })).not.toThrow();
  });
});

describe("notification events", () => {
  it("routes a notification to its recipient, not broadcast", () => {
    // Approving a property notifies its owner (usr_landlord) and nobody else.
    call("POST", "/admin/properties/prop_5/review", admin(), { decision: "approve" });

    expect(notifications()).toHaveLength(1);
    expect(notifications()[0]).toMatchObject({ kind: "notification", userId: "usr_landlord" });
  });

  it("omits userId from the payload — it routes, it isn't client data", () => {
    call("POST", "/admin/properties/prop_5/review", admin(), { decision: "approve" });

    const { payload } = notifications()[0] as Extract<MockEvent, { kind: "notification" }>;
    expect(payload).not.toHaveProperty("userId");
    expect(payload).toMatchObject({ type: "PROPERTY_APPROVED", isRead: false });
    expect(payload.id).toEqual(expect.any(String));
  });

  it("emits the same row that GET /notifications will return", () => {
    call("POST", "/admin/properties/prop_5/review", admin(), { decision: "approve" });
    const { payload } = notifications()[0] as Extract<MockEvent, { kind: "notification" }>;

    const fetched = (call("GET", "/notifications", auth("landlord@example.com")).body as {
      items: { id: string }[];
    }).items[0];
    // Delivery must not diverge from storage, or the bell shows two shapes.
    expect(fetched).toMatchObject({ ...payload });
  });

  it("fans a new approved request out to each verified landlord separately", () => {
    const req = call("POST", "/tenant/requests", tenant2(), {
      minBudget: 3000, maxBudget: 5000, preferredLocations: "حي الجامعة", propertyType: "APARTMENT",
      requiredBedrooms: 2, needsFurnished: true, flexibilityScore: 6,
      lifestyleRequirements: "أبحث عن شقة هادئة قريبة من الجامعة",
    }).body as { id: string };
    events = [];

    call("POST", `/admin/requests/${req.id}/review`, admin(), { decision: "approve" });

    // usr_landlord is verified; usr_landlord2's eKYC is still PENDING.
    const recipients = notifications().map((e) => (e as Extract<MockEvent, { kind: "notification" }>).userId);
    expect(recipients).toContain("usr_landlord");
    expect(recipients).not.toContain("usr_landlord2");
  });
});

describe("admin queue events", () => {
  it("announces a new tenant request the moment it is submitted", () => {
    const req = call("POST", "/tenant/requests", tenant2(), {
      minBudget: 3000, maxBudget: 5000, preferredLocations: "توريل", propertyType: "STUDIO",
      requiredBedrooms: 1, needsFurnished: false, flexibilityScore: 5,
      lifestyleRequirements: "ستوديو صغير قريب من وسط البلد",
    }).body as { id: string };

    expect(queueItems()).toHaveLength(1);
    expect(queueItems()[0].payload).toMatchObject({ id: `q_${req.id}`, type: "request", subjectId: req.id });
  });

  it("announces a new review", () => {
    call("POST", "/reviews", tenant2(), { propertyId: "prop_2", rating: 4, comment: "شقة جيدة وموقع ممتاز" });
    expect(queueItems()[0].payload).toMatchObject({ type: "review" });
  });

  it("announces an eKYC submission, including a resubmission after rejection", () => {
    const unverified = auth("tenant@example.com");
    const firstSubmission = call("POST", "/verification/submit", unverified, verificationSubmission());
    expect(firstSubmission.body).toMatchObject({ status: "PENDING", canSubmit: false });
    expect(queueItems()).toHaveLength(1);
    expect(queueItems()[0].payload).toMatchObject({ type: "kyc", subjectId: "usr_tenant" });

    // Prepare the separately persisted resubmission-required state.
    events = [];
    const row = db.verifications.find((item) => item.userId === "usr_tenant")!;
    row.status = "RESUBMISSION_REQUIRED";
    row.rejectionReason = "صورة غير واضحة";
    row.reviewedAt = new Date().toISOString();
    const resubmission = call("POST", "/verification/submit", unverified, verificationSubmission());
    expect(resubmission.body).toMatchObject({ status: "PENDING", canSubmit: false });
    expect(queueItems()).toHaveLength(1);
  });

  it("emits a queue item identical to the one GET /admin/queues serves", () => {
    call("POST", "/reviews", tenant2(), { propertyId: "prop_2", rating: 4, comment: "شقة جيدة وموقع ممتاز" });
    const pushed = queueItems()[0].payload;

    const { reviewQueue } = call("GET", "/admin/queues", admin()).body as { reviewQueue: unknown[] };
    // Same builder feeds both — this fails if they ever drift.
    expect(reviewQueue).toContainEqual(pushed);
  });

  it("does not announce anything for an action that creates no pending item", () => {
    call("POST", "/tenant/favorites", tenant2(), { propertyId: "prop_1" });
    expect(queueItems()).toHaveLength(0);
  });
});
