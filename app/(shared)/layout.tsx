import { SharedBackButton } from "@/src/components/nav/SharedBackButton";
import { Logo } from "@/src/components/ui/Logo";
import { landingAfterLogin } from "@/src/features/auth/roleRouting";
import { requireSession } from "@/src/lib/api/serverSession";

/** Shared authenticated surfaces (profile, contract generator, verify) available to any role. */
export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession("/profile");
  const fallbackHref = landingAfterLogin(user.role);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo href="/" />
          <SharedBackButton fallbackHref={fallbackHref} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
