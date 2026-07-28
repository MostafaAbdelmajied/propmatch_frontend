"use client";

import type { ChatAttachmentType } from "@/src/lib/api/contracts/message";
import { mediaUrl } from "../hooks/useChatUpload";
import { VoiceNotePlayer } from "./VoiceNotePlayer";

/** Renders an inline chat attachment (image / video / voice note). */
export function ChatAttachmentView({
  url,
  type,
  name,
  durationMs,
}: {
  url: string;
  type: ChatAttachmentType;
  name?: string | null;
  durationMs?: number | null;
}) {
  const src = mediaUrl(url);

  if (type === "IMAGE") {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name ?? "صورة مرفقة"}
          className="max-h-64 w-auto max-w-full rounded-control object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (type === "VIDEO") {
    return (
      <video
        src={src}
        controls
        className="max-h-64 w-auto max-w-full rounded-control"
        preload="metadata"
      />
    );
  }

  // AUDIO — voice note (WhatsApp-style player, inherits bubble text color)
  return <VoiceNotePlayer src={src} durationMs={durationMs} />;
}
