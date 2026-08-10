import { fireEvent, render, screen } from "@testing-library/react";
import { ConversationView } from "../ConversationView";

let mockPathname = "/tenant/messages/match-id";
let mockAgreementReachedAt: string | null = null;
let mockCanConfirmAgreement = true;
let mockMessages: Array<Record<string, unknown>> = [];
const mockConfirmAgreement = jest.fn();
const mockSendMessage = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

jest.mock("../../hooks/useMessages", () => ({
  useMatchConversations: () => ({
    data: [
      {
        matchConnectionId: "match-id",
        propertyId: "property-id",
        propertyTitle: "شقة للاختبار",
        propertyCoverImage: null,
        otherParticipantName: "الطرف الآخر",
        connectionStatus: "CONNECTED",
        agreementReachedAt: mockAgreementReachedAt,
        canConfirmAgreement: mockCanConfirmAgreement,
        lastMessagePreview: null,
        lastMessageAt: null,
      },
    ],
  }),
  useMatchMessages: () => ({ data: mockMessages, isLoading: false }),
  useConfirmMatchAgreement: () => ({
    mutate: mockConfirmAgreement,
    isPending: false,
    isError: false,
  }),
  useSendMatchMessage: () => ({ mutate: mockSendMessage, isPending: false }),
  useUpdateMatchMessage: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteMatchMessage: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("../../hooks/useChatUpload", () => ({
  useChatUpload: () => ({ upload: jest.fn(), uploading: false }),
}));

describe("ConversationView agreement gate", () => {
  beforeEach(() => {
    mockPathname = "/tenant/messages/match-id";
    mockAgreementReachedAt = null;
    mockCanConfirmAgreement = true;
    mockMessages = [];
    mockConfirmAgreement.mockReset();
    mockSendMessage.mockReset();
  });

  it("requires the tenant to explicitly acknowledge the final agreement", () => {
    render(<ConversationView matchConnectionId="match-id" />);

    expect(screen.getByRole("link", { name: /إنشاء عقد إيجار/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /تم التوصل إلى اتفاق/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("سيتم أرشفة العقار تلقائيًا");

    const submit = screen.getByRole("button", { name: "تأكيد الاتفاق وأرشفة العقار" });
    expect(submit).toBeDisabled();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /أؤكد أنني توصلت إلى اتفاق نهائي/,
      }),
    );
    fireEvent.click(submit);
    expect(mockConfirmAgreement).toHaveBeenCalledWith(undefined, expect.any(Object));
  });

  it("keeps contract generation available after agreement", () => {
    mockAgreementReachedAt = "2026-08-07T20:00:00.000Z";
    mockCanConfirmAgreement = false;
    render(<ConversationView matchConnectionId="match-id" />);
    expect(screen.getByRole("link", { name: /إنشاء عقد إيجار/ })).toHaveAttribute(
      "href",
      "/contracts/new?matchConnectionId=match-id",
    );
    expect(screen.queryByRole("button", { name: /تم التوصل إلى اتفاق/ })).not.toBeInTheDocument();
  });

  it("does not let the landlord confirm the agreement", () => {
    mockPathname = "/landlord/messages/match-id";
    mockCanConfirmAgreement = false;
    render(<ConversationView matchConnectionId="match-id" />);
    expect(screen.getByText("بانتظار تأكيد الطرف الآخر")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /تم التوصل إلى اتفاق/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /إنشاء عقد إيجار/ })).toBeInTheDocument();
  });

  it("lets the landlord confirm a direct listing or counter-offer agreement", () => {
    mockPathname = "/landlord/messages/match-id";
    mockCanConfirmAgreement = true;
    render(<ConversationView matchConnectionId="match-id" />);
    fireEvent.click(screen.getByRole("button", { name: /تم التوصل إلى اتفاق/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("أرشفة العقار");
  });

  it("sends with Enter and keeps Shift+Enter available for a new line", () => {
    render(<ConversationView matchConnectionId="match-id" />);
    const messageBox = screen.getByRole("textbox");

    fireEvent.change(messageBox, { target: { value: "Hello" } });
    fireEvent.keyDown(messageBox, { key: "Enter", shiftKey: true });
    expect(mockSendMessage).not.toHaveBeenCalled();

    fireEvent.keyDown(messageBox, { key: "Enter" });
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ body: "Hello" }),
      expect.any(Object),
    );
  });

  it("clamps long messages to three lines and expands them without horizontal scrolling", () => {
    const scrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
    const clientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get: () => 80,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 48,
    });
    mockMessages = [
      {
        id: "message-1",
        body: "رسالة طويلة جداً ".repeat(20),
        isMine: false,
        createdAt: "2026-08-09T12:00:00.000Z",
        editedAt: null,
        attachmentUrl: null,
        attachmentType: null,
        attachmentName: null,
        attachmentDurationMs: null,
      },
    ];

    const { container } = render(<ConversationView matchConnectionId="match-id" />);
    const more = screen.getByRole("button", { name: "عرض المزيد" });
    const paragraph = more.previousElementSibling;
    const messageBody = paragraph?.parentElement;
    const bubble = messageBody?.parentElement;
    expect(paragraph).toHaveClass("line-clamp-3");
    expect(container.querySelector('[role="log"]')).toHaveClass(
      "overflow-x-hidden",
      "overflow-y-auto",
      "min-h-0",
    );
    expect(messageBody).not.toHaveClass("overflow-x-hidden");
    expect(bubble).toHaveClass("w-fit", "min-w-48", "shrink-0");
    expect(bubble).not.toHaveClass("overflow-x-hidden");
    expect(screen.getByRole("textbox")).toHaveClass("resize-none");

    fireEvent.click(more);
    expect(paragraph).not.toHaveClass("line-clamp-3");
    expect(screen.getByRole("button", { name: "عرض أقل" })).toBeInTheDocument();

    if (scrollHeight) Object.defineProperty(HTMLElement.prototype, "scrollHeight", scrollHeight);
    if (clientHeight) Object.defineProperty(HTMLElement.prototype, "clientHeight", clientHeight);
  });
});
