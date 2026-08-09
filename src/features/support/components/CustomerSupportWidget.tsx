"use client";

import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { streamPost } from "@/src/lib/api/browserClient";
import { ticketStatusLabels, type ChatMessage, type TicketStatus } from "@/src/lib/api/contracts/support";
import { cn } from "@/src/utils/cn";
import { formatRelativeTime } from "@/src/utils/format";
import { AlertTriangle, Bot, ChevronLeft, Clock, Headset, MessageSquare, Send, UserCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCreateSupportTicket, useMyTickets, useUserTicketDetail, useUserTicketReply } from "../hooks/useUserSupport";

const statusTone: Record<string, string> = {
  NEW: "bg-trust-blue-tint text-trust-blue",
  ASSIGNED: "bg-primary-tint text-primary",
  IN_PROGRESS: "bg-pending-tint text-pending",
  WAITING: "bg-background text-muted",
  CLOSED: "bg-success-tint text-success",
  new: "bg-trust-blue-tint text-trust-blue",
  assigned: "bg-primary-tint text-primary",
  in_progress: "bg-pending-tint text-pending",
  waiting: "bg-background text-muted",
  closed: "bg-success-tint text-success",
};

function makeUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function analyzeSentiment(message: string): { isFrustrated: boolean; score: number } {
  const angryKeywords = [
    "نصابين", "سيء جدا", "خدمة زبالة", "خصمتم", "اشتكي", "احتيال", "مشكلة كبيرة", "غير مقبول", "أين الدعم"
  ];
  let score = 0;
  for (const word of angryKeywords) {
    if (message.includes(word)) score += 0.35;
  }
  return { isFrustrated: score >= 0.7, score: Math.min(score, 1.0) };
}

