"use client";

import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { ErrorState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { ticketStatusLabels } from "@/src/lib/api/contracts/support";
import { cn } from "@/src/utils/cn";
import { formatRelativeTime } from "@/src/utils/format";
import { ArrowRight, Bot, Send, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUserTicketDetail, useUserTicketReply } from "../hooks/useUserSupport";
import {
  AttachmentBar,
  type PendingAttachment,
} from "@/src/features/messages/components/AttachmentBar";
import { ChatAttachmentView } from "@/src/features/messages/components/ChatAttachmentView";

/**
 * Customer-facing view of a single support ticket — the conversation between
 * the user and the support agent. Reached from the notification deep link
 * (`/support/tickets/:id`). Updates live via the `support:message:received`
 * socket event (handled in useRealtime → query invalidation).
 *
 * Internal agent notes (`internal: true`) are filtered out — they must never
 * be shown to the customer.
 */
export function UserTicketDetail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { data: ticket, isLoading, isError, refetch } = useUserTicketDetail(id);
  const reply = useUserTicketReply(id);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;
    messageList.scrollTop = messageList.scrollHeight;
  }, [ticket?.messages.length]);

  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (isLoading || !ticket) return <Skeleton className="h-96 w-full" />;

  const visibleMessages = ticket.messages.filter((m) => !m.internal);
  const canSend = Boolean(text.trim() || pending);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    reply.mutate(
      {
        content: text.trim() || undefined,
        attachmentUrl: pending?.url,
        attachmentType: pending?.type,
        attachmentName: pending?.name,
        attachmentDurationMs: pending?.durationMs,
      },
      {
        onSuccess: () => {
          setText("");
          setPending(null);
          toast("success", "تم إرسال رسالتك");
        },
        onError: () => toast("error", "تعذّر إرسال الرسالة، حاول مجددًا"),
      },
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-12rem)] min-h-0 max-w-2xl flex-col gap-4 overflow-hidden p-4 md:h-[calc(100dvh-10rem)]">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowRight className="size-4" aria-hidden />
          رجوع
        </Button>
        <span className="rounded-full bg-primary-tint px-3 py-1 text-caption text-primary">
          {ticketStatusLabels[ticket.status]}
        </span>
      </div>

      <div className="shrink-0 rounded-card border border-hairline bg-surface p-4">
        <h1 className="text-title font-bold text-ink">{ticket.subject}</h1>
        {ticket.assignedAdminName && (
          <p className="mt-0.5 text-caption text-muted">فريق الدعم: {ticket.assignedAdminName}</p>
        )}
      </div>

      {/* Thread */}
      <div
        ref={messageListRef}
        className="flex min-h-0 flex-1 touch-pan-y flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain rounded-card border border-hairline bg-surface p-4 [scrollbar-gutter:stable]"
        role="log"
        aria-live="polite"
      >
        {visibleMessages.map((m) => {
          const authorVal = String(m.authorType || m.author || "").toLowerCase();
          const isMine = authorVal === "user";
          const isAi = authorVal === "ai";
          const timestamp = m.createdAt || m.at || new Date().toISOString();

          return (
            <div
              key={m.id}
              className={cn("flex shrink-0", isMine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "flex min-w-48 max-w-[85%] flex-col gap-1",
                  isMine ? "items-end" : "items-start",
                )}
              >
                <span className="flex items-center gap-1 text-caption text-muted">
                  {isAi ? (
                    <Bot className="size-3" aria-hidden />
                  ) : (
                    <UserIcon className="size-3" aria-hidden />
                  )}
                  {m.authorName}
                  <span>· {formatRelativeTime(timestamp)}</span>
                </span>
                <div
                  className={cn(
                    "flex w-full min-w-0 flex-col gap-2 whitespace-pre-wrap rounded-card px-4 py-2.5 text-body leading-relaxed [overflow-wrap:anywhere]",
                    isMine
                      ? "bg-primary text-white"
                      : isAi
                        ? "bg-primary-tint text-ink"
                        : "bg-background text-ink",
                  )}
                >
                  {m.attachmentUrl && m.attachmentType && (
                    <ChatAttachmentView
                      url={m.attachmentUrl}
                      type={m.attachmentType}
                      name={m.attachmentName}
                      durationMs={m.attachmentDurationMs}
                    />
                  )}
                  {m.content && <span>{m.content}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply box */}
      <form
        onSubmit={submit}
        className="flex shrink-0 flex-col gap-2 rounded-card border border-hairline bg-surface p-4"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="اكتب رسالتك لفريق الدعم…"
          className="min-h-20 max-h-32 w-full resize-none rounded-control border border-hairline bg-surface px-3.5 py-2.5 text-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex items-end justify-between gap-3">
          <AttachmentBar pending={pending} onChange={setPending} disabled={reply.isPending} />
          <Button type="submit" loading={reply.isPending} disabled={!canSend}>
            <Send className="size-4 rtl:-scale-x-100" aria-hidden />
            إرسال
          </Button>
        </div>
      </form>
    </div>
  );
}
