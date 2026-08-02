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
  onClickMedia,
}: {
  url: string;
  type: ChatAttachmentType;
  name?: string | null;
  durationMs?: number | null;
  onClickMedia?: () => void;
}) {
  const src = mediaUrl(url);

  if (type === "IMAGE") {
    return (
      <button
        type="button"
        onClick={onClickMedia}
        className="block group relative overflow-hidden rounded-control text-left"
      >
        <img
          src={src}
          alt={name ?? "صورة مرفقة"}
          className="max-h-64 w-auto max-w-full rounded-control object-cover group-hover:opacity-95 transition-opacity cursor-pointer"
          loading="lazy"
        />
      </button>
    );
  }

  if (type === "VIDEO") {
    return (
      <div className="relative group cursor-pointer" onClick={onClickMedia}>
        <video
          src={src}
          className="max-h-64 w-auto max-w-full rounded-control pointer-events-none"
          preload="metadata"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-control group-hover:bg-black/40 transition-colors">
          <span className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs">
            ▶
          </span>
        </div>
      </div>
    );
  }

  // AUDIO — voice note (WhatsApp-style player, inherits bubble text color)
  return <VoiceNotePlayer src={src} durationMs={durationMs} />;
}
