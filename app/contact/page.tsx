import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Send } from "lucide-react";
import { ContactForm } from "@/src/components/marketing/ContactForm";
import { MarketingFooter } from "@/src/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/src/components/marketing/MarketingHeader";
import { contactEmail } from "@/src/components/marketing/marketingLinks";
import { SocialLinks } from "@/src/components/marketing/SocialLinks";

export const metadata: Metadata = {
  title: "تواصل معنا | بروب ماتش",
  description: "تواصل مع فريق بروب ماتش للاستفسارات والمقترحات والشراكات. نحن هنا لنسمعك ونساعدك.",
};

const contactCards = [
  {
    Icon: Mail,
    title: "راسلنا",
    text: contactEmail,
    href: `mailto:${contactEmail}`,
    dir: "ltr" as const,
  },
  {
    Icon: MapPin,
    title: "نبدأ من",
    text: "المنصورة، مصر",
    href: undefined,
    dir: undefined,
  },
  {
    Icon: Clock,
    title: "وقت الرد",
    text: "خلال يوم عمل",
    href: undefined,
    dir: undefined,
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-landing-canvas text-hero-ink">
      <MarketingHeader />

      <section className="relative isolate px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-32 lg:pt-28">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute -right-28 -top-32 size-120 rounded-full bg-landing-teal/12 blur-3xl" />
          <div className="absolute -bottom-48 left-1/4 size-120 rounded-full bg-mist/75 blur-3xl" />
          <div className="landing-grid absolute inset-0 opacity-[0.05]" />
        </div>

        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-landing-teal/15 bg-landing-teal/7 px-4 py-2 text-sm font-black text-landing-teal">
              <MessageCircle className="size-4" aria-hidden />
              نحب أن نسمع منك
            </span>
            <h1 className="mt-7 text-4xl font-black leading-[1.35] tracking-tight text-hero-ink sm:text-6xl">
              عندك سؤال، فكرة،
              <span className="mt-1 block bg-linear-to-l from-landing-teal to-landing-mid bg-clip-text text-transparent">
                أو شيء نستطيع تحسينه؟
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-9 text-landing-mid">
              اكتب لنا براحتك. كل رسالة تساعدنا نفهم احتياجاتك ونبني تجربة أقرب لما تحتاجه فعلًا.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {contactCards.map(({ Icon, title, text, href, dir }) => (
              <article
                key={title}
                className="rounded-[1.5rem] border border-hero-ink/8 bg-white p-6 text-center shadow-card"
              >
                <span className="mx-auto flex size-13 items-center justify-center rounded-2xl bg-mist text-landing-teal">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-5 font-black text-hero-ink">{title}</h2>
                {href ? (
                  <a
                    href={href}
                    dir={dir}
                    className="mt-2 block text-sm font-bold text-landing-teal hover:underline"
                  >
                    {text}
                  </a>
                ) : (
                  <p className="mt-2 text-sm font-medium text-landing-muted">{text}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <div className="mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-[2rem] bg-linear-to-br from-hero-ink via-landing-mid to-landing-teal p-8 text-white sm:p-10">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/12">
              <Send className="size-6" aria-hidden />
            </span>
            <h2 className="mt-8 text-3xl font-black leading-[1.5]">
              رسالتك تصل إلى فريق يهتم بالتفاصيل.
            </h2>
            <p className="mt-5 leading-8 text-white/72">
              للاستفسارات العامة، المقترحات، التعاون، أو الشراكات. اشرح لنا ما تحتاجه وسنوجّه رسالتك
              للشخص المناسب.
            </p>

            <div className="mt-10 border-t border-white/15 pt-7">
              <p className="mb-4 text-sm font-black text-white/70">تابعنا وتواصل معنا</p>
              <SocialLinks inverted />
            </div>
          </aside>

          <ContactForm destination={contactEmail} />
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
