import { hasOpenSupportTicket } from "../useUserSupport";
import type { TicketSummary } from "@/src/lib/api/contracts/support";

function ticket(status: TicketSummary["status"]): TicketSummary {
  return {
    id: `ticket-${status}`,
    subject: "Support",
    status,
    lastMessageAt: "2026-08-09T12:00:00.000Z",
    createdAt: "2026-08-09T12:00:00.000Z",
  };
}

describe("hasOpenSupportTicket", () => {
  it("blocks a duplicate escalation while any ticket is open", () => {
    expect(hasOpenSupportTicket([ticket("CLOSED"), ticket("IN_PROGRESS")])).toBe(true);
  });

  it("allows escalation when every prior ticket is closed", () => {
    expect(hasOpenSupportTicket([ticket("CLOSED"), ticket("closed")])).toBe(false);
  });
});
