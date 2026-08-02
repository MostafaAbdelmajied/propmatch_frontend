import { Clock, CheckCircle2, XCircle, Handshake, Archive, Send, Eye } from "lucide-react";
import { cn } from "@/src/utils/cn";
import {
  tenantRequestStatusLabels,
  type TenantRequestStatus,
} from "@/src/lib/api/contracts/tenantRequest";
import { offerStatusLabels, type OfferStatus } from "@/src/lib/api/contracts/offer";

const pill = "inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-caption font-semibold";

/** ERD: TENANT_REQUEST.status. */
const requestTone: Record<TenantRequestStatus, { className: string; Icon: typeof Clock }> = {
  PENDING: { className: "bg-pending-tint text-pending border-pending/30", Icon: Clock },
  APPROVED: { className: "bg-success-tint text-success border-success/30", Icon: CheckCircle2 },
  REJECTED: { className: "bg-error-tint text-error border-error/30", Icon: XCircle },
  FULFILLED: { className: "bg-primary-tint text-primary-dark border-primary/30", Icon: Handshake },
  CLOSED: { className: "bg-background text-muted border-hairline", Icon: Archive },
};

export function TenantRequestStatusChip({ status, className }: { status: TenantRequestStatus; className?: string }) {
  const { className: tone, Icon } = requestTone[status];
  return (
    <span className={cn(pill, tone, className)}>
      <Icon className="size-3" aria-hidden />
      {tenantRequestStatusLabels[status]}
    </span>
  );
}

/** ERD: OWNER_OFFER.status. */
const offerTone: Record<OfferStatus, { className: string; Icon: typeof Clock }> = {
  SENT: { className: "bg-primary-tint text-primary-dark border-primary/30", Icon: Send },
  VIEWED: { className: "bg-pending-tint text-pending border-pending/30", Icon: Eye },
  ACCEPTED: { className: "bg-success-tint text-success border-success/30", Icon: CheckCircle2 },
  REJECTED: { className: "bg-error-tint text-error border-error/30", Icon: XCircle },
};

export function OfferStatusChip({ status, className }: { status: OfferStatus; className?: string }) {
  const { className: tone, Icon } = offerTone[status];
  return (
    <span className={cn(pill, tone, className)}>
      <Icon className="size-3" aria-hidden />
      {offerStatusLabels[status]}
    </span>
  );
}
