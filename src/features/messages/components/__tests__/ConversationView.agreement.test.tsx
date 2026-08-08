import { fireEvent, render, screen } from "@testing-library/react";
import { ConversationView } from "../ConversationView";

let mockPathname = "/tenant/messages/match-id";
let mockAgreementReachedAt: string | null = null;
let mockCanConfirmAgreement = true;
const mockConfirmAgreement = jest.fn();

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
  useMatchMessages: () => ({ data: [], isLoading: false }),
  useConfirmMatchAgreement: () => ({
    mutate: mockConfirmAgreement,
    isPending: false,
    isError: false,
  }),
  useSendMatchMessage: () => ({ mutate: jest.fn(), isPending: false }),
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
    mockConfirmAgreement.mockReset();
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
});
