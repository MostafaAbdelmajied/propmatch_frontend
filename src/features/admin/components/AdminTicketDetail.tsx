"use client";

import { Button } from "@/src/components/ui/Button";
import { SelectField } from "@/src/components/ui/Field";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { ErrorState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { ticketStatusLabels, type TicketStatus } from "@/src/lib/api/contracts/support";
import { cn } from "@/src/utils/cn";
import { formatRelativeTime } from "@/src/utils/format";
import { ArrowRight, Bot, Send, StickyNote, User as UserIcon, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTicket, useTicketActions } from "../hooks/useTickets";
import { AttachmentBar, type PendingAttachment } from "@/src/features/messages/components/AttachmentBar";
import { ChatAttachmentView } from "@/src/features/messages/components/ChatAttachmentView";

const statuses: TicketStatus[] = ["new", "assigned", "in_progress", "waiting", "closed"];

export function AdminTicketDetail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { data: ticket, isLoading, isError, refetch } = useTicket(id);
  const { reply, assign, setStatus } = useTicketActions(id);
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const [pending, setPending] = useState<PendingAttachment | null>(null);

  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (isLoading || !ticket) return <Skeleton className="h-96 w-full" />;

  const canSend = Boolean(text.trim() || pending);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    reply.mutate(
      {
        content: text.trim() || undefined,
        internal,
        attachmentUrl: pending?.url,
        attachmentType: pending?.type,
        attachmentName: pending?.name,
        attachmentDurationMs: pending?.durationMs,
      },
      {
        onSuccess: () => {
          setText("");
          setPending(null);
          toast("success", internal ? "تم حفظ الملاحظة الداخلية" : "تم إرسال الرد للعميل");
        },
      },
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.push("/admin/support")}>
          <ArrowRight className="size-4" aria-hidden />
          رجوع
        </Button>
        <div className="flex items-center gap-2">
          {!ticket.assignedAdminId && (
            <Button size="sm" variant="secondary" loading={assign.isPending} onClick={() => assign.mutate()}>
              <UserPlus className="size-4" aria-hidden />
              تعيين لي
            </Button>
          )}
          <SelectField
            aria-label="حالة التذكرة"
            options={statuses.map((s) => ({ value: s, label: ticketStatusLabels[s] }))}
            value={ticket.status?.toLowerCase()}
            disabled={setStatus.isPending}
            onChange={(e) => setStatus.mutate(e.target.value as TicketStatus)}
            className="w-40 min-w-[150px]"
          />
        </div>
      </div>

      <div className="rounded-card border border-hairline bg-surface p-4">
        <h1 className="text-title font-bold text-ink">{ticket.subject}</h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-caption text-muted">
          <UserIcon className="size-3" aria-hidden />
          {ticket.userName}
          {ticket.assignedAdminName && <span>· معيّن لـ {ticket.assignedAdminName}</span>}
        </p>
      </div>

      {/* Thread */}
      <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4">
        {ticket.messages.map((m) => {
          const authorVal = String(m.authorType || m.author || "").toLowerCase();
          const isUser = authorVal === "user";
          const isAdmin = authorVal === "admin";
          const isAi = authorVal === "ai";
          const timestamp = m.createdAt || m.at || new Date().toISOString();

          return (
            <div key={m.id} className={cn("flex", isUser ? "justify-start" : "justify-end")}>
              <div className={cn("flex max-w-[85%] flex-col gap-1", isUser ? "items-start" : "items-end")}>
                <span className="flex items-center gap-1 text-caption text-muted">
                  {isAi ? <Bot className="size-3" aria-hidden /> : <UserIcon className="size-3" aria-hidden />}
                  {m.authorName}
                  {m.internal && <span className="rounded bg-pending-tint px-1 text-pending">ملاحظة داخلية</span>}
                  <span>· {formatRelativeTime(timestamp)}</span>
                </span>
                <div
                  className={cn(
                    "flex flex-col gap-2 whitespace-pre-line rounded-card px-4 py-2.5 text-body leading-relaxed",
                    m.internal
                      ? "border border-dashed border-pending/40 bg-pending-tint/40 text-ink"
                      : isUser
                        ? "bg-background text-ink"
                        : isAdmin
                          ? "bg-primary text-white"
                          : "bg-primary-tint text-ink",
                  )}
                >
                  {m.attachmentUrl && m.attachmentType && (
                    <ChatAttachmentView url={m.attachmentUrl} type={m.attachmentType} name={m.attachmentName} durationMs={m.attachmentDurationMs} />
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
          placeholder={internal ? "اكتب ملاحظة داخلية (لا تظهر للعميل)…" : "اكتب ردك للعميل…"}
          className="min-h-20 w-full rounded-control border border-hairline bg-surface px-3.5 py-2.5 text-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <AttachmentBar pending={pending} onChange={setPending} disabled={reply.isPending} />
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-1.5 text-small text-body-text">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="size-4 accent-primary" />
            <StickyNote className="size-4 text-muted" aria-hidden />
            ملاحظة داخلية
          </label>
          <Button type="submit" loading={reply.isPending} disabled={!canSend}>
            <Send className="size-4 rtl:-scale-x-100" aria-hidden />
            {internal ? "حفظ الملاحظة" : "إرسال الرد"}
          </Button>
        </div>
      </form>
    </div>
  );
}
