import { KycWizard } from "@/src/features/ekyc/components/KycWizard";
import { sharedRouteRoles } from "@/src/features/auth/routePolicy";
import { requireAnyRole } from "@/src/lib/api/serverSession";

/**
 * Tenant/landlord eKYC entry point (PRO-03). Tenants need verification too,
 * so the wizard cannot live only under /landlord. Admins use their own review
 * surface and are redirected before this page renders.
 */
export default async function VerifyPage() {
  await requireAnyRole(sharedRouteRoles.verification, "/verify");
  return <KycWizard />;
}
