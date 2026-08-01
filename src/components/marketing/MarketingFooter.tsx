import { Logo } from "@/src/components/ui/Logo";
import { Mail } from "lucide-react";
import Link from "next/link";
import { contactEmail } from "./marketingLinks";
import { SocialLinks } from "./SocialLinks";

const logoClassName =
  "[&>div]:overflow-visible [&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent [&>div]:p-0 [&>div]:shadow-none [&_img]:rounded-none";

export function MarketingFooter() {
  return (
    <footer className="border-t border-hero-ink/8 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_0.7fr_0.7fr] lg:px-8">
        <div>
          <Logo href="/" size="lg" className={logoClassName} />
          <p className="mt-4 max-w-sm text-sm leading-7 text-landing-muted">
            نساعدك تلاقي بيت ترتاح فيه، أو مستأجر تطمئن له — بشكل مباشر، وبدون سمسار أو عمولة.
          </p>
          <div className="mt-6">
            <SocialLinks />
          </div>
        </div>

        <div>
          <p className="font-black text-hero-ink">استكشف</p>
          <div className="mt-4 flex flex-col gap-3 text-sm font-semibold text-landing-muted">
            <Link href="/guest" className="hover:text-landing-teal">
              العقارات
            </Link>
            <Link href="/#how-it-works" className="hover:text-landing-teal">
              كيف يعمل؟
            </Link>
            <Link href="/about" className="hover:text-landing-teal">
              من نحن
            </Link>
            <Link href="/contact" className="hover:text-landing-teal">
              تواصل معنا
            </Link>
          </div>
        </div>

        <div>
          <p className="font-black text-hero-ink">ابدأ الآن</p>
          <div className="mt-4 flex flex-col gap-3 text-sm font-semibold text-landing-muted">
            <Link href="/signup" className="hover:text-landing-teal">
              إنشاء حساب
            </Link>
            <Link href="/login" className="hover:text-landing-teal">
              تسجيل الدخول
            </Link>
            <a
              href={`mailto:${contactEmail}`}
              className="inline-flex items-center gap-2 hover:text-landing-teal"
            >
              <Mail className="size-4" aria-hidden />
              {contactEmail}
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-landing-muted/20 px-4 py-5 text-center text-xs font-semibold text-landing-muted">
        ©٢٠٢٦ بروب ماتش لبيوت أقرب .
      </div>
    </footer>
  );
}
