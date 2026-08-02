import { KycWizard } from "@/src/features/ekyc/components/KycWizard";

/**
 * Role-neutral eKYC entry point (PRO-03). Tenants need verification too — to
 * publish a request and to accept an offer — so the wizard can't live only
 * under /landlord. `/landlord/verify` stays as the landlord-shell entry.
 */
export default function VerifyPage() {
  return <KycWizard />;
}
