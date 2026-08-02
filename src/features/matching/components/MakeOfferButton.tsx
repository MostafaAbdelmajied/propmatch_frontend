"use client";

import { useState } from "react";
import { HandCoins } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Sheet } from "@/src/components/ui/Sheet";
import { InputField, TextAreaField } from "@/src/components/ui/Field";
import { useToast } from "@/src/components/ui/Toast";
import { formatNumber } from "@/src/utils/format";
import { useCreateTenantOffer } from "../hooks/useTenantOffers";

/**
 * Forward marketplace: lets a tenant propose a rent + message directly on a
 * listing. Only rendered for tenants on an available listing they don't own and
 * aren't already connected to (see PropertyDetailView).
 */
export function MakeOfferButton({
  propertyId,
  askingRent,
}: {
  propertyId: string;
  askingRent: number;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState<string>(String(askingRent));
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateTenantOffer(propertyId);

  function submit() {
    const proposedPrice = Number(price);
    if (!Number.isFinite(proposedPrice) || proposedPrice <= 0) {
      setError("أدخل قيمة إيجار صحيحة");
      return;
    }
    if (message.trim().length < 1) {
      setError("اكتب رسالة قصيرة للمالك");
      return;
    }
    setError(null);
    create.mutate(
      { proposedPrice, message: message.trim() },
      {
        onSuccess: () => {
          toast("success", "تم إرسال عرضك للمالك");
          setOpen(false);
          setMessage("");
        },
        onError: (e) => setError(e.message),
      },
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full gap-2">
        <HandCoins className="size-4" aria-hidden />
        قدّم عرضاً
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title="تقديم عرض على العقار">
        <div className="flex flex-col gap-4 p-1">
          <p className="text-small text-muted">
            الإيجار المطلوب: <span className="font-bold text-ink">{formatNumber(askingRent)} ج.م / شهرياً</span>.
            يمكنك اقتراح قيمة مختلفة؛ للمالك القبول أو الرفض أو تقديم عرض مضاد.
          </p>

          <InputField
            label="الإيجار المقترح (ج.م / شهرياً)"
            type="number"
            inputMode="numeric"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />

          <TextAreaField
            label="رسالة للمالك"
            placeholder="عرّف بنفسك ومتى تنوي الانتقال…"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            error={error ?? undefined}
            required
          />

          <div className="flex gap-2">
            <Button onClick={submit} loading={create.isPending} className="flex-1">
              إرسال العرض
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>
              إلغاء
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
