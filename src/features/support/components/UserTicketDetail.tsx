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
import { useState } from "react";
import { useUserTicketDetail, useUserTicketReply } from "../hooks/useUserSupport";
import { AttachmentBar, type PendingAttachment } from "@/src/features/messages/components/AttachmentBar";
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
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowRight className="size-4" aria-hidden />
          رجوع
        </Button>
        <span className="rounded-full bg-primary-tint px-3 py-1 text-caption text-primary">
          {ticketStatusLabels[ticket.status]}
        </span>
      </div>

      <div className="rounded-card border border-hairline bg-surface p-4">
        <h1 className="text-title font-bold text-ink">{ticket.subject}</h1>
        {ticket.assignedAdminName && (
          <p className="mt-0.5 text-caption text-muted">فريق الدعم: {ticket.assignedAdminName}</p>
        )}
      </div>

      {/* Thread */}
      <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4">
        {visibleMessages.map((m) => {
          const authorVal = String(m.authorType || m.author || "").toLowerCase();
          const isMine = authorVal === "user";
          const isAi = authorVal === "ai";
          const timestamp = m.createdAt || m.at || new Date().toISOString();

          return (
            <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
              <div className={cn("flex max-w-[85%] flex-col gap-1", isMine ? "items-end" : "items-start")}>
                <span className="flex items-center gap-1 text-caption text-muted">
                  {isAi ? <Bot className="size-3" aria-hidden /> : <UserIcon className="size-3" aria-hidden />}
                  {m.authorName}
                  <span>· {formatRelativeTime(timestamp)}</span>
                </span>
                <div
                  className={cn(
                    "flex flex-col gap-2 whitespace-pre-line rounded-card px-4 py-2.5 text-body leading-relaxed",
                    isMine ? "bg-primary text-white" : isAi ? "bg-primary-tint text-ink" : "bg-background text-ink",
                  )}
                >
                  {m.attachmentUrl && m.attachmentType && (
                    <ChatAttachmentView url={m.attachmentUrl} type={m.attachmentType} name={m.attachmentName} />
                  )}
                  {m.content && <span>{m.content}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply box */}
      <form onSubmit={submit} className="flex flex-col gap-2 rounded-card border border-hairline bg-surface p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب رسالتك لفريق الدعم…"
          className="min-h-20 w-full rounded-control border border-hairline bg-surface px-3.5 py-2.5 text-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
