import type { Metadata } from "next";
import {
  ArrowLeft,
  Compass,
  HeartHandshake,
  Home,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { MarketingFooter } from "@/src/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/src/components/marketing/MarketingHeader";

export const metadata: Metadata = {
  title: "من نحن | بروب ماتش",
  description: "تعرف على قصة بروب ماتش ورؤيتنا لجعل البحث عن بيت في مصر أوضح وأكثر أمانًا وراحة.",
};

const values = [
  {
    Icon: HeartHandshake,
    title: "الإنسان أولًا",
    text: "نبدأ من يومك واحتياجاتك الحقيقية، لا من عدد الإعلانات التي يمكننا عرضها.",
  },
  {
    Icon: ShieldCheck,
    title: "الثقة بالوضوح",
    text: "نصمم كل خطوة لتعرف مع من تتعامل، وما الذي يحدث، وما الذي ستوافق عليه.",
  },
  {
    Icon: Compass,
    title: "تقنية تقرّبك",
    text: "نستخدم التقنية لتقصير الطريق إلى القرار المناسب، مع بقاء الاختيار في يدك.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-landing-canvas text-hero-ink">
      <MarketingHeader />

      <section className="relative isolate px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-32 lg:pt-28">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute -right-24 -top-32 size-120 rounded-full bg-landing-teal/12 blur-3xl" />
          <div className="absolute -bottom-44 left-1/4 size-105 rounded-full bg-mist/80 blur-3xl" />
          <div className="landing-grid absolute inset-0 opacity-[0.05]" />
        </div>

        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-landing-teal/15 bg-landing-teal/7 px-4 py-2 text-sm font-black text-landing-teal">
              <UsersRound className="size-4" aria-hidden />
              قصتنا بدأت من تجربة نعرفها كلنا
            </span>
            <h1 className="mt-7 text-4xl font-black leading-[1.35] tracking-tight text-hero-ink sm:text-6xl lg:text-7xl">
              نريد أن يصبح البحث عن بيت
              <span className="mt-2 block bg-linear-to-l from-landing-teal to-landing-mid bg-clip-text text-transparent">
                بداية مطمئنة، لا رحلة مرهقة.
              </span>
            </h1>
            <p className="mt-8 max-w-3xl text-lg font-medium leading-9 text-landing-mid sm:text-xl">
              بروب ماتش منصة مصرية بدأت من المنصورة بعد أن شاهدنا نفس المشكلة تتكرر: بحث طويل،
              إعلانات غير واضحة، ووسطاء يجعلون الوصول إلى البيت أصعب مما يجب.
            </p>
          </div>

          <div className="mt-16 grid overflow-hidden rounded-[2.25rem] border border-hero-ink/8 bg-white shadow-2xl shadow-hero-ink/8 lg:grid-cols-2">
            <div className="relative min-h-96 overflow-hidden bg-linear-to-br from-hero-ink via-landing-mid to-landing-teal p-8 text-white sm:p-12">
              <div
                className="absolute -left-20 -top-20 size-64 rounded-full border-50 border-white/8"
                aria-hidden
              />
              <div
                className="absolute -bottom-24 -right-20 size-72 rounded-full bg-white/8 blur-2xl"
                aria-hidden
              />
              <div className="relative flex h-full flex-col justify-between">
                <span className="flex size-16 items-center justify-center rounded-2xl bg-white/12">
                  <Home className="size-7" aria-hidden />
                </span>
                <div className="mt-20">
                  <p className="text-sm font-black text-white/65">لماذا بروب ماتش؟</p>
                  <p className="mt-4 max-w-lg text-3xl font-black leading-[1.55] sm:text-4xl">
                    لأن البيت قرار يمس يومك وأمانك، ويستحق تجربة تحترم الاثنين.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 sm:p-12 lg:p-14">
              <p className="text-sm font-black text-landing-teal">ما الذي نبنيه؟</p>
              <h2 className="mt-3 text-3xl font-black leading-[1.45] text-hero-ink">
                مساحة يلتقي فيها المستأجر والمالك بوضوح.
              </h2>
              <div className="mt-7 space-y-5 text-base leading-8 text-landing-muted">
                <p>
                  بدل أن تبدأ من مئات الإعلانات، تبدأ من احتياجاتك. نساعدك تشرح المكان الذي يناسب
                  حياتك، ثم نقرّب إليك الاختيارات الأكثر صلة.
                </p>
                <p>
                  ونساعد المالك أن يعرض عقاره بشكل منظم، ويصل إلى شخص جاد، مع تواصل واضح بين الأطراف
                  عبر المنصة.
                </p>
                <p>
                  هدفنا ليس أن تتخذ القرار أسرع فقط، بل أن تتخذه وأنت تفهمه وتشعر بالاطمئنان تجاهه.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-black text-landing-teal">القيم التي تقودنا</span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-hero-ink sm:text-5xl">
              كل قرار في المنتج يبدأ من هنا.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {values.map(({ Icon, title, text }) => (
              <article
                key={title}
                className="rounded-[1.75rem] border border-hero-ink/8 bg-white p-7 transition-all hover:-translate-y-2 hover:shadow-xl hover:shadow-landing-teal/8 sm:p-8"
              >
                <span className="flex size-14 items-center justify-center rounded-2xl bg-mist text-landing-teal">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-6 text-xl font-black text-hero-ink">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-landing-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <div className="relative mx-auto grid max-w-7xl overflow-hidden rounded-[2.25rem] bg-mist lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-8 sm:p-12 lg:p-16">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-landing-teal">
              <Target className="size-6" aria-hidden />
            </span>
            <p className="mt-8 text-sm font-black text-landing-teal">رؤيتنا</p>
            <h2 className="mt-3 text-3xl font-black leading-[1.5] text-hero-ink sm:text-4xl">
              سوق إيجار يعرف فيه كل طرف ما يحتاجه وما الذي يوافق عليه.
            </h2>
          </div>
          <div className="flex items-center bg-white/65 p-8 sm:p-12 lg:p-16">
            <p className="max-w-2xl text-lg leading-9 text-landing-mid">
              نبدأ من المنصورة، لكن طموحنا أكبر: أن يصبح الوصول إلى بيت مناسب في مصر تجربة مباشرة،
              موثوقة، وإنسانية. مكان لا تضيع فيه بين الإعلانات، ولا تدفع مقابل طبقات لا تحتاجها.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-linear-to-l from-landing-teal via-landing-mid to-hero-ink px-6 py-16 text-center text-white sm:px-12 lg:py-20">
          <h2 className="text-3xl font-black sm:text-5xl">تعالَ نبني تجربة إيجار أوضح.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">
            سواء كنت تبحث عن بيت أو تريد عرض عقارك، خطوتك الأولى تبدأ من هنا.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-white px-8 font-black text-hero-ink transition-transform hover:-translate-y-1"
            >
              ابدأ مجانًا
              <ArrowLeft className="size-5" aria-hidden />
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-8 font-black text-white transition-colors hover:bg-white/20"
            >
              تحدث معنا
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
