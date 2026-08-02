import { dispatch } from "../router";
import { db, resetDb, tokensFor } from "../db";

/**
 * Admin sub-roles were restored per conflicts.md B2-R, which means "is an
 * admin" is no longer sufficient authority for anything. These tests pin the
 * capability gate: a scoped admin must not reach a queue they don't own.
 *
 * The seeded admins: super-admin, kyc-reviewer, customer-support, read-only.
 */

beforeEach(() => resetDb());

const auth = (email: string) => {
  const user = db.users.find((u) => u.email === email)!;
  return `Bearer ${tokensFor(user).accessToken}`;
};

const call = (method: string, path: string, token: string | null, body?: unknown) =>
  dispatch(method, path, new URLSearchParams(), token, body);

const superAdmin = () => auth("admin@example.com");
const kycAdmin = () => auth("kyc@example.com");
const readOnly = () => auth("readonly@example.com");
const support = () => auth("support@example.com");

describe("capability gate", () => {
  it("gives the super-admin every admin capability", () => {
    const res = call("GET", "/admin/session", superAdmin());
    const body = res.body as { role: string; capabilities: string[] };

    expect(body.role).toBe("super-admin");
    expect(body.capabilities).toEqual(expect.arrayContaining(["property:approve", "kyc:review", "admin:manage"]));
  });

  it("scopes a kyc-reviewer to eKYC only", () => {
    const session = call("GET", "/admin/session", kycAdmin()).body as { capabilities: string[] };
    expect(session.capabilities).toEqual(["kyc:review"]);

    // Allowed.
    expect(call("GET", "/admin/kyc/usr_landlord2", kycAdmin()).status).toBe(200);

    // Denied — a kyc-reviewer must not clear the property queue.
    const denied = call("POST", "/admin/properties/prop_5/review", kycAdmin(), { decision: "approve" });
    expect(denied.status).toBe(403);
    expect(denied.body).toMatchObject({ code: "CAPABILITY_REQUIRED", capability: "property:approve" });

    // And must not touch the team.
    expect(call("GET", "/admin/team", kycAdmin()).status).toBe(403);
  });

  it("lets a read-only admin see nothing actionable", () => {
    const session = call("GET", "/admin/session", readOnly()).body as { capabilities: string[] };
    expect(session.capabilities).toEqual([]);

    for (const [method, path] of [
      ["POST", "/admin/properties/prop_5/review"],
      ["POST", "/admin/kyc/usr_landlord2/review"],
      ["POST", "/admin/requests/req_2/review"],
      ["POST", "/admin/reviews/rev_2/review"],
      ["GET", "/admin/team"],
      ["GET", "/admin/audit-log"],
      ["GET", "/admin/tickets"],
    ] as const) {
      expect(call(method, path, readOnly(), { decision: "approve" }).status).toBe(403);
    }
  });

  it("separates approve from reject on the property queue", () => {
    // listings-manager holds both; kyc-reviewer holds neither.
    const rejected = call("POST", "/admin/properties/prop_5/review", kycAdmin(), {
      decision: "reject",
      reason: "test",
    });
    expect(rejected.body).toMatchObject({ capability: "property:reject" });
  });

  it("still rejects non-admins outright", () => {
    expect(call("GET", "/admin/team", auth("tenant@example.com")).status).toBe(403);
    expect(call("GET", "/admin/session", auth("landlord@example.com")).status).toBe(403);
  });
});

describe("admin team management", () => {
  it("creates an admin with the capabilities of their sub-role", () => {
    const res = call("POST", "/admin/team", superAdmin(), {
      fullName: "منى عادل",
      email: "mona@example.com",
      role: "listings-manager",
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      role: "listings-manager",
      capabilities: ["property:approve", "property:reject"],
      disabled: false,
    });
  });

  it("refuses to let an admin edit their own privileges", () => {
    // Otherwise a super-admin could demote themselves and strand the team.
    const res = call("PATCH", "/admin/team/usr_admin", superAdmin(), { role: "read-only" });
    expect(res.status).toBe(403);
  });

  it("disabling an admin blocks their login", () => {
    expect(call("PATCH", "/admin/team/usr_admin_kyc", superAdmin(), { disabled: true }).status).toBe(200);

    const login = dispatch(
      "POST",
      "/auth/login",
      new URLSearchParams(),
      null,
      { email: "kyc@example.com", password: "password123" },
    );
    expect(login.status).toBe(403);
  });

  it("requires admin:create to add an admin, not just admin:manage", () => {
    expect(call("POST", "/admin/team", support(), { fullName: "x y", email: "x@e.com", role: "read-only" }).status).toBe(403);
  });
});

describe("audit log", () => {
  it("records every moderation decision with the acting admin", () => {
    call("POST", "/admin/properties/prop_5/review", superAdmin(), { decision: "approve" });

    const { items } = call("GET", "/admin/audit-log", superAdmin()).body as {
      items: { actorName: string; action: string; subjectId: string }[];
    };
    expect(items[0]).toMatchObject({ actorName: "مشرف المنصة", action: "property:approve prop_5", subjectId: "prop_5" });
  });

  it("records admin management actions", () => {
    call("PATCH", "/admin/team/usr_admin_kyc", superAdmin(), { role: "finance-admin" });

    const { items } = call("GET", "/admin/audit-log", superAdmin()).body as { items: { action: string }[] };
    expect(items[0].action).toContain("admin:role usr_admin_kyc → finance-admin");
  });

  it("is append-only — there is no write or delete route", () => {
    expect(call("POST", "/admin/audit-log", superAdmin(), {}).status).toBe(404);
    expect(call("DELETE", "/admin/audit-log", superAdmin()).status).toBe(404);
  });
});

describe("login history", () => {
  it("records failed admin logins, not just successful ones", () => {
    dispatch("POST", "/auth/login", new URLSearchParams(), null, { email: "admin@example.com", password: "short" });

    const { items } = call("GET", "/admin/login-history", superAdmin()).body as {
      items: { adminName: string; success: boolean }[];
    };
    expect(items[0]).toMatchObject({ adminName: "مشرف المنصة", success: false });
  });
});

describe("support tickets", () => {
  it("an internal note does not advance the ticket", () => {
    const before = call("GET", "/admin/tickets/tkt_1", support()).body as { status: string };
    expect(before.status).toBe("new");

    call("POST", "/admin/tickets/tkt_1/reply", support(), { content: "ملاحظة داخلية", internal: true });

    const after = call("GET", "/admin/tickets/tkt_1", support()).body as { status: string };
    expect(after.status).toBe("new");
  });

  it("a customer reply moves a new ticket to in_progress", () => {
    call("POST", "/admin/tickets/tkt_1/reply", support(), { content: "رد على العميل", internal: false });

    const after = call("GET", "/admin/tickets/tkt_1", support()).body as {
      status: string;
      messages: { internal: boolean }[];
    };
    expect(after.status).toBe("in_progress");
    expect(after.messages.at(-1)).toMatchObject({ internal: false, author: "admin" });
  });

  it("assigning claims the ticket for the acting admin", () => {
    const res = call("POST", "/admin/tickets/tkt_1/assign", support()).body as {
      assignedAdminId: string;
      status: string;
    };
    expect(res.assignedAdminId).toBe("usr_admin_support");
    expect(res.status).toBe("assigned");
  });
});
