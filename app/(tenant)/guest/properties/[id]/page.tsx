import { PropertyDetailView } from "@/src/features/listings/components/PropertyDetailView";

export default async function GuestPropertyPage({
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
    />
  );
}
