import { UserTicketDetail } from "@/src/features/support/components/UserTicketDetail";

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UserTicketDetail id={id} />;
}
