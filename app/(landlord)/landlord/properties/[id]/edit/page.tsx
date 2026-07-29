import { EditPropertyForm } from "@/src/features/landlord/components/EditPropertyForm";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditPropertyForm propertyId={id} />;
}
