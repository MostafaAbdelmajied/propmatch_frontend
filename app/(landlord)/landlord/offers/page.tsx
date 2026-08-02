import { LandlordSentOffers } from "@/src/features/matching/components/LandlordSentOffers";
import { LandlordDirectOffers } from "@/src/features/matching/components/LandlordDirectOffers";

export default function LandlordOffersPage() {
  return (
    <div className="flex flex-col gap-8">
      <LandlordDirectOffers />
      <LandlordSentOffers />
    </div>
  );
}
