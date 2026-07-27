"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Sheet } from "@/src/components/ui/Sheet";
import { Button } from "@/src/components/ui/Button";
import { SelectField, TextAreaField } from "@/src/components/ui/Field";
import { QuotaChip } from "@/src/components/ui/QuotaChip";
import { EmptyState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { PaymentSheet } from "@/src/features/payments/PaymentSheet";
import { useMyProperties, useQuota } from "@/src/features/landlord/hooks/useLandlord";
import { formatEGP } from "@/src/utils/format";
import { CreateOfferRequestSchema, type CreateOfferRequest } from "@/src/lib/api/contracts/offer";
import type { BrowsableTenantRequest } from "@/src/lib/api/contracts/tenantRequest";
import type { PropertySummary } from "@/src/lib/api/contracts/property";
import type { PaymentType } from "@/src/lib/api/contracts/payment";
import { useSendOffer } from "../hooks/useOffers";

export interface SendOfferSheetProps {
  request: BrowsableTenantRequest | null;
  onClose: () => void;
}

/**
 * PRO-13 — the landlord pitches one of their APPROVED properties against a
 * tenant request. For a Free Owner this consumes one of three free direct
 * offers. Premium owners can initiate offers without a quota.
 */
export function SendOfferSheet({ request, onClose }: SendOfferSheetProps) {
  const router = useRouter();
  const toast = useToast();
  const quota = useQuota();
  const properties = useMyProperties();
  const send = useSendOffer();
  const [paywall, setPaywall] = useState<PaymentType | null>(null);

  const [propertyId, setPropertyId] = useState("");
  const [pitchMessage, setPitchMessage] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof CreateOfferRequest, string>>>({});

  // Only APPROVED properties can back an offer — the backend enforces it too.
  const offerable = (properties.data?.items ?? []).filter((p) => p.status === "APPROVED");

  function reset() {
    setPropertyId("");
    setPitchMessage("");
    setProposedPrice("");
    setErrors({});
    onClose();
  }

  function submit() {
    if (!request) return;
    const parsed = CreateOfferRequestSchema.safeParse({
      tenantRequestId: request.id,
      propertyId,
      pitchMessage,
      proposedPrice: Number(proposedPrice),
    });
    if (!parsed.success) {
      const next: Partial<Record<keyof CreateOfferRequest, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CreateOfferRequest;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    send.mutate(parsed.data, {
      onSuccess: (res) => {
        toast(
          "success",
          quota.data?.offersUnlimited
            ? "تم إرسال عرضك"
            : `تم إرسال عرضك — المتبقي: ${res.freeOffersLeft}`,
        );
        reset();
      },
      onError: (e) => {
        if (e.code === "VERIFICATION_REQUIRED") {
          toast("info", "وثّق هويتك أولًا لإرسال العروض");
          router.push("/landlord/verify");
        } else if (e.code === "QUOTA_EXHAUSTED") {
          setPaywall("PREMIUM_OWNER");
        } else {
          toast("error", e.message);
        }
      },
    });
  }

  return (
    <>
      <Sheet
        open={request !== null}
        onClose={reset}
        title="إرسال عرض"
        dismissible={!send.isPending}
      >
        {request && (
          <div className="flex flex-col gap-4">
            <div className="rounded-control bg-primary-tint px-4 py-3">
              <p className="text-caption text-primary-dark">ميزانية المستأجر</p>
              <p className="text-title font-bold text-primary">
                {formatEGP(request.minBudget)} – {formatEGP(request.maxBudget)}
              </p>
            </div>

            {properties.isLoading ? (
              <p className="py-6 text-center text-small text-muted">جارٍ تحميل عقاراتك…</p>
            ) : offerable.length === 0 ? (
              <EmptyState
                title="لا يوجد عقار معتمد"
                description="تحتاج عقارًا واحدًا على الأقل تمت الموافقة عليه قبل إرسال العروض."
                action={
                  <Button onClick={() => router.push("/landlord/properties/new")}>
                    أضف عقارًا
                  </Button>
                }
              />
            ) : (
              <>
                <SelectField
                  label="اختر العقار"
                  required
                  placeholder="— اختر عقارًا —"
                  value={propertyId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setPropertyId(selectedId);
                    const chosen = offerable.find((p) => p.id === selectedId);
                    if (chosen) {
                      setProposedPrice(chosen.rentAmount.toString());
                    } else {
                      setProposedPrice("");
                    }
                  }}
                  error={errors.propertyId}
                  options={offerable.map((p) => {
                    const pct = calculateMatchScore(request, p);
                    return {
                      value: p.id,
                      label: `${p.title} · ${formatEGP(p.rentAmount)} (${pct}%)`,
                    };
                  })}
                />
                <TextAreaField
                  label="رسالتك للمستأجر"
                  required
                  placeholder="عقاري يناسب طلبك لأنه…"
                  value={pitchMessage}
                  onChange={(e) => setPitchMessage(e.target.value)}
                  error={errors.pitchMessage}
                />
                {quota.data && !quota.data.offersUnlimited && (
                  <QuotaChip
                    remaining={quota.data.freeOffersLeft}
                    label="عروض مباشرة مجانية متبقية"
                    className="self-start"
                  />
                )}
                {quota.data?.offersUnlimited && (
                  <span className="self-start rounded-pill bg-success-tint px-3 py-1 text-caption font-bold text-success">
                    عروض مباشرة غير محدودة ضمن الخطة المميزة
                  </span>
                )}
                <Button size="lg" block onClick={submit} loading={send.isPending}>
                  <Send className="size-4" aria-hidden />
                  إرسال العرض
                </Button>
              </>
            )}
          </div>
        )}
      </Sheet>

      <PaymentSheet
        open={paywall !== null}
        onClose={() => setPaywall(null)}
        paymentType={paywall ?? "PREMIUM_OWNER"}
        onActivated={() => {
          setPaywall(null);
          toast("success", "تم تفعيل الخطة المميزة — أرسل عرضك الآن");
          quota.refetch();
        }}
      />
    </>
  );
}

/**
 * ⚠️ Client-side re-implementation of the server's matcher, powering the «N%»
 * in the property dropdown.
 *
 * **This contradicts ASSUMPTIONS.md #7** ("match score is server-authoritative
 * and volatile — never recomputed client-side"), and it cannot be made to
 * agree with the server:
 *
 * - `PropertySummary` carries no `description` / `propertyAroundServices`, so
 *   the semantic term (worth up to +10 server-side) is silently missing here.
 *   The original `p: any` was hiding exactly that.
 * - The server's arithmetic is itself only a placeholder for ChromaDB
 *   embeddings (PRO-09/11). Once the real matcher lands, this function
 *   reproduces none of it and the percentage becomes fiction.
 *
 * Kept as-is for now (behaviour unchanged) — the honest fix is a backend field
 * giving per-property scores for a request, since `BrowsableTenantRequest.
 * matchScore` is only the *best* score across the landlord's properties and
 * can't populate a per-row dropdown. **[CONFIRM with backend]**
 */
function calculateMatchScore(r: BrowsableTenantRequest, p: PropertySummary): number {
  let score = 50;
  if (p.rentAmount >= r.minBudget && p.rentAmount <= r.maxBudget) score += 18;
  else score -= 22;
  if (r.preferredLocations.includes(p.district || "")) score += 12;
  if (p.propertyType === r.propertyType) score += 8;
  if (p.bedrooms >= r.requiredBedrooms) score += 5;
  if (!r.needsFurnished || p.isFurnished) score += 5;
  // The semantic term the server applies here is omitted: this payload has
  // neither field to compute it from.
  score += Math.round((r.flexibilityScore - 5) * 0.6);
  if (p.isBoosted) score += 2;
  return Math.max(5, Math.min(98, Math.round(score)));
}
