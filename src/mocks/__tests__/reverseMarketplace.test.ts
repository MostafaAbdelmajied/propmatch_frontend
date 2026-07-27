import { dispatch } from "../router";
import { db, tokensFor } from "../db";

/**
 * The reverse marketplace end to end (PRO-05 → 13 → 16), driven straight
 * through the mock backend's dispatcher.
 *
 * The load-bearing assertion is the PII gate: owner phone / manual address are
 * **omitted from the payload** until this tenant has an ACCEPTED offer, so a
 * client that renders whatever it's given still cannot leak them.
 */

const auth = (email: string) => {
  const user = db.users.find((u) => u.email === email)!;
  return `Bearer ${tokensFor(user).accessToken}`;
};

const call = (method: string, path: string, token: string | null, body?: unknown, query = "") =>
  dispatch(method, path, new URLSearchParams(query), token, body);

const tenant2 = () => auth("tenant2@example.com"); // verified, owns approved req_1
const landlord = () => auth("landlord@example.com"); // verified, owns prop_1/2/5
const admin = () => auth("admin@example.com");

describe("PII gate", () => {
  it("omits the owner's phone and address from a property a tenant has no connection to", () => {
    const res = call("GET", "/properties/prop_1", tenant2());

    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.contactRevealed).toBe(false);
    expect(body.ownerPhoneNumber).toBeNull();
    expect(body.ownerName).toBeNull();
    expect(body.manualAddress).toBeNull();
    // The general area is fine pre-connection — it's the exact address that isn't.
    expect(body.district).toEqual(expect.any(String));
  });

  it("hides the landlord's identity in the tenant's inbox until they accept", () => {
    const res = call("GET", "/tenant/offers", tenant2());
    const { items } = res.body as { items: { status: string; ownerPhoneNumber: string | null }[] };

    for (const offer of items.filter((o) => o.status !== "ACCEPTED")) {
      expect(offer.ownerPhoneNumber).toBeNull();
    }
  });

  it("never exposes the tenant's identity to a landlord browsing requests", () => {
    const res = call("GET", "/landlord/requests", landlord());
    const { items } = res.body as { items: Record<string, unknown>[] };

    expect(items.length).toBeGreaterThan(0);
    for (const request of items) {
      expect(request).not.toHaveProperty("tenantId");
      expect(request).not.toHaveProperty("tenantName");
      expect(request).not.toHaveProperty("phoneNumber");
    }
  });
});

describe("gates on posting a tenant request", () => {
  it("rejects an unverified tenant with VERIFICATION_REQUIRED", () => {
    // tenant@example.com has no eKYC row at all → NOT_SUBMITTED.
    const res = call("POST", "/tenant/requests", auth("tenant@example.com"), validRequest());

    expect(res.status).toBe(403);
    expect((res.body as { code: string }).code).toBe("VERIFICATION_REQUIRED");
  });

  it("rejects a landlord posting a tenant request", () => {
    const res = call("POST", "/tenant/requests", landlord(), validRequest());
    expect(res.status).toBe(403);
  });

  it("creates a verified tenant's request as PENDING, not published", () => {
    const res = call("POST", "/tenant/requests", tenant2(), validRequest());

    expect(res.status).toBe(200);
    expect((res.body as { status: string }).status).toBe("PENDING");

    // Unapproved requests must not reach landlords.
    const browsable = call("GET", "/landlord/requests", landlord()).body as {
      items: { id: string }[];
    };
    const id = (res.body as { id: string }).id;
    expect(browsable.items.map((r) => r.id)).not.toContain(id);
  });
});

