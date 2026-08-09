import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CustomerSupportWidget } from "../CustomerSupportWidget";
import {
  useCreateSupportTicket,
  useMyTickets,
  useUserTicketDetail,
} from "../../hooks/useUserSupport";
import { streamPost } from "@/src/lib/api/browserClient";

jest.mock("../../hooks/useUserSupport", () => ({
  hasOpenSupportTicket: (tickets: Array<{ status: string }>) =>
    tickets.some((ticket) => ticket.status.toUpperCase() !== "CLOSED"),
  useCreateSupportTicket: jest.fn(),
  useMyTickets: jest.fn(),
  useUserTicketDetail: jest.fn(),
  useUserTicketReply: jest.fn(),
}));
jest.mock("@/src/lib/api/browserClient", () => ({ streamPost: jest.fn() }));
jest.mock("@/src/components/ui/Toast", () => ({ useToast: () => jest.fn() }));

const mockCreateTicket = useCreateSupportTicket as jest.MockedFunction<
  typeof useCreateSupportTicket
>;
const mockMyTickets = useMyTickets as jest.MockedFunction<typeof useMyTickets>;
const mockUserTicketDetail = useUserTicketDetail as jest.MockedFunction<typeof useUserTicketDetail>;
const mockStreamPost = streamPost as jest.MockedFunction<typeof streamPost>;
const mutate = jest.fn();
const refetch = jest.fn();

describe("CustomerSupportWidget manual escalation", () => {
  beforeEach(() => {
    mutate.mockReset();
    refetch.mockReset();
    mockStreamPost.mockReset();
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: jest.fn(() => "00000000-0000-4000-8000-000000000001"),
    });
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
      refetch,
    } as unknown as ReturnType<typeof useMyTickets>);
    mockUserTicketDetail.mockReturnValue({
      isLoading: true,
    } as unknown as ReturnType<typeof useUserTicketDetail>);
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

  it("opens and refreshes a ticket created by automatic escalation", async () => {
    mockStreamPost.mockImplementation(async (_path, _body, handlers) => {
      handlers.onToken("تم إنشاء تذكرة دعم");
      return {
        type: "done",
        id: "message-1",
        escalated: true,
        ticketId: "ticket-auto-1",
      };
    });

    render(<CustomerSupportWidget />);
    fireEvent.change(screen.getByPlaceholderText("اكتب رسالتك للمساعد الذكي…"), {
      target: { value: "أريد التحدث مع موظف دعم" },
    });
    fireEvent.click(screen.getByRole("button", { name: "إرسال" }));

    await waitFor(() => {
      expect(refetch).toHaveBeenCalled();
      expect(mockUserTicketDetail).toHaveBeenCalledWith("ticket-auto-1");
    });
  });
});
