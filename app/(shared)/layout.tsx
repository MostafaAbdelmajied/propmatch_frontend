import { LandlordNav } from "@/src/components/nav/LandlordNav";
import { SharedBackButton } from "@/src/components/nav/SharedBackButton";
import { TenantNav } from "@/src/components/nav/TenantNav";
import { Logo } from "@/src/components/ui/Logo";
import { landingAfterLogin } from "@/src/features/auth/roleRouting";
import { requireSession } from "@/src/lib/api/serverSession";

/** Shared shell; each page applies its own role policy before rendering. */
export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession("/profile");
  const fallbackHref = landingAfterLogin(user.role);
  const roleNav =
    user.role === "landlord" ? <LandlordNav /> : user.role === "tenant" ? <TenantNav /> : null;

  if (roleNav) {
    return (
      <div className="flex min-h-dvh flex-col pb-16 md:pb-0">
        {roleNav}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </div>
    );
  }

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
