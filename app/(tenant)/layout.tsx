import { TenantNav } from "@/src/components/nav/TenantNav";
import { FloatingAiWidget } from "@/src/features/support/components/FloatingAiWidget";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col pb-16 md:pb-0">
      <TenantNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <FloatingAiWidget />
    </div>
  );
}
