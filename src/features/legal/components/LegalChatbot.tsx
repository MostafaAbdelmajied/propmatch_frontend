"use client";

import { streamPost } from "@/src/lib/api/browserClient";
import type { ChatMessage } from "@/src/lib/api/contracts/support";
import { cn } from "@/src/utils/cn";
import { MessageCircle, Scale, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LegalMarkdown } from "./LegalMarkdown";

const examples = [
  "ما هي مدة الإخطار قبل إنهاء العقد؟",
  "هل يحق للمالك زيادة الإيجار سنويًا؟",
  "ما حقوقي كمستأجر عند تأخر الصيانة؟",
];

function makeUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function LegalChatbot({ }: { onBack?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  /**
   * PRO-17: the answer streams in. The assistant bubble is appended empty and
   * filled token by token, so `typing` only covers the wait before the first
   * token — after that the growing text is the progress indicator.
   */
  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setInput("");

    const replyId = makeUniqueId("legal_reply");
    setMessages((m) => [
      ...m,
      { id: makeUniqueId("user_msg"), role: "user", content: trimmed },
    ]);
    setTyping(true);

    let started = false;
    try {
      const done = await streamPost(
        "legal-chat/stream",
        { message: trimmed },
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
      // `declined` only arrives with the terminal chunk, so the off-topic
      // styling is applied once the answer is complete (SRS 3.3).
      setMessages((m) =>
        m.map((msg) => (msg.id === replyId ? { ...msg, declined: done.declined } : msg)),
      );
    } catch {
      setMessages((m) => [
        ...m.filter((msg) => msg.id !== replyId || msg.content),
        { id: makeUniqueId("legal_reply"), role: "assistant", content: "تعذر الاتصال، حاول مرة أخرى." },
      ]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-2xl flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-tint text-primary">
          <Scale className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-title font-bold text-ink">المساعد القانوني</h1>
          <p className="text-caption text-muted">أسئلة الإيجار والقانون العقاري في مصر</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-card border border-hairline bg-surface p-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <MessageCircle className="size-10 text-muted" aria-hidden />
            <p className="text-small text-muted">
              اسأل عن أي شيء يخص الإيجار والقانون العقاري في مصر
            </p>
            <div className="flex flex-col gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  className="rounded-pill border border-hairline px-4 py-1.5 text-small text-body-text hover:border-primary hover:text-primary"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}
          >
            <div
              className={cn(
                "min-w-0 max-w-[85%] wrap-break-word rounded-card px-4 py-2.5 text-body leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-white"
                  : m.declined
                    ? "bg-pending-tint text-body-text"
                    : "bg-background text-ink",
              )}
            >
              {m.role === "assistant" ? <LegalMarkdown content={m.content} /> : m.content}
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex justify-end">
            <div className="flex gap-1 rounded-card bg-background px-4 py-3">
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك…"
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
  );
}
