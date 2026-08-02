import { dispatch } from "../router";
import { db, tokensFor } from "../db";

const tokenFor = (email: string) => {
  const user = db.users.find((candidate) => candidate.email === email)!;
  return `Bearer ${tokensFor(user).accessToken}`;
};

const call = (method: string, path: string, token: string | null) =>
  dispatch(method, path, new URLSearchParams(), token);

describe("property archive mock contract", () => {
  const property = () => db.properties.find((candidate) => candidate.id === "prop_1")!;
  let originalStatus: typeof property extends () => infer T
    ? T extends { status: infer S }
      ? S
      : never
    : never;

  beforeEach(() => {
    originalStatus = property().status;
  });

  afterEach(() => {
    property().status = originalStatus;
  });

  it("archives an owner property and retains it in the owner's list", () => {
    const archived = call("PATCH", "/properties/prop_1/archive", tokenFor("landlord@example.com"));

    expect(archived.status).toBe(200);
    expect((archived.body as { property: { status: string } }).property.status).toBe("ARCHIVED");

    const mine = call("GET", "/landlord/properties", tokenFor("landlord@example.com"));
    expect((mine.body as { items: { id: string; status: string }[] }).items).toContainEqual(
      expect.objectContaining({ id: "prop_1", status: "ARCHIVED" }),
    );
  });

  it("rejects another owner from archiving the property", () => {
    const response = call("PATCH", "/properties/prop_1/archive", tokenFor("landlord2@example.com"));

    expect(response.status).toBe(403);
  });

  it("returns an archived property to pending review instead of republishing it", () => {
    property().status = "ARCHIVED";

    const restored = call("PATCH", "/properties/prop_1/unarchive", tokenFor("landlord@example.com"));

    expect(restored.status).toBe(200);
    expect((restored.body as { property: { status: string } }).property.status).toBe("PENDING");
  });

  it("places a restored listing in the admin re-review queue", () => {
    property().status = "ARCHIVED";
    call("PATCH", "/properties/prop_1/unarchive", tokenFor("landlord@example.com"));

    const queues = call("GET", "/admin/queues", tokenFor("admin@example.com"));
    expect((queues.body as { editedPropertyQueue: { subjectId: string }[] }).editedPropertyQueue).toContainEqual(
      expect.objectContaining({ subjectId: "prop_1" }),
    );
  });
});
