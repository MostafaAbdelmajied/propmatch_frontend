export type ChatAttachmentType = 'IMAGE' | 'VIDEO' | 'AUDIO';

export type ChatAttachment = {
  attachmentUrl: string | null;
  attachmentType: ChatAttachmentType | null;
  attachmentName: string | null;
  attachmentDurationMs: number | null;
};

export type UploadedAttachment = { url: string; type: ChatAttachmentType; name: string; sizeBytes: number };

export type MatchConversationSummary = { matchConnectionId: string; propertyId: string; propertyTitle: string; propertyCoverImage: string | null; otherParticipantName: string; connectionStatus: 'CONNECTED'; lastMessagePreview: string | null; lastMessageAt: string | null };
export type MatchMessage = { id: string; senderId: string; body: string; createdAt: string; isMine: boolean } & Partial<ChatAttachment>;
export type SendMatchMessageInput = { body?: string } & Partial<Omit<ChatAttachment, 'attachmentUrl'>> & { attachmentUrl?: string };

export type RealtimeMatchMessage = MatchMessage & { matchConnectionId: string };
