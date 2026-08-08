import { getActiveNavHref } from "../RoleNav";

const items = [
  { href: "/landlord" },
  { href: "/landlord/requests" },
  { href: "/landlord/offers" },
  { href: "/contracts" },
];

describe("getActiveNavHref", () => {
  it("activates the landlord dashboard only on its own route", () => {
    expect(getActiveNavHref(items, "/landlord")).toBe("/landlord");
  });

  it("prefers the most specific nested landlord route", () => {
    expect(getActiveNavHref(items, "/landlord/requests")).toBe("/landlord/requests");
    expect(getActiveNavHref(items, "/landlord/offers/new")).toBe("/landlord/offers");
  });

  it("activates contracts throughout the contracts section", () => {
    expect(getActiveNavHref(items, "/contracts")).toBe("/contracts");
    expect(getActiveNavHref(items, "/contracts/contract-id")).toBe("/contracts");
  });

  it("returns no active item for unrelated routes", () => {
    expect(getActiveNavHref(items, "/profile")).toBeNull();
  });
});
