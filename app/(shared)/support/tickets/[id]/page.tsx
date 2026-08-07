import { UserTicketDetail } from "@/src/features/support/components/UserTicketDetail";
import { sharedRouteRoles } from "@/src/features/auth/routePolicy";
import { requireAnyRole } from "@/src/lib/api/serverSession";

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyRole(sharedRouteRoles.supportTicket, "/support/tickets");
  const { id } = await params;
  return <UserTicketDetail id={id} />;
}
