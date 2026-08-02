import { MapPin, Phone, User } from "lucide-react";
import { OwnershipDisclaimer } from "@/src/components/ui/VerifiedBadge";
import { cn } from "@/src/utils/cn";

export interface ContactRevealCardProps {
  ownerName: string;
  ownerPhoneNumber: string;
  /** Only present once the connection unlocks it; the browse payload omits it. */
  manualAddress?: string | null;
  className?: string;
}

/**
 * Shown only when the server actually sent us contact details — i.e. this
 * viewer has an ACCEPTED offer / CONNECTED match. It never receives the fields
 * otherwise, so there is nothing here to hide client-side (rbac.md).
 *
 * The verified-identity story always ships with the ownership disclaimer.
 */
export function ContactRevealCard({
  ownerName,
  ownerPhoneNumber,
  manualAddress,
  className,
}: ContactRevealCardProps) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-card border border-success/30 bg-success-tint/40 p-4", className)}>
      <p className="text-small font-bold text-success">تم التواصل — بيانات المالك متاحة الآن</p>

      <dl className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <User className="size-4 shrink-0 text-muted" aria-hidden />
          <dt className="sr-only">اسم المالك</dt>
          <dd className="text-body font-semibold text-ink">{ownerName}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="size-4 shrink-0 text-muted" aria-hidden />
          <dt className="sr-only">رقم المالك</dt>
          <dd>
            <a href={`tel:${ownerPhoneNumber}`} className="text-body font-bold text-primary hover:underline" dir="ltr">
              {ownerPhoneNumber}
            </a>
          </dd>
        </div>
        {manualAddress && (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <dt className="sr-only">عنوان العقار</dt>
            <dd className="text-small text-body-text">{manualAddress}</dd>
          </div>
        )}
      </dl>

      <OwnershipDisclaimer />
    </div>
  );
}
