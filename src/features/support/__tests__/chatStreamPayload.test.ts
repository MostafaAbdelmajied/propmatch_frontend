import { buildChatStreamPayload } from "../chatStreamPayload";

const supportMessages = [
  { id: "message-1", role: "user" as const, content: "مشكلة في الحساب" },
];

describe("buildChatStreamPayload", () => {
  it("excludes support-only metadata from a legal text request", () => {
    const payload = buildChatStreamPayload({
      mode: "LEGAL",
      message: "ما مدة الإخطار قبل فسخ العقد؟",
      attachment: null,
      clientRequestId: "request-1",
      supportMessages,
    });

    expect(payload).toEqual({ message: "ما مدة الإخطار قبل فسخ العقد؟" });
    expect(payload).not.toHaveProperty("clientRequestId");
    expect(payload).not.toHaveProperty("history");
  });

  it("keeps legal attachments within the LegalChatDto contract", () => {
    expect(
      buildChatStreamPayload({
        mode: "LEGAL",
        message: "راجع هذا المستند",
        attachment: {
          url: "/uploads/contract.jpg",
          type: "IMAGE",
          name: "contract.jpg",
        },
        clientRequestId: "request-1",
        supportMessages,
      }),
    ).toEqual({
      message: "راجع هذا المستند",
      attachments: [
        { url: "/uploads/contract.jpg", type: "IMAGE", name: "contract.jpg" },
      ],
    });
  });

  it("preserves idempotency and history metadata for customer support", () => {
    expect(
      buildChatStreamPayload({
        mode: "SUPPORT",
        message: "أريد موظف دعم",
        attachment: null,
        clientRequestId: "request-1",
        supportMessages,
      }),
    ).toEqual({
      message: "أريد موظف دعم",
      clientRequestId: "request-1",
      history: [{ role: "user", content: "مشكلة في الحساب" }],
    });
  });
});
