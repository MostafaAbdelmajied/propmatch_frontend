import { BadgeCheck, Clock, ShieldQuestion, XCircle, RotateCcw } from "lucide-react";
import { cn } from "@/src/utils/cn";
import type { VerificationStatus } from "@/src/lib/api/contracts/verification";

/**
 * Five UI states over the three the ERD persists (conflicts.md A5):
 * NOT_SUBMITTED and RESUBMISSION_REQUIRED are derived.
 */
const config: Record<VerificationStatus, { label: string; className: string; Icon: typeof BadgeCheck }> = {
  APPROVED: { label: "هوية موثّقة", className: "bg-success-tint text-success", Icon: BadgeCheck },
  PENDING: { label: "التوثيق قيد المراجعة", className: "bg-pending-tint text-pending", Icon: Clock },
  NOT_SUBMITTED: { label: "غير موثّق", className: "bg-background text-muted", Icon: ShieldQuestion },
  REJECTED: { label: "التوثيق مرفوض", className: "bg-error-tint text-error", Icon: XCircle },
  RESUBMISSION_REQUIRED: { label: "يلزم إعادة الإرسال", className: "bg-error-tint text-error", Icon: RotateCcw },
};

export function VerifiedBadge({
  status,
  compact,
  className,
}: {
  status: VerificationStatus;
  compact?: boolean;
  className?: string;
}) {
  const { label, className: statusClass, Icon } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-caption font-semibold",
        statusClass,
        className,
      )}
      title={label}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {!compact && label}
    </span>
  );
}

/**
 * The honest-trust rule: eKYC verifies **identity, not ownership**. A verified
 * badge must never appear without this disclaimer nearby.
 */
export function OwnershipDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("rounded-control bg-trust-blue-tint px-3.5 py-2.5 text-caption leading-relaxed text-body-text", className)}>
      يتم التحقق من هوية المستخدم فقط، أما ملكية العقار فيُقرّ بها المالك على مسؤوليته.
    </p>
  );
}
