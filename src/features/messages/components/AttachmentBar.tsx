"use client";

import { useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { useChatUpload } from "../hooks/useChatUpload";
import { ChatAttachmentView } from "./ChatAttachmentView";
import { VoiceRecorderButton } from "./VoiceRecorderButton";
import type { UploadedAttachment } from "@/src/lib/api/contracts/message";

export type PendingAttachment = UploadedAttachment & { durationMs?: number };

/**
 * Reusable chat attach controls: image/video picker + voice-note recorder,
 * with an inline preview of the pending attachment. Controlled — the parent
 * owns `pending` and includes it in its send payload.
 */
export function AttachmentBar({
  pending,
  onChange,
  disabled,
}: {
  pending: PendingAttachment | null;
  onChange: (p: PendingAttachment | null) => void;
  disabled?: boolean;
}) {
  const upload = useChatUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = disabled || upload.uploading;

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = await upload.upload(file, file.name);
    if (result) onChange(result);
  }

  async function onRecorded(blob: Blob, durationMs: number) {
    const result = await upload.upload(blob, `voice-${Date.now()}.webm`);
    if (result) onChange({ ...result, durationMs });
  }

  return (
    <div className="flex flex-col gap-2">
      {pending && (
        <div className="flex items-center gap-2 rounded-control border border-hairline bg-background p-2">
          <div className="min-w-0 flex-1">
            <ChatAttachmentView url={pending.url} type={pending.type} name={pending.name} durationMs={pending.durationMs} />
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="إزالة المرفق"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-error-tint hover:text-error"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={onPickFile}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          aria-label="إرفاق صورة أو فيديو"
          title="إرفاق صورة أو فيديو"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-muted transition-colors hover:bg-primary-tint hover:text-primary disabled:opacity-50"
        >
          <Paperclip className="size-5" aria-hidden />
        </button>
        <VoiceRecorderButton onRecorded={onRecorded} disabled={busy} />
        {upload.uploading && <span className="text-caption text-muted">جارٍ الرفع…</span>}
        {upload.error && <span className="text-caption text-error">{upload.error}</span>}
      </div>
    </div>
  );
}
