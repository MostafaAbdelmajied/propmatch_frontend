"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import {
  useMatchConversations,
  useMatchMessages,
  useSendMatchMessage,
} from "../hooks/useMessages";
import { useChatUpload } from "../hooks/useChatUpload";
import { ChatAttachmentView } from "./ChatAttachmentView";
import { VoiceRecorderButton } from "./VoiceRecorderButton";
import type { UploadedAttachment } from "@/src/lib/api/contracts/message";

export function ConversationView({ matchConnectionId }: { matchConnectionId: string }) {
  const pathname = usePathname();
  const role = pathname.startsWith("/landlord") ? "landlord" : "tenant";
  const conversations = useMatchConversations();
  const summary = conversations.data?.find(
    (conversation) => conversation.matchConnectionId === matchConnectionId,
  );
  const { data = [], isLoading } = useMatchMessages(matchConnectionId);
  const send = useSendMatchMessage(matchConnectionId);
  const upload = useChatUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [body, setBody] = useState("");
  const [pending, setPending] = useState<(UploadedAttachment & { durationMs?: number }) | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const busy = send.isPending || upload.uploading;
  const valid = (Boolean(body.trim()) || Boolean(pending)) && body.length <= 1000;

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = await upload.upload(file, file.name);
    if (result) setPending(result);
  }

  async function onRecorded(blob: Blob, durationMs: number) {
    const result = await upload.upload(blob, `voice-${Date.now()}.webm`);
    if (result) setPending({ ...result, durationMs });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy) return;
    setSendError(null);
    send.mutate(
      {
        body: body.trim() || undefined,
        attachmentUrl: pending?.url,
        attachmentType: pending?.type,
        attachmentName: pending?.name,
        attachmentDurationMs: pending?.durationMs,
      },
      {
        onSuccess: () => {
          setBody("");
          setPending(null);
        },
        onError: () => setSendError("تعذر إرسال الرسالة. حاول مرة أخرى."),
      },
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-3xl flex-col gap-4">
      <header className="flex items-center gap-3 rounded-card border border-hairline bg-surface p-4">
        <Link
          href={`/${role}/messages`}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-control text-primary hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="العودة إلى المحادثات"
        >
          <ArrowRight className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{summary?.otherParticipantName ?? "المحادثة"}</p>
          {summary?.propertyTitle && <p className="truncate text-small text-muted">{summary.propertyTitle}</p>}
        </div>
      </header>

      <section className="flex min-h-72 flex-1 flex-col gap-3 rounded-card border border-hairline bg-background p-4" aria-live="polite">
        {isLoading ? (
          <p className="text-small text-muted">جارٍ تحميل الرسائل...</p>
        ) : data.length ? (
          data.map((message) => (
            <div
              key={message.id}
              className={
                message.isMine
                  ? "ms-auto flex max-w-[85%] flex-col gap-2 rounded-card bg-primary px-4 py-3 text-white"
                  : "me-auto flex max-w-[85%] flex-col gap-2 rounded-card bg-surface px-4 py-3 text-ink shadow-card"
              }
              dir="auto"
            >
              {message.attachmentUrl && message.attachmentType && (
                <ChatAttachmentView
                  url={message.attachmentUrl}
                  type={message.attachmentType}
                  name={message.attachmentName}
                  durationMs={message.attachmentDurationMs}
                />
              )}
              {message.body && <p>{message.body}</p>}
            </div>
          ))
        ) : (
          <p className="m-auto text-center text-small text-muted">ابدأ المحادثة برسالة قصيرة ومحترمة.</p>
        )}
      </section>

      <form onSubmit={submit} className="rounded-card border border-hairline bg-surface p-4">
        {pending && (
          <div className="mb-3 flex items-center gap-2 rounded-control border border-hairline bg-background p-2">
            <div className="min-w-0 flex-1">
              <ChatAttachmentView url={pending.url} type={pending.type} name={pending.name} durationMs={pending.durationMs} />
            </div>
            <button
              type="button"
              onClick={() => setPending(null)}
              aria-label="إزالة المرفق"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-error-tint hover:text-error"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}

        <label htmlFor="message-body" className="sr-only">
          اكتب رسالتك
        </label>
        <textarea
          id="message-body"
          value={body}
          maxLength={1000}
          rows={3}
          placeholder="اكتب رسالتك..."
          onChange={(event) => setBody(event.target.value)}
          className="w-full resize-y rounded-control border border-hairline bg-background px-3 py-2.5 text-body text-ink outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          disabled={send.isPending}
        />

        <div className="mt-3 flex items-center justify-between gap-3">
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
          </div>

          <div className="flex items-center gap-3">
            <span className="text-caption text-muted">{body.length}/1000</span>
            <Button type="submit" disabled={!valid || busy} loading={send.isPending}>
              <Send className="size-4" aria-hidden />
              إرسال
            </Button>
          </div>
        </div>
        {(sendError || upload.error) && (
          <p className="mt-1 text-small text-error" role="alert">{sendError ?? upload.error}</p>
        )}
      </form>
    </div>
  );
}
