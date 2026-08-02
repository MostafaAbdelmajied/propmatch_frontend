import { Clock, CheckCircle2, XCircle, Archive } from "lucide-react";
import { cn } from "@/src/utils/cn";
import type { PropertyStatus } from "@/src/lib/api/contracts/common";

/** ERD: PROPERTY.status — PENDING / APPROVED / REJECTED / ARCHIVED. */
const statusConfig: Record<PropertyStatus, { label: string; className: string; Icon: typeof Clock }> = {
  PENDING: { label: "قيد المراجعة", className: "bg-pending-tint text-pending border-pending/30", Icon: Clock },
  APPROVED: { label: "تمت الموافقة", className: "bg-success-tint text-success border-success/30", Icon: CheckCircle2 },
  REJECTED: { label: "مرفوض", className: "bg-error-tint text-error border-error/30", Icon: XCircle },
  ARCHIVED: { label: "مؤرشف", className: "bg-background text-muted border-hairline", Icon: Archive },
};

export function StatusChip({ status, className }: { status: PropertyStatus; className?: string }) {
  const { label, className: statusClass, Icon } = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-caption font-semibold",
        statusClass,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}
