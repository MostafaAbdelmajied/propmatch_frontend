import { redirect } from "next/navigation";

/** Keep existing notification links working after the admin ticket route rename. */
export default async function LegacyAdminTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/support/${id}`);
}
