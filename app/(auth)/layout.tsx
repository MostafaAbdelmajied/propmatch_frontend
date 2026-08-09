import { Logo } from "@/src/components/ui/Logo";
import { FileText, ShieldCheck, Sparkles } from "lucide-react";

const trustPoints = [
  { Icon: ShieldCheck, text: "مستخدمون موثّقو الهوية" },
  { Icon: Sparkles, text: "مطابقة ذكية بالذكاء الاصطناعي" },
  { Icon: FileText, text: "عقد إيجار جاهز للتحميل" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Brand panel — hidden on mobile, full-height on desktop */}
      <aside className="hidden flex-col justify-between bg-primary p-10 text-white md:flex md:w-2/5 lg:w-1/2">
        <Logo href="/" size="xl" withCard />
        <div className="flex flex-col gap-6">
          <h1 className="text-display font-bold leading-tight">اعثر على سكنك بثقة.</h1>
          <p className="text-h2 font-semibold text-white/90">إعلانات واضحة وتواصل سهل عبر المنصة.</p>
          <ul className="flex flex-col gap-3">
            {trustPoints.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-white/90">
                <span className="flex size-8 items-center justify-center rounded-full bg-white/15">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-small text-white/70">المنصورة، مصر</p>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center md:hidden">
            <Logo href="/" withCard />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
