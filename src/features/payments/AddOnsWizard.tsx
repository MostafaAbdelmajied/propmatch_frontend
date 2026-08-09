"use client";

import { useState } from "react";
import { Sheet } from "@/src/components/ui/Sheet";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/components/ui/Toast";
import { useMyProperties } from "@/src/features/landlord/hooks/useLandlord";
import { useCommercialCatalog } from "./useCommercialCatalog";
import { PaymentSheet } from "./PaymentSheet";
import { paymentTypePrices, type CheckoutPaymentType } from "@/src/lib/api/contracts/payment";
import { formatEGP } from "@/src/utils/format";
import { cn } from "@/src/utils/cn";
import { Check, Home, Plus, Send, Sparkles, TrendingUp } from "lucide-react";

export interface AddOnsWizardProps {
  open: boolean;
  onClose: () => void;
  /** Fired once a purchase's entitlement is confirmed active. */
  onActivated?: () => void;
}

interface AddOnDefinition {
  type: CheckoutPaymentType;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  describe: (price: number, validityDays: number, quantity?: number) => string;
  fallbackValidityDays: number;
  fallbackQuantity?: number;
  requiresProperty?: boolean;
}

/** The 6 SKUs the Add-Ons card offers, in display order. Prices/validity are
 * read live from the commercial catalog when available and fall back to the
 * same static values PaymentSheet uses, so this never shows a stale price. */
const ADD_ON_DEFINITIONS: AddOnDefinition[] = [
  {
    type: "EXTRA_LISTING_60D",
    title: "عقار نشط إضافي",
    icon: Home,
    describe: (price, days) => `سعة عقار نشط واحد إضافي، صالحة لمدة ${days} يومًا`,
    fallbackValidityDays: 60,
  },
  {
    type: "OFFERS_10_60D",
    title: "10 عروض مطابقة",
    icon: Send,
    describe: (price, days, qty) => `${qty ?? 10} عروض مباشرة إضافية، صالحة لمدة ${days} يومًا`,
    fallbackValidityDays: 60,
    fallbackQuantity: 10,
  },
  {
    type: "BOOST_7D",
    title: "Boost — 7 أيام",
    icon: TrendingUp,
    describe: (price, days) => `أولوية ظهور الإعلان لمدة ${days} أيام`,
    fallbackValidityDays: 7,
    requiresProperty: true,
  },
  {
    type: "BOOST_14D",
    title: "Boost — 14 يومًا",
    icon: TrendingUp,
    describe: (price, days) => `أولوية ظهور الإعلان لمدة ${days} يومًا`,
    fallbackValidityDays: 14,
    requiresProperty: true,
  },
  {
    type: "BOOST_30D",
    title: "Boost — 30 يومًا",
    icon: TrendingUp,
    describe: (price, days) => `أولوية ظهور الإعلان لمدة ${days} يومًا`,
    fallbackValidityDays: 30,
    requiresProperty: true,
  },
  {
    type: "AI_USES_10_90D",
    title: "10 استخدامات ذكاء اصطناعي",
    icon: Sparkles,
    describe: (price, days, qty) =>
      `${qty ?? 10} استخدامات إضافية لمحسن وصف العقار، صالحة لمدة ${days} يومًا`,
    fallbackValidityDays: 90,
    fallbackQuantity: 10,
  },
];

/**
 * Generic "Add-Ons" wizard — replaces the single-SKU AI-addon card with a
 * picker over all 6 add-on SKUs the backend's commercial catalog supports.
 * Selection only happens here; the actual checkout/payment-method/polling
 * machinery is PaymentSheet's (opened with initialStep=2 once "Purchase" is
 * clicked), so none of that is duplicated.
 */
