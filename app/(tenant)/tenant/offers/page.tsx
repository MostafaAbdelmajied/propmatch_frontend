import { requireRole } from "@/src/lib/api/serverSession";
import { TenantOfferInbox } from "@/src/features/matching/components/TenantOfferInbox";
import { TenantDirectOffers } from "@/src/features/matching/components/TenantDirectOffers";

export default async function TenantOffersPage() {
  await requireRole("tenant", "/tenant/offers");
  return (
    <div className="flex flex-col gap-8">
      <TenantOfferInbox />
      <TenantDirectOffers />
    </div>
  );
}
