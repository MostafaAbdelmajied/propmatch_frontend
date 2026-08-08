import { canRoleAccess, sharedRouteRoles } from "../routePolicy";

describe("shared route role policy", () => {
  it.each(["verification", "contracts", "supportTicket"] as const)(
    "allows tenant and landlord but denies admin for %s",
    (route) => {
      expect(canRoleAccess("tenant", sharedRouteRoles[route])).toBe(true);
      expect(canRoleAccess("landlord", sharedRouteRoles[route])).toBe(true);
      expect(canRoleAccess("admin", sharedRouteRoles[route])).toBe(false);
    },
  );

  it("keeps profile intentionally shared by every authenticated role", () => {
    for (const role of ["tenant", "landlord", "admin"] as const) {
      expect(canRoleAccess(role, sharedRouteRoles.profile)).toBe(true);
    }
  });
});
