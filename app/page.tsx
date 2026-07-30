import { MarketingFooter } from "@/src/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/src/components/marketing/MarketingHeader";
import { landingAfterLogin } from "@/src/features/auth/roleRouting";
import { getServerSession } from "@/src/lib/api/serverSession";
import {
  ArrowLeft,
  ArrowUpLeft,
  BadgeCheck,
  Building2,
  Check,
  Compass,
  FileCheck2,
  HeartHandshake,
  Home,
  KeyRound,
  MapPin,
  MessageCircleMore,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

const steps = [
  {
    number: "٠١",
    Icon: MessageCircleMore,
    title: "احكِ لنا عن بيتك",
    text: "اكتب احتياجاتك بطريقتك: المنطقة، الميزانية، المساحة، وحتى التفاصيل الصغيرة.",
  },
  {
    number: "٠٢",
    Icon: WandSparkles,
    title: "نبحث بدلًا منك",
    text: "نرتّب لك الأماكن التي تناسب يومك فعلًا، بدل ساعات بين إعلانات لا تشبه ما طلبته.",
  },
  {
    number: "٠٣",
    Icon: KeyRound,
    title: "تواصل واستأجر",
    text: "تواصل مباشرة مع مالك موثّق، واتفقا بوضوح، ثم أنشئا عقدكما في مكان واحد.",
  },
];

const trust = [
  {
    Icon: UserRoundCheck,
    title: "هوية موثّقة",
    text: "نعرف من يقف خلف الإعلان قبل أن تبدأ التواصل.",
    tone: "bg-mist text-landing-teal",
  },
  {
    Icon: ShieldCheck,
    title: "تواصل أكثر أمانًا",
    text: "محادثات وعروض واضحة تحفظ تفاصيل الاتفاق.",
    tone: "bg-landing-teal/10 text-landing-teal",
  },
  {
    Icon: FileCheck2,
    title: "عقد بدون تعقيد",
    text: "حوّل الاتفاق إلى عقد إيجار منظم وجاهز للتحميل.",
    tone: "bg-hero-ink/8 text-hero-ink",
  },
];

const proof = [
  { value: "٠٪", label: "عمولة سمسار" },
  { value: "٣", label: "خطوات من البحث للعقد" },
  { value: "٢٤/٧", label: "مطابقة ذكية تعمل لأجلك" },
];

export default async function LandingPage() {
  const user = await getServerSession();
  if (user) redirect(landingAfterLogin(user.role));

  return (
    <main className="overflow-hidden bg-landing-canvas text-hero-ink">
      <MarketingHeader overlay />

      <section className="relative isolate min-h-190 bg-white pb-20 pt-32 lg:min-h-205 lg:pb-28 lg:pt-40">
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-32 top-32 size-105 rounded-full bg-landing-teal/12 blur-3xl" />
          <div className="absolute -bottom-56 left-[38%] size-130 rounded-full bg-landing-teal/10 blur-3xl" />
          <div className="landing-grid absolute inset-0 opacity-[0.06]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-landing-canvas to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <div className="landing-rise order-2 relative lg:order-1">
            <div className="relative mx-auto max-w-150">
              <div className="absolute -inset-3 rotate-2 rounded-[2.25rem] bg-linear-to-br from-landing-teal/18 via-landing-mid/12 to-hero-ink/8" />
              <div className="relative overflow-hidden rounded-4xl border border-hero-ink/8 bg-white p-2 shadow-2xl shadow-hero-ink/15">
                <div className="relative aspect-4/3 overflow-hidden rounded-[1.55rem]">
                  <Image
                    src="/images/landing-mansoura-home.webp"
                    alt="غرفة معيشة دافئة في منزل مصري حديث بإطلالة على المدينة"
                    fill
                    priority
                    sizes="(max-width: 1024px) 92vw, 47vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-hero-ink/75 via-transparent to-transparent" />

                  <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 sm:inset-x-6 sm:bottom-6">
                    <div className="max-w-72.5 rounded-2xl border border-white/20 bg-hero-ink/70 p-4 backdrop-blur-xl">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-white/70">
                        <MapPin className="size-3.5 text-white" aria-hidden />
                        حي الجامعة، المنصورة
                      </div>
                      <p className="text-base text-white font-extrabold sm:text-lg">
                        مكان ممكن تحس فيه إنك في بيتك
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-hero-ink">
                          تطابق ٩٤٪
                        </span>
                        <span className="text-xs text-white/70">٣ غرف  ١٤٠ م²</span>
                      </div>
                    </div>

                    <span className="hidden size-12 items-center justify-center rounded-full bg-linear-to-br from-landing-teal to-landing-mid text-white shadow-lg sm:flex">
                      <Home className="size-5" aria-hidden />
                    </span>
                  </div>
                </div>
              </div>

              <div className="landing-float absolute -left-2 top-7 hidden items-center gap-3 rounded-2xl border border-white/50 bg-white p-3 text-hero-ink shadow-xl sm:flex lg:-left-8">
                <span className="flex size-10 items-center justify-center rounded-xl bg-mist text-landing-teal">
                  <BadgeCheck className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-extrabold">مالك موثّق</p>
                  <p className="text-[11px] text-landing-muted">تواصل بثقة</p>
                </div>
              </div>

              <div className="landing-float-delayed absolute -right-2 -bottom-7 hidden items-center gap-3 rounded-2xl border border-hero-ink/8 bg-white px-4 py-3 text-hero-ink shadow-xl sm:flex lg:-right-8">
                <span className="flex size-10 items-center justify-center rounded-xl bg-landing-teal/10 text-landing-teal">
                  <Sparkles className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-extrabold">اختيارات تشبه يومك</p>
                  <p className="mt-0.5 text-[11px] font-bold text-landing-muted">
                    مش مجرد نتائج بحث
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-rise-delayed order-1 max-w-2xl lg:order-2">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-landing-teal/12 bg-landing-teal/7 px-4 py-2 text-sm font-bold text-landing-teal">
              <Sparkles className="size-4" aria-hidden />
              من أول بحث لحد المفتاح — إحنا معاك
            </span>

            <h1 className="text-[2.75rem] font-black leading-tight tracking-[-0.04em] text-hero-ink sm:text-6xl lg:text-[4.35rem]">
              مش مجرد شقة.
              <span className="relative mt-1 block w-fit bg-linear-to-l from-landing-teal to-landing-mid bg-clip-text text-transparent">
                ده مكان هتعيش فيه.
                <svg
                  className="absolute -bottom-2 right-0 h-3 w-full text-landing-teal/30"
                  viewBox="0 0 320 14"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path
                    d="M3 10C79 2 222 2 317 8"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg font-medium leading-9 text-landing-mid sm:text-xl">
              علشان البيت مش عدد غرف وسعر وبس. هو مشوارك كل يوم، هدوءك آخر الليل، والمكان اللي لازم
              تحس فيه بالأمان. احكِ لنا عن يومك، وإحنا نقرّبك من المكان المناسب.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-linear-to-l from-landing-teal to-landing-mid px-7 text-base font-black text-white shadow-xl shadow-landing-mid/20 transition-all hover:-translate-y-1 hover:from-landing-mid hover:to-hero-ink"
              >
                ابحث عن بيتك الآن
                <ArrowLeft
                  className="size-5 transition-transform group-hover:-translate-x-1"
                  aria-hidden
                />
              </Link>
              <Link
                href="/guest"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-hero-ink/12 bg-white px-7 text-base font-extrabold text-hero-ink shadow-sm transition-all hover:border-landing-teal/30 hover:bg-mist"
              >
                <Search className="size-5" aria-hidden />
                تصفّح العقارات
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-landing-muted">
              {["تسجيل مجاني", "بدون عمولة", "بياناتك في أمان"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-mist text-landing-teal">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6 lg:px-8"
        aria-label="مزايا سريعة"
      >
        <div className="grid overflow-hidden rounded-[1.75rem] border border-hero-ink/5 bg-white shadow-2xl shadow-hero-ink/10 sm:grid-cols-3">
          {proof.map((item, index) => (
            <div
              key={item.label}
              className={`flex items-center justify-center gap-4 px-6 py-6 text-center sm:py-7 ${
                index > 0 ? "border-t border-landing-muted/20 sm:border-r sm:border-t-0" : ""
              }`}
            >
              <strong className="text-3xl font-black text-landing-teal">{item.value}</strong>
              <span className="max-w-28 text-sm font-bold leading-6 text-landing-mid">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-black tracking-wide text-landing-teal">
            ببساطة كما يجب أن يكون
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-hero-ink sm:text-5xl">
            من «بدور على شقة» إلى «لقيتها»
          </h2>
          <p className="mt-5 text-base leading-8 text-landing-muted sm:text-lg">
            تجربة مبنية حول القرار الذي تريد أخذه، لا حول عدد الإعلانات التي تستطيع فتحها.
          </p>
        </div>

        <div className="relative mt-14 grid gap-5 lg:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-12 hidden border-t-2 border-dashed border-landing-teal/15 lg:block" />
          {steps.map(({ number, Icon, title, text }) => (
            <article
              key={number}
              className="group relative rounded-[1.75rem] border border-hero-ink/8 bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-landing-teal/10 sm:p-8"
            >
              <div className="relative z-10 mb-8 flex items-center justify-between">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-hero-ink text-white transition-transform group-hover:rotate-3 group-hover:scale-105">
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="text-4xl font-black text-landing-teal/12">{number}</span>
              </div>
              <h3 className="text-xl font-black text-hero-ink">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-landing-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="why-propmatch" className="relative bg-mist py-24 lg:py-32">
        <div
          className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-landing-teal/5 to-transparent"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="relative mx-auto w-full max-w-xl lg:order-2">
            <div className="absolute -inset-4 -rotate-2 rounded-4xl bg-landing-teal/8" />
            <div className="relative rounded-[1.75rem] border border-white bg-white p-4 shadow-2xl shadow-hero-ink/10">
              <div className="flex items-center justify-between border-b border-landing-muted/20 px-2 pb-4">
                <div>
                  <p className="text-xs font-bold text-landing-muted">مساعد بروب ماتش</p>
                  <p className="mt-1 font-black text-hero-ink">ما مواصفات بيتك؟</p>
                </div>
                <span className="flex size-11 items-center justify-center rounded-2xl bg-landing-teal text-white">
                  <Sparkles className="size-5" aria-hidden />
                </span>
              </div>

              <div className="space-y-3 px-2 py-5">
                <div className="mr-auto max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-7 text-landing-mid">
                  محتاجة شقة قريبة من الجامعة، غرفتين على الأقل، هادية وفيها بلكونة، والميزانية لحد
                  ٧٠٠٠ جنيه.
                </div>
                <div className="ml-auto flex max-w-[88%] items-start gap-3 rounded-2xl rounded-tr-sm bg-mist px-4 py-3">
                  <Sparkles className="mt-1 size-4 shrink-0 text-landing-teal" aria-hidden />
                  <p className="text-sm leading-7 text-hero-ink">
                    أكيد. البيت اللي يناسبك لازم يريح يومك، مش بس يناسب ميزانيتك. لذلك بدأت بالأماكن
                    القريبة من الجامعة، واهتممت بالهدوء والبلكونة زي ما طلبتِ.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-landing-muted/20 bg-white p-3 shadow-card">
                <div className="flex gap-3">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src="/images/landing-mansoura-home.webp"
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] font-black text-landing-teal">
                        تطابق ٩٤٪
                      </span>
                      <span className="text-xs font-black text-landing-teal">٦٬٥٠٠ ج.م</span>
                    </div>
                    <p className="mt-2 truncate text-sm font-extrabold text-hero-ink">
                      شقة هادئة بالقرب من الجامعة
                    </p>
                    <p className="mt-1 text-xs text-landing-muted">غرفتان · بلكونة · مالك موثّق</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:order-1">
            <span className="inline-flex items-center gap-2 text-sm font-black text-landing-teal">
              <ScanSearch className="size-5" aria-hidden />
              لأنك لا تبحث عن شقة فقط
            </span>
            <h2 className="mt-4 max-w-xl text-3xl font-black leading-[1.45] tracking-tight text-hero-ink sm:text-5xl">
              نسمع تفاصيل يومك، ونبحث عن مكان ترتاح فيه.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-landing-muted sm:text-lg">
              قربك من شغلك، هدوء الشارع، البلكونة التي تشرب فيها قهوتك — التفاصيل الصغيرة هي التي
              تصنع إحساس البيت. اكتبها بطريقتك، ونحن نضعها في قلب كل ترشيح.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                "اختيارات تحترم وقتك وميزانيتك",
                "نشرح لك لماذا قد ترتاح في هذا المكان",
                "القرار يظل لك دائمًا، بدون ضغط",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 font-bold text-landing-mid">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-landing-teal text-white">
                    <Check className="size-4" strokeWidth={3} aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/guest"
              className="group mt-9 inline-flex items-center gap-2 font-black text-landing-teal"
            >
              شوف إيه اللي يناسبك
              <ArrowLeft
                className="size-5 transition-transform group-hover:-translate-x-1"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </section>

      <section id="about-us" className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="relative mx-auto grid max-w-7xl overflow-hidden rounded-[2.25rem] border border-landing-teal/10 bg-linear-to-br from-mist via-white to-landing-teal/7 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative p-8 sm:p-12 lg:p-16">
            <span className="inline-flex items-center gap-2 text-sm font-black text-landing-teal">
              <HeartHandshake className="size-5" aria-hidden />
              عن بروب ماتش
            </span>
            <h2 className="mt-5 max-w-2xl text-3xl font-black leading-[1.45] tracking-tight text-hero-ink sm:text-5xl">
              بدأنا من مشكلة عاشها تقريبًا كل شخص بحث عن بيت.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-landing-mid sm:text-lg">
              بحث طويل، إعلانات مكررة، ومعلومات ناقصة تخليك غير مطمئن. شاهدنا هذا يتكرر في المنصورة،
              وفكرنا: لماذا لا يبدأ البحث عن بيت من الإنسان واحتياجاته بدل أن يبدأ من قائمة إعلانات؟
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-landing-muted">
              بروب ماتش ليس مجرد مكان لعرض العقارات. نحن نبني مساحة تساعد المستأجر أن يجد مكانًا
              يناسب حياته، وتساعد المالك أن يصل لشخص جاد يطمئن له — بوضوح، وبشكل مباشر، وبدون عمولة.
            </p>
          </div>

          <div className="grid gap-3 bg-white/60 p-6 sm:p-8 lg:p-10">
            {[
              {
                Icon: Compass,
                title: "مهمتنا",
                text: "أن نجعل الوصول إلى البيت المناسب أقصر، أوضح، وأقل توترًا.",
              },
              {
                Icon: UsersRound,
                title: "ما نؤمن به",
                text: "الثقة تبدأ عندما يعرف كل طرف مع من يتحدث وما الذي سيتفق عليه.",
              },
              {
                Icon: HeartHandshake,
                title: "ما نعد به",
                text: "أن تظل التقنية في خدمتك، وأن يظل القرار في يدك دائمًا.",
              },
            ].map(({ Icon, title, text }, index) => (
              <article
                key={title}
                className="flex items-start gap-4 rounded-2xl border border-hero-ink/7 bg-white p-5 shadow-sm"
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                    index === 1
                      ? "bg-landing-teal/10 text-landing-teal"
                      : "bg-mist text-landing-teal"
                  }`}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-black text-hero-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-7 text-landing-muted">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="text-sm font-black text-landing-teal">الثقة ليست شارة للتزيين</span>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-hero-ink sm:text-5xl">
              كل خطوة مصمّمة لتشعر أنك تعرف ما الذي يحدث.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-landing-muted sm:text-base">
            وضوح من أول إعلان، مرورًا بالتواصل والعروض، وحتى لحظة توقيع الاتفاق.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {trust.map(({ Icon, title, text, tone }) => (
            <article
              key={title}
              className="rounded-[1.75rem] border border-hero-ink/8 bg-white p-7"
            >
              <span className={`flex size-14 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-6 text-xl font-black text-hero-ink">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-landing-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="for-everyone" className="px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2.25rem] bg-hero-ink lg:grid-cols-2">
          <article className="group relative overflow-hidden border-b border-white/10 p-8 text-white sm:p-12 lg:border-b-0 lg:border-l">
            <div
              className="absolute -bottom-24 -left-24 size-72 rounded-full bg-landing-teal/30 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Search className="size-6" aria-hidden />
              </span>
              <p className="mt-8 text-sm font-black text-white/70">للمستأجر</p>
              <h3 className="mt-2 text-3xl font-black">اختيارات أقل. اختيارات أنسب.</h3>
              <p className="mt-4 max-w-lg leading-8 text-white/65">
                احفظ مفضلاتك، أرسل طلبك، استقبل عروضًا مناسبة، وتواصل مباشرة بدون طبقات من الوسطاء.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-white/75">
                <span className="rounded-full bg-white/8 px-4 py-2">بحث ذكي</span>
                <span className="rounded-full bg-white/8 px-4 py-2">عروض مباشرة</span>
                <span className="rounded-full bg-white/8 px-4 py-2">مفضلة منظمة</span>
              </div>
              <Link
                href="/signup"
                className="mt-9 inline-flex items-center gap-2 font-black text-white"
              >
                أبحث عن بيت
                <ArrowUpLeft
                  className="size-5 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1"
                  aria-hidden
                />
              </Link>
            </div>
          </article>

          <article className="group relative overflow-hidden bg-mist p-8 text-hero-ink sm:p-12">
            <div
              className="absolute -left-16 -top-16 size-56 rounded-full bg-landing-teal/12 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white/70 text-landing-teal">
                <Building2 className="size-6" aria-hidden />
              </span>
              <p className="mt-8 text-sm font-black text-landing-teal">للمالك</p>
              <h3 className="mt-2 text-3xl font-black">اعرض عقارك لمن يبحث عنه.</h3>
              <p className="mt-4 max-w-lg leading-8 text-landing-mid">
                أنشئ إعلانًا احترافيًا، استقبل طلبات جادة، أرسل عروضك، وتابع الاتفاق من لوحة واحدة.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-landing-mid">
                <span className="rounded-full bg-white/65 px-4 py-2">إعلان منظّم</span>
                <span className="rounded-full bg-white/65 px-4 py-2">طلبات جادة</span>
                <span className="rounded-full bg-white/65 px-4 py-2">عقد جاهز</span>
              </div>
              <Link
                href="/signup"
                className="mt-9 inline-flex items-center gap-2 font-black text-landing-teal"
              >
                أعرض عقاري
                <ArrowUpLeft
                  className="size-5 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1"
                  aria-hidden
                />
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-linear-to-l from-landing-teal via-landing-mid to-hero-ink px-6 py-16 text-center text-white sm:px-12 lg:py-20">
          <div
            className="absolute -right-28 -top-28 size-80 rounded-full border-60 border-white/10"
            aria-hidden
          />
          <div
            className="absolute -bottom-32 -left-20 size-80 rounded-full bg-hero-ink/10"
            aria-hidden
          />
          <div className="relative mx-auto max-w-3xl">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/15">
              <Home className="size-6" aria-hidden />
            </span>
            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl">
              جاهز تلاقي المكان اللي يشبهك؟
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
              أنشئ حسابك مجانًا، وخلي أول خطوة نحو بيتك أبسط وأوضح من أول يوم.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-hero-ink px-8 font-black text-white transition-transform hover:-translate-y-1"
              >
                أنشئ حسابك الآن
                <ArrowLeft className="size-5" aria-hidden />
              </Link>
              <Link
                href="/guest"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/30 bg-white/10 px-8 font-black text-white transition-colors hover:bg-white/15"
              >
                تصفّح أولًا
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
