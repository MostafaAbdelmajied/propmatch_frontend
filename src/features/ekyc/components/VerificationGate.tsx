"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { useVerificationState } from "../hooks/useKyc";

type VerificationPath = "/verify" | "/landlord/verify";

export type VerificationGateProps = {
  children: React.ReactNode;
  verificationPath: VerificationPath;
};

export function VerificationGate({ children, verificationPath }: VerificationGateProps) {
  const verification = useVerificationState();

  if (verification.isLoading || verification.isFetching) {
    return (
      <div className="flex min-h-48 items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
        <span className="sr-only">جارٍ التحقق من حالة توثيق الهوية</span>
      </div>
    );
  }

  if (verification.isError || !verification.data) {
    return (
      <GateCard>
        <p role="alert">تعذّر تحميل حالة توثيق الهوية. حاول مرة أخرى.</p>
        <Button type="button" onClick={() => verification.refetch()}>
          إعادة المحاولة
        </Button>
      </GateCard>
    );
  }

  switch (verification.data.status) {
    case "APPROVED":
      return <>{children}</>;
    case "NOT_SUBMITTED":
      return (
        <GateCard>
          <p>يجب توثيق هويتك أولًا لاستخدام هذه الميزة.</p>
          <GateLink href={verificationPath}>ابدأ توثيق الهوية</GateLink>
        </GateCard>
      );
    case "PENDING":
      return (
        <GateCard>
          <p>طلب توثيق هويتك قيد المراجعة حاليًا.</p>
          <GateLink href={verificationPath}>عرض حالة التوثيق</GateLink>
        </GateCard>
      );
    case "REJECTED":
      return (
        <GateCard>
          <p>تم رفض طلب توثيق الهوية.</p>
          {verification.data.rejectionReason && <p className="text-small text-muted">{verification.data.rejectionReason}</p>}
          <GateLink href={verificationPath}>عرض حالة التوثيق</GateLink>
        </GateCard>
      );
    case "RESUBMISSION_REQUIRED":
      return (
        <GateCard>
          <p>يلزم تقديم مستندات توثيق جديدة.</p>
          {verification.data.rejectionReason && <p className="text-small text-muted">{verification.data.rejectionReason}</p>}
          <GateLink href={verificationPath}>إرسال مستندات جديدة</GateLink>
        </GateCard>
      );
  }
}

function GateCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 rounded-card border border-pending/30 bg-pending-tint p-5 text-body-text" aria-live="polite">
      {children}
    </section>
  );
}

function GateLink({ href, children }: { href: VerificationPath; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex w-fit rounded-control bg-primary px-5 py-2.5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      {children}
    </Link>
  );
}
