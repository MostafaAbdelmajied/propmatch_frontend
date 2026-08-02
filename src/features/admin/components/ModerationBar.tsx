"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { TextAreaField } from "@/src/components/ui/Field";

export interface ModerationBarProps {
  onDecide: (decision: "approve" | "reject", reason?: string) => void;
  pending: boolean;
  /** Shown instead of the controls once the item has left PENDING. */
  alreadyReviewed: boolean;
  reviewedText?: string;
  rejectLabel?: string;
  rejectHint?: string;
}

/**
 * The shared approve / reject-with-reason bar for every moderation queue
 * (PRO-08). Rejection always demands a reason — the backend 400s without one,
 * and the reason is what the user sees so they can correct and resubmit.
 */
export function ModerationBar({
  onDecide,
  pending,
  alreadyReviewed,
  reviewedText = "تمت مراجعة هذا العنصر بالفعل.",
  rejectLabel = "رفض",
  rejectHint = "اكتب سبب الرفض ليظهر لصاحب الطلب…",
}: ModerationBarProps) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  if (alreadyReviewed) {
    return <div className="rounded-card bg-background p-4 text-center text-small text-muted">{reviewedText}</div>;
  }

  return (
    <div className="sticky bottom-0 flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card">
      {rejecting && (
        <TextAreaField
          label="سبب الرفض"
          required
          placeholder={rejectHint}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={reason.trim() ? undefined : "سبب الرفض مطلوب"}
        />
      )}
      <div className="flex gap-3">
        {rejecting ? (
          <>
            <Button
              variant="danger"
              onClick={() => onDecide("reject", reason)}
              loading={pending}
              disabled={!reason.trim()}
              className="flex-1"
            >
              <X className="size-4" aria-hidden />
              تأكيد الرفض
            </Button>
            <Button variant="ghost" onClick={() => setRejecting(false)} disabled={pending}>
              إلغاء
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => onDecide("approve")}
              loading={pending}
              className="flex-1 bg-success hover:bg-success/90"
            >
              <Check className="size-4" aria-hidden />
              موافقة
            </Button>
            <Button variant="danger" onClick={() => setRejecting(true)} className="flex-1">
              <X className="size-4" aria-hidden />
              {rejectLabel}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
