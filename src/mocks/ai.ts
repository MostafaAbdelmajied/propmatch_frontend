/**
 * The mock's "AI" responses (PRO-10 optimizer, PRO-17 legal chatbot).
 *
 * Lives apart from router.ts because two transports serve the same answers —
 * the buffered JSON endpoints and the SSE stream. Keeping the text here means
 * the streamed answer and the non-streamed one cannot drift.
 *
 * In the real build this is the backend's LLM + ChromaDB RAG. Note the ID
 * images are never sent to any model (a non-negotiable): nothing in this file
 * touches verification data.
 */

/** Cheap stand-in for the RAG relevance guard (SRS 3.3). */
const LEGAL_KEYWORDS = [
  "إيجار", "عقد", "قانون", "مالك", "مستأجر", "إخلاء", "شقة", "عقار",
  "تأمين", "زيادة", "فسخ", "إخطار", "محكمة", "ملكية",
];

export interface LegalAnswer {
  content: string;
  declined: boolean;
}

export function legalAnswer(message: string): LegalAnswer {
  const onTopic = LEGAL_KEYWORDS.some((k) => message.includes(k));
  if (!onTopic) {
    return {
      content: "أقدر أساعدك فقط في أسئلة الإيجار والقانون العقاري في مصر.",
      declined: true,
    };
  }
  return {
    content:
      "وفقًا للقانون المدني المصري وقانون الإيجار الجديد (القانون رقم 4 لسنة 1996)، العلاقة الإيجارية للعقود الجديدة تحكمها بنود العقد المتفق عليها بين الطرفين. " +
      "بشكل عام: مدة الإخطار قبل إنهاء العقد تكون حسب المتفق عليه في العقد، وإذا لم يُنص عليها فتُطبق أحكام القانون المدني. " +
      "ملاحظة: هذه معلومات إرشادية وليست استشارة قانونية ملزمة — يُنصح بمراجعة محامٍ للحالات الخاصة.",
    declined: false,
  };
}

export function optimizedDescription(description: string): string {
  return `${description.trim()}\n\nفرصة مميزة لن تتكرر! وحدة بموقع استراتيجي وتشطيبات عالية الجودة، على بعد خطوات من الخدمات والمواصلات. تعامل مباشر مع المالك — بدون وسطاء وبدون عمولة.`;
}

/**
 * Split a finished answer into plausible token-ish chunks so the SSE endpoint
 * can emit it progressively. The real backend streams the model's actual
 * tokens; the *shape* the client consumes is identical, which is the point —
 * only this function is a lie, not the transport.
 */
export function* tokenize(text: string): Generator<string> {
  // Keep whitespace attached to the preceding word so the client can naively
  // concatenate chunks without re-inserting spaces.
  const parts = text.match(/\S+\s*/g) ?? [];
  for (const part of parts) yield part;
}