export function AddOnsWizard({ open, onClose, onActivated }: AddOnsWizardProps) {
  const toast = useToast();
  const catalogQuery = useCommercialCatalog();
  const propertiesQuery = useMyProperties();
  const catalog = catalogQuery.data;

  const [selected, setSelected] = useState<CheckoutPaymentType | null>(null);
  const [propertyId, setPropertyId] = useState<string>("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const eligibleProperties = (propertiesQuery.data?.items ?? []).filter(
    (p) => p.status === "APPROVED",
  );

  function priceFor(type: CheckoutPaymentType): number {
    return catalog?.products[type]?.priceEgp ?? paymentTypePrices[type];
  }

  function selectedDefinition(): AddOnDefinition | null {
    return ADD_ON_DEFINITIONS.find((d) => d.type === selected) ?? null;
  }

  function selectAddOn(type: CheckoutPaymentType) {
    setSelected(type);
    // Switching away from a boost (or between boosts) — the previously
    // picked property may not apply / isn't needed anymore.
    if (!ADD_ON_DEFINITIONS.find((d) => d.type === type)?.requiresProperty) {
      setPropertyId("");
    }
  }

  function handlePurchaseClick() {
    const def = selectedDefinition();
    if (!def) {
      toast("error", "اختر إضافة أولًا");
      return;
    }
    if (def.requiresProperty && !propertyId) {
      toast("error", "اختر العقار المطلوب ترقيته أولًا");
      return;
    }
    setCheckoutOpen(true);
  }

  function closeAll() {
    setCheckoutOpen(false);
    setSelected(null);
    setPropertyId("");
    onClose();
  }

  const def = selectedDefinition();
  const canPurchase = !!def && (!def.requiresProperty || !!propertyId);

  return (
    <>
      <Sheet
        open={open && !checkoutOpen}
        onClose={onClose}
        title="الإضافات"
        maxWidth="2xl"
      >
        <div className="flex flex-col gap-4">
          <p className="text-small text-muted">
            إضافات مؤقتة ومستقلة عن باقتك الأساسية — اختر ما يناسبك واحصل عليه فورًا بعد الدفع.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {ADD_ON_DEFINITIONS.map((item) => {
              const Icon = item.icon;
              const isSelected = selected === item.type;
              const product = catalog?.products[item.type];
              const price = priceFor(item.type);
              const validityDays = product?.validityDays ?? product?.durationDays ?? item.fallbackValidityDays;
              const quantity = product?.quantity ?? item.fallbackQuantity;
              const enabled = product?.enabled ?? true;

              return (
                <button
                  key={item.type}
                  type="button"
                  disabled={!enabled}
                  onClick={() => selectAddOn(item.type)}
                  className={cn(
                    "flex flex-col gap-2 rounded-card border p-4 text-start transition-all",
                    !enabled && "cursor-not-allowed opacity-50",
                    isSelected
                      ? "border-primary bg-primary-tint/30 ring-2 ring-primary shadow-sm"
                      : "border-hairline bg-surface hover:border-primary/40 hover:bg-background",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full",
                          isSelected ? "bg-primary text-white" : "bg-hairline/80 text-muted",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="text-small font-bold text-ink">{item.title}</span>
                    </span>
                    {isSelected && (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="size-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-caption text-muted">
                    {item.describe(price, validityDays, quantity)}
                  </p>
                  <span className="self-start rounded-pill bg-primary-tint px-2.5 py-0.5 text-caption font-extrabold text-primary">
                    {formatEGP(price)}
                  </span>
                  {!enabled && (
                    <span className="text-caption font-semibold text-error">
                      غير متاح حاليًا
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {def?.requiresProperty && (
            <div className="flex flex-col gap-1.5">
              <label className="text-small font-bold text-ink">اختر العقار المراد ترقيته</label>
              {propertiesQuery.isLoading ? (
                <p className="text-caption text-muted">جارٍ تحميل عقاراتك…</p>
              ) : eligibleProperties.length === 0 ? (
                <p className="text-caption text-error">
                  لا يوجد لديك عقار معتمد لتفعيل الـ Boost عليه حاليًا.
                </p>
              ) : (
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="rounded-control border border-hairline bg-background px-3 py-2.5 text-body text-ink focus:border-primary focus:outline-none"
                >
                  <option value="">اختر عقارًا…</option>
                  {eligibleProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <Button
            size="lg"
            block
            disabled={!canPurchase}
            onClick={handlePurchaseClick}
            className="mt-2 py-3.5 text-body font-bold"
          >
            {def ? (
              <span className="flex items-center gap-2">
                <Plus className="size-4" aria-hidden />
                شراء {def.title} ({formatEGP(priceFor(def.type))})
              </span>
            ) : (
              "اختر إضافة للمتابعة"
            )}
          </Button>
        </div>
      </Sheet>

      {checkoutOpen && selected && (
        <PaymentSheet
          open={checkoutOpen}
          paymentType={selected}
          propertyId={def?.requiresProperty ? propertyId : undefined}
          initialStep={2}
          onClose={closeAll}
          onActivated={() => {
            closeAll();
            onActivated?.();
          }}
        />
      )}
    </>
  );
}
