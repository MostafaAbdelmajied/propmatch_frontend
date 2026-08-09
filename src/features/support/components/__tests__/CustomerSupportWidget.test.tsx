import { fireEvent, render, screen } from "@testing-library/react";
import { CustomerSupportWidget } from "../CustomerSupportWidget";
import { useCreateSupportTicket, useMyTickets } from "../../hooks/useUserSupport";

jest.mock("../../hooks/useUserSupport", () => ({
  hasOpenSupportTicket: (tickets: Array<{ status: string }>) =>
    tickets.some((ticket) => ticket.status.toUpperCase() !== "CLOSED"),
  useCreateSupportTicket: jest.fn(),
  useMyTickets: jest.fn(),
  useUserTicketDetail: jest.fn(),
  useUserTicketReply: jest.fn(),
}));
jest.mock("@/src/components/ui/Toast", () => ({ useToast: () => jest.fn() }));

const mockCreateTicket = useCreateSupportTicket as jest.MockedFunction<
  typeof useCreateSupportTicket
>;
const mockMyTickets = useMyTickets as jest.MockedFunction<typeof useMyTickets>;
const mutate = jest.fn();

describe("CustomerSupportWidget manual escalation", () => {
  beforeEach(() => {
    mutate.mockReset();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: jest.fn(),
    });
    mockCreateTicket.mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateSupportTicket>);
    mockMyTickets.mockReturnValue({
      data: { items: [] },
      isPending: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useMyTickets>);
  });

  it("disables escalation when an open support ticket already exists", () => {
    mockMyTickets.mockReturnValue({
      data: {
        items: [
          {
            id: "ticket-1",
            subject: "Support",
            status: "IN_PROGRESS",
            lastMessageAt: "2026-08-09T12:00:00.000Z",
            createdAt: "2026-08-09T12:00:00.000Z",
          },
        ],
      },
      isPending: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useMyTickets>);

    render(<CustomerSupportWidget />);
    const button = screen.getByRole("button", { name: "لديك تذكرة دعم مفتوحة" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows a spinner and disables escalation while tickets are loading", () => {
    mockMyTickets.mockReturnValue({
      data: undefined,
      isPending: true,
      isFetching: true,
    } as unknown as ReturnType<typeof useMyTickets>);

    render(<CustomerSupportWidget />);
    const button = screen.getByRole("button", { name: "تحويل لموظف الدعم" });
    expect(button).toBeDisabled();
    expect(button.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
