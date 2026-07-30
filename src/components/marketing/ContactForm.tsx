"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, Check, Send } from "lucide-react";

interface ContactFormProps {
  destination: string;
}

export function ContactForm({ destination }: ContactFormProps) {
  const [prepared, setPrepared] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const subject = String(formData.get("subject") ?? "رسالة من الموقع");
    const message = String(formData.get("message") ?? "");
    const body = [`الاسم: ${name}`, `البريد: ${email}`, "", message].join("\n");

    setPrepared(true);
    window.location.href = `mailto:${destination}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-hero-ink/8 bg-white p-6 shadow-2xl shadow-hero-ink/8 sm:p-9"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-bold text-hero-ink">
          <span>الاسم</span>
          <input
            required
            name="name"
            autoComplete="name"
            placeholder="اكتب اسمك"
            className="min-h-13 w-full rounded-xl border border-landing-muted/25 bg-white px-4 font-medium outline-none transition focus:border-landing-teal focus:ring-4 focus:ring-landing-teal/10"
          />
        </label>
        <label className="space-y-2 text-sm font-bold text-hero-ink">
          <span>البريد الإلكتروني</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            dir="ltr"
            placeholder="name@example.com"
            className="min-h-13 w-full rounded-xl border border-landing-muted/25 bg-white px-4 text-right font-medium outline-none transition focus:border-landing-teal focus:ring-4 focus:ring-landing-teal/10"
          />
        </label>
      </div>

      <label className="mt-5 block space-y-2 text-sm font-bold text-hero-ink">
        <span>موضوع الرسالة</span>
        <input
          required
          name="subject"
          placeholder="كيف يمكننا مساعدتك؟"
          className="min-h-13 w-full rounded-xl border border-landing-muted/25 bg-white px-4 font-medium outline-none transition focus:border-landing-teal focus:ring-4 focus:ring-landing-teal/10"
        />
      </label>

      <label className="mt-5 block space-y-2 text-sm font-bold text-hero-ink">
        <span>رسالتك</span>
        <textarea
          required
          name="message"
          rows={6}
          placeholder="اكتب تفاصيل رسالتك هنا..."
          className="w-full resize-none rounded-xl border border-landing-muted/25 bg-white px-4 py-3 font-medium leading-7 outline-none transition focus:border-landing-teal focus:ring-4 focus:ring-landing-teal/10"
        />
      </label>

      <button
        type="submit"
        className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-linear-to-l from-landing-teal to-landing-mid px-6 font-black text-white shadow-lg shadow-landing-mid/15 transition-all hover:-translate-y-0.5 hover:from-landing-mid hover:to-hero-ink"
      >
        {prepared ? (
          <>
            <Check className="size-5" aria-hidden />
            تم تجهيز الرسالة
          </>
        ) : (
          <>
            <Send className="size-5" aria-hidden />
            إرسال الرسالة
            <ArrowLeft className="size-4" aria-hidden />
          </>
        )}
      </button>
      <p className="mt-4 text-center text-xs leading-6 text-landing-muted">
        عند الإرسال سيفتح تطبيق البريد لديك برسالة جاهزة إلى فريق بروب ماتش.
      </p>
    </form>
  );
}
