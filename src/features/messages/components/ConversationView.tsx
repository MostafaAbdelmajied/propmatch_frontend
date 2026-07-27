"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, FileText, Send } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import {
  useMatchConversations,
  useMatchMessages,
  useSendMatchMessage,
} from "../hooks/useMessages";

export function ConversationView({ matchConnectionId }: { matchConnectionId: string }) {
  const pathname = usePathname();
  const role = pathname.startsWith("/landlord") ? "landlord" : "tenant";
  const conversations = useMatchConversations();
  const summary = conversations.data?.find(
    (conversation) => conversation.matchConnectionId === matchConnectionId,
  );
  const { data = [], isLoading } = useMatchMessages(matchConnectionId);
  const send = useSendMatchMessage(matchConnectionId);
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const valid = Boolean(body.trim()) && body.length <= 1000;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || send.isPending) return;

    setSendError(null);
    send.mutate(
      { body: body.trim() },
      {
        onSuccess: () => setBody(""),
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
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">{summary?.otherParticipantName ?? "المحادثة"}</p>
          {summary?.propertyTitle && <p className="truncate text-small text-muted">{summary.propertyTitle}</p>}
        </div>
        <Link
          href={`/contracts/new?matchConnectionId=${matchConnectionId}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-hairline px-3 py-2 text-caption font-semibold text-primary hover:bg-primary-tint"
        >
          <FileText className="size-4" aria-hidden />
          إنشاء عقد إيجار
        </Link>
      </header>

      <section className="flex min-h-72 flex-1 flex-col gap-3 rounded-card border border-hairline bg-background p-4" aria-live="polite">
        {isLoading ? (
          <p className="text-small text-muted">جارٍ تحميل الرسائل...</p>
        ) : data.length ? (
          data.map((message) => (
            <p
              key={message.id}
              className={
                message.isMine
                  ? "ms-auto max-w-[85%] rounded-card bg-primary px-4 py-3 text-white"
                  : "me-auto max-w-[85%] rounded-card bg-surface px-4 py-3 text-ink shadow-card"
              }
              dir="auto"
            >
              {message.body}
            </p>
          ))
        ) : (
          <p className="m-auto text-center text-small text-muted">ابدأ المحادثة برسالة قصيرة ومحترمة.</p>
        )}
      </section>

      <form onSubmit={submit} className="rounded-card border border-hairline bg-surface p-4">
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
          <div>
            <span className="text-caption text-muted">{body.length}/1000</span>
            {sendError && <p className="mt-1 text-small text-error" role="alert">{sendError}</p>}
          </div>
          <Button type="submit" disabled={!valid} loading={send.isPending}>
            <Send className="size-4" aria-hidden />
            إرسال
          </Button>
        </div>
      </form>
    </div>
  );
}