export function CustomerSupportWidget() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"ai_chat" | "my_tickets">("ai_chat");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // AI Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [frustrated, setFrustrated] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const createTicket = useCreateSupportTicket();
  const myTickets = useMyTickets();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function sendAiMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setInput("");

    // Check sentiment
    const sentiment = analyzeSentiment(trimmed);
    if (sentiment.isFrustrated) {
      setFrustrated(true);
    }

    const replyId = makeUniqueId("ai_reply");
    const clientRequestId = crypto.randomUUID();
    setMessages((m) => [...m, { id: makeUniqueId("user_msg"), role: "user", content: trimmed }]);
    setTyping(true);

    let started = false;
    try {
      const done = await streamPost(
        "support/ai-chat/stream",
        {
          message: trimmed,
          clientRequestId,
          history: messages.map(({ role, content }) => ({ role, content })),
        },
        {
          onToken: (token) => {
            if (!started) {
              started = true;
              setTyping(false);
              setMessages((m) => [...m, { id: replyId, role: "assistant", content: "" }]);
            }
            setMessages((m) =>
              m.map((msg) => (msg.id === replyId ? { ...msg, content: msg.content + token } : msg)),
            );
          },
        },
      );
      setMessages((m) => m.map((msg) => (msg.id === replyId ? { ...msg, declined: done.declined } : msg)));
      if (done.escalated) {
        setFrustrated(false);
        toast("success", "تم إنشاء تذكرة دعم تلقائياً وسيتم التواصل معك قريباً.");
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: replyId,
          role: "assistant",
          content: "أنا المساعد الآلي لخدمة العملاء. كيف يمكنني مساعدتك اليوم؟ إذا كنت ترغب في التحدث مع موظف دعم فني، انقر على زر التحويل أدناه.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  }

  function handleEscalateToHuman() {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "استفسار خدمة العملاء";
    createTicket.mutate(
      {
        subject: lastUserMsg.slice(0, 50),
        initialMessage: lastUserMsg,
      },
      {
        onSuccess: (ticket) => {
          toast("success", "تم إنشاء التذكرة وتحويلك لموظف الدعم الفني");
          setSelectedTicketId(ticket.id);
          setActiveTab("my_tickets");
        },
      },
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-3xl flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary-tint text-primary">
            <Headset className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-title font-bold text-ink">الدعم الفني وخدمة العملاء</h1>
            <p className="text-caption text-muted">مساعدك الذكي والتواصل المباشر مع موظفي الدعم</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-pill border border-hairline bg-surface p-1">
          <button
            onClick={() => {
              setActiveTab("ai_chat");
              setSelectedTicketId(null);
            }}
            className={cn(
              "rounded-pill px-3.5 py-1 text-caption font-bold transition-colors",
              activeTab === "ai_chat" ? "bg-primary text-white" : "text-muted hover:text-ink",
            )}
          >
            المساعد الذكي
          </button>
          <button
            onClick={() => setActiveTab("my_tickets")}
            className={cn(
              "rounded-pill px-3.5 py-1 text-caption font-bold transition-colors",
              activeTab === "my_tickets" ? "bg-primary text-white" : "text-muted hover:text-ink",
            )}
          >
            تذاكري ({myTickets.data?.items.length ?? 0})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "ai_chat" ? (
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          {/* Sentiment Frustration Alert */}
          {frustrated && (
            <div className="flex items-center justify-between gap-3 rounded-card border border-error/30 bg-error-tint p-3 text-error">
              <div className="flex items-center gap-2 text-small font-bold">
                <AlertTriangle className="size-4 shrink-0" />
                يبدو أنك تواجه مشكلة هامة! يمكنك التحويل مباشرة لموظف دعم فني.
              </div>
              <Button size="sm" variant="primary" loading={createTicket.isPending} onClick={handleEscalateToHuman}>
                تحدث مع موظف
              </Button>
            </div>
          )}

          {/* AI Message Thread */}
          <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-card border border-hairline bg-surface p-4">
            {messages.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <Bot className="size-12 text-primary" aria-hidden />
                <div>
                  <h3 className="text-body font-bold text-ink">مرحباً بك في خدمة عملاء PropMatch</h3>
                  <p className="mt-1 text-small text-muted">اسأل المساعد الآلي عن أي استفسار تخص المنصة أو العقود</p>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-card px-4 py-2.5 text-body leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-white"
                      : "bg-background text-ink border border-hairline",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-end">
                <div className="flex gap-1 rounded-card bg-background px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Controls & Input */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-caption text-muted">هل تحتاج مساعدة بشرية؟</span>
              <button
                onClick={handleEscalateToHuman}
                className="flex items-center gap-1 text-caption font-bold text-primary hover:underline"
              >
                <UserCheck className="size-3.5" />
                تحويل لموظف الدعم
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendAiMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب رسالتك للمساعد الذكي…"
                className="flex-1 rounded-pill border border-hairline bg-surface px-4 py-2.5 text-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
                aria-label="إرسال"
              >
                <Send className="size-5 rtl:-scale-x-100" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      ) : selectedTicketId ? (
        <UserTicketThread id={selectedTicketId} onBack={() => setSelectedTicketId(null)} />
      ) : (
        <UserTicketsList onSelectTicket={(id) => setSelectedTicketId(id)} />
      )}
    </div>
  );
}

function UserTicketsList({ onSelectTicket }: { onSelectTicket: (id: string) => void }) {
  const { data, isLoading, isError } = useMyTickets();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !data || data.items.length === 0) {
    return (
      <EmptyState
        Icon={MessageSquare}
        title="لا توجد تذاكر دعم مفتوحة"
        description="عند تحويلك لموظف دعم فني ستظهر تذاكرك هنا لمتابعة الحل."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.items.map((t) => (
        <li key={t.id}>
          <button
            onClick={() => onSelectTicket(t.id)}
            className="flex w-full items-center justify-between gap-3 rounded-card border border-hairline bg-surface p-4 text-start shadow-card hover:border-primary/40"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-pill px-2 py-0.5 text-caption font-bold", statusTone[t.status])}>
                  {ticketStatusLabels[t.status]}
                </span>
                <span className="text-small font-bold text-ink">{t.subject}</span>
              </div>
              <p className="mt-1 text-caption text-muted">
                تاريخ الإنشاء: {formatRelativeTime(t.createdAt)}
              </p>
            </div>
            <span className="flex items-center gap-1 text-caption text-muted">
              <Clock className="size-3" />
              {formatRelativeTime(t.lastMessageAt)}
              <ChevronLeft className="size-4" />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function UserTicketThread({ id, onBack }: { id: string; onBack: () => void }) {
  const toast = useToast();
  const { data: ticket, isLoading, isError } = useUserTicketDetail(id);
  const reply = useUserTicketReply(id);
  const [text, setText] = useState("");

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !ticket) return <div>تعذر تحميل التذكرة.</div>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    reply.mutate(
      { content: text.trim() },
      {
        onSuccess: () => {
          setText("");
          toast("success", "تم إرسال ردك لموظف الدعم");
        },
      },
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between border-b border-hairline pb-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← العودة للتذاكر
        </Button>
        <span className={cn("rounded-pill px-2.5 py-0.5 text-caption font-bold", statusTone[ticket.status as TicketStatus])}>
          {ticketStatusLabels[ticket.status as TicketStatus]}
        </span>
      </div>

      <div className="rounded-card border border-hairline bg-surface p-3">
        <h2 className="text-small font-bold text-ink">{ticket.subject}</h2>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-card border border-hairline bg-surface p-3">
        {ticket.messages.map((m) => {
          const authorVal = String(m.authorType || m.author || "").toLowerCase();
          const isUser = authorVal === "user";
          const timestamp = m.createdAt || m.at || new Date().toISOString();

          return (
            <div key={m.id} className={cn("flex", isUser ? "justify-start" : "justify-end")}>
              <div className={cn("flex max-w-[85%] flex-col gap-1", isUser ? "items-start" : "items-end")}>
                <span className="text-caption text-muted">
                  {m.authorName} · {formatRelativeTime(timestamp)}
                </span>
                <div
                  className={cn(
                    "rounded-card px-4 py-2 text-body",
                    isUser ? "bg-primary text-white" : "bg-background text-ink border border-hairline",
                  )}
                >
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {ticket.status !== "closed" ? (
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب رداً لموظف الدعم…"
            className="flex-1 rounded-pill border border-hairline bg-surface px-4 py-2 text-body focus:border-primary focus:outline-none"
          />
          <Button type="submit" loading={reply.isPending} disabled={!text.trim()}>
            إرسال
          </Button>
        </form>
      ) : (
        <div className="rounded-card bg-background p-3 text-center text-caption text-muted">
          تم إغلاق هذه التذكرة.
        </div>
      )}
    </div>
  );
}
