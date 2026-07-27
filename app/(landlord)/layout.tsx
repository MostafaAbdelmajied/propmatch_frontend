import { LandlordNav } from "@/src/components/nav/LandlordNav";
import { FloatingAiWidget } from "@/src/features/support/components/FloatingAiWidget";
import { requireRole } from "@/src/lib/api/serverSession";

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  await requireRole("landlord", "/landlord");
  return (
    <div className="flex min-h-dvh flex-col pb-16 md:pb-0">
      <LandlordNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <FloatingAiWidget />
    </div>
  );
}
