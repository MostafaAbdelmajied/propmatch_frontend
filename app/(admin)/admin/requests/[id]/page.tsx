import { AdminRequestReview } from "@/src/features/admin/components/AdminRequestReview";

export default async function AdminRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminRequestReview id={id} />;
}