describe("full flow: request → approval → offer → accept → reveal", () => {
  it("reveals the owner's contact only after the tenant accepts, and connects the match", () => {
    // 1. Tenant posts a request; admin approves it (anti-spam, SRS 3.2.2).
    const created = call("POST", "/tenant/requests", tenant2(), validRequest()).body as {
      id: string;
    };
    const approved = call("POST", `/admin/requests/${created.id}/review`, admin(), {
      decision: "approve",
    });
    expect(approved.status).toBe(200);

    // 2. The landlord now sees it, scored against their own properties.
    const browsable = call("GET", "/landlord/requests", landlord()).body as {
      items: { id: string; matchScore: number | null; alreadyOffered: boolean }[];
    };
    const target = browsable.items.find((r) => r.id === created.id);
    expect(target).toBeDefined();
    expect(target!.matchScore).toBeGreaterThan(0);
    expect(target!.alreadyOffered).toBe(false);

    // 3. The landlord pitches one of their approved properties.
    const offer = call("POST", "/landlord/offers", landlord(), {
      tenantRequestId: created.id,
      propertyId: "prop_1",
      pitchMessage: "عقاري قريب من جامعة المنصورة ويناسب طلبك تمامًا",
      proposedPrice: 4200,
    });
    expect(offer.status).toBe(200);
    const offerId = (offer.body as { id: string }).id;

    // Pre-acceptance the tenant still gets nothing.
    const before = call("GET", "/properties/prop_1", tenant2()).body as Record<string, unknown>;
    expect(before.ownerPhoneNumber).toBeNull();

    // 4. The tenant accepts → contact revealed + MATCH_CONNECTION CONNECTED.
    const accept = call("POST", `/tenant/offers/${offerId}/accept`, tenant2());
    expect(accept.status).toBe(200);
    const revealed = accept.body as {
      ownerPhoneNumber: string;
      ownerName: string;
      manualAddress: string;
    };
    expect(revealed.ownerPhoneNumber).toBe("01055556666");
    expect(revealed.ownerName).toBe("محمد السيد");
    expect(revealed.manualAddress).toEqual(expect.any(String));

    // 5. The gate now passes for this tenant on this property.
    const after = call("GET", "/properties/prop_1", tenant2()).body as Record<string, unknown>;
    expect(after.contactRevealed).toBe(true);
    expect(after.ownerPhoneNumber).toBe("01055556666");

    const connection = call("GET", "/properties/prop_1/connection", tenant2()).body as {
      status: string;
    };
    expect(connection.status).toBe("CONNECTED");

    // ...and accepting fulfils the request so it stops drawing offers.
    const mine = call("GET", "/tenant/requests", tenant2()).body as {
      items: { id: string; status: string }[];
    };
    expect(mine.items.find((r) => r.id === created.id)!.status).toBe("FULFILLED");

    // 6. Crucially, the reveal is per-connection — an unrelated tenant sees nothing.
    const other = call("GET", "/properties/prop_1", auth("tenant@example.com")).body as Record<
      string,
      unknown
    >;
    expect(other.contactRevealed).toBe(false);
    expect(other.ownerPhoneNumber).toBeNull();
  });

  it("spends a free offer per send and paywalls once the quota is gone", () => {
    const quota = db.quotas.find((q) => q.userId === "usr_landlord")!;
    quota.freeOffersLeft = 1;

    const first = makeApprovedRequest();
    const sent = call("POST", "/landlord/offers", landlord(), offerFor(first));
    expect(sent.status).toBe(200);
    expect((sent.body as { freeOffersLeft: number }).freeOffersLeft).toBe(0);

    const second = makeApprovedRequest();
    const paywalled = call("POST", "/landlord/offers", landlord(), offerFor(second));
    expect(paywalled.status).toBe(403);
    expect(paywalled.body).toMatchObject({
      code: "QUOTA_EXHAUSTED",
      paymentType: "PREMIUM_OWNER",
      trigger: "payment",
    });
  });
});

describe("partner leads (PRO-16)", () => {
  it("creates one lead per opted-in service and nothing more", () => {
    const res = call("POST", "/partner-leads", tenant2(), { serviceTypes: ["MOVING"] });

    expect(res.status).toBe(200);
    const { items } = res.body as { items: { serviceType: string; status: string }[] };
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ serviceType: "MOVING", status: "PENDING" });
  });
});

/* --------------------------------- helpers -------------------------------- */

function validRequest() {
  return {
    minBudget: 3000,
    maxBudget: 5000,
    preferredLocations: "حي الجامعة",
    propertyType: "APARTMENT" as const,
    requiredBedrooms: 2,
    needsFurnished: true,
    flexibilityScore: 6,
    lifestyleRequirements: "أبحث عن شقة هادئة قريبة من جامعة المنصورة والمواصلات",
  };
}

/** A fresh APPROVED request the landlord hasn't offered on yet. */
function makeApprovedRequest(): string {
  const created = call("POST", "/tenant/requests", tenant2(), validRequest()).body as {
    id: string;
  };
  call("POST", `/admin/requests/${created.id}/review`, admin(), { decision: "approve" });
  return created.id;
}

function offerFor(tenantRequestId: string) {
  return {
    tenantRequestId,
    propertyId: "prop_1",
    pitchMessage: "عقاري يناسب طلبك تمامًا ويقع في موقع متميز",
    proposedPrice: 4500,
  };
}
