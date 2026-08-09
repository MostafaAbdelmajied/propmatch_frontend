import type { PendingAttachment } from "@/src/features/messages/components/AttachmentBar";
import type { ChatMessage } from "@/src/lib/api/contracts/support";

type AssistantMode = "SUPPORT" | "LEGAL";

interface BuildChatStreamPayloadInput {
  mode: AssistantMode;
  message: string;
  attachment: PendingAttachment | null;
  clientRequestId: string;
  supportMessages: ChatMessage[];
}

/** Keep each upstream request aligned with its strict NestJS DTO. */
export function buildChatStreamPayload({
  mode,
  message,
  attachment,
  clientRequestId,
  supportMessages,
}: BuildChatStreamPayloadInput) {
  if (mode === "LEGAL") {
    return {
      message,
      ...(attachment
        ? {
            attachments: [
              { url: attachment.url, type: attachment.type, name: attachment.name },
            ],
          }
        : {}),
    };
  }

  return {
    message,
    clientRequestId,
    history: supportMessages.map(({ role, content }) => ({ role, content })),
  };
}
