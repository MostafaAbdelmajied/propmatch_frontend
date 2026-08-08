import type { AccountRole } from "@/src/lib/api/contracts/auth";

const tenantAndLandlord = ["tenant", "landlord"] as const satisfies readonly AccountRole[];

export const sharedRouteRoles = {
  contracts: tenantAndLandlord,
  supportTicket: tenantAndLandlord,
  verification: tenantAndLandlord,
  profile: ["tenant", "landlord", "admin"],
} as const satisfies Record<string, readonly AccountRole[]>;

export function canRoleAccess(role: AccountRole, allowedRoles: readonly AccountRole[]): boolean {
  return allowedRoles.includes(role);
}
