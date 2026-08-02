import { PropertyDetailView } from "@/src/features/listings/components/PropertyDetailView";
import { FavoriteButton } from "@/src/features/listings/components/FavoriteButton";

export default async function TenantPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ score?: string }>;
}) {
  const { id } = await params;
  const { score } = await searchParams;
  const matchScore = score ? Number(score) : undefined;
  return (
    <PropertyDetailView
      id={id}
      matchScore={Number.isFinite(matchScore) ? matchScore : undefined}
      showReviews
      favoriteSlot={<FavoriteButton propertyId={id} />}
    />
  );
}
