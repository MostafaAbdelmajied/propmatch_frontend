import { AdminReviewModeration } from "@/src/features/admin/components/AdminReviewModeration";

export default async function AdminReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminReviewModeration id={id} />;
}
