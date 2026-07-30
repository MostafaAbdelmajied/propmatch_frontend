import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/src/components/ui/Logo";

interface MarketingHeaderProps {
  overlay?: boolean;
}

const logoClassName =
  "[&>div]:overflow-visible [&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent [&>div]:p-0 [&>div]:shadow-none [&_img]:rounded-none";

export function MarketingHeader({ overlay = false }: MarketingHeaderProps) {
  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-40"
          : "sticky inset-x-0 top-0 z-40 border-b border-hero-ink/8 bg-white/90 backdrop-blur-xl"
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Logo href="/" size="lg" className={logoClassName} />

        <nav
          aria-label="التنقل الرئيسي"
          className="hidden items-center gap-6 rounded-full border border-hero-ink/8 bg-white/80 px-6 py-3 text-sm font-semibold text-hero-ink shadow-sm lg:flex"
        >
          <Link className="transition-colors hover:text-landing-teal" href="/#how-it-works">
            كيف يعمل؟
          </Link>
          <Link className="transition-colors hover:text-landing-teal" href="/#why-propmatch">
            كيف نساعدك؟
          </Link>
          <Link className="transition-colors hover:text-landing-teal" href="/about">
            من نحن
          </Link>
          <Link className="transition-colors hover:text-landing-teal" href="/contact">
            تواصل معنا
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2.5 text-sm font-bold text-hero-ink transition-colors hover:bg-mist sm:inline-flex"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-linear-to-l from-landing-teal to-landing-mid px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-landing-mid/20 transition-all hover:-translate-y-0.5 hover:from-landing-mid hover:to-hero-ink sm:px-5"
          >
            ابدأ مجانًا
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
