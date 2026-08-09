"use client";

import { useState } from "react";
import { BadgeDollarSign, Boxes, CalendarClock, Save, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { InputField } from "@/src/components/ui/Field";
import { ErrorState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { useAdminSession } from "@/src/features/admin/hooks/useTeam";
import { isApiClientError } from "@/src/lib/api/browserClient";
import {
  paymentTypeLabels,
  type CheckoutPaymentType,
  type CommercialProduct,
  type OwnerPlanType,
  type PlanAllowances,
} from "@/src/lib/api/contracts/payment";
import {
  type ProductConfigurationInput,
  useCommercialConfig,
  useUpdatePlanConfiguration,
  useUpdateProductConfiguration,
} from "../hooks/useCommercialConfig";

const planLabels: Record<OwnerPlanType, string> = {
  FREE: "الخطة المجانية",
  OWNER_PLUS: "Owner Plus",
  PREMIUM: "Premium",
};

const planOrder: OwnerPlanType[] = ["FREE", "OWNER_PLUS", "PREMIUM"];
const productOrder: CheckoutPaymentType[] = [
  "OWNER_PLUS_MONTHLY",
  "OWNER_PLUS_YEARLY",
  "PREMIUM_MONTHLY",
  "PREMIUM_YEARLY",
  "EXTRA_LISTING_60D",
  "OFFERS_10_60D",
  "AI_USES_10_90D",
  "BOOST_7D",
  "BOOST_14D",
  "BOOST_30D",
];

function parsePositive(value: string) {
  return Math.max(1, Number.parseInt(value, 10) || 1);
}

function parseNonNegative(value: string) {
  return Math.max(0, Number.parseInt(value, 10) || 0);
}

function PlanEditor({ planType, initial }: { planType: OwnerPlanType; initial: PlanAllowances }) {
  const toast = useToast();
  const update = useUpdatePlanConfiguration();
  const [values, setValues] = useState(initial);

  const field = (key: keyof PlanAllowances, value: string) =>
    setValues((current) => ({
      ...current,
      [key]:
        key === "activeListings" || key === "boostDurationDays"
          ? parsePositive(value)
          : parseNonNegative(value),
    }));

  const save = async () => {
    try {
      await update.mutateAsync({ planType, values });
      toast("success", `تم حفظ إعدادات ${planLabels[planType]}`);
    } catch (error) {
      toast("error", isApiClientError(error) ? error.message : "تعذر حفظ إعدادات الخطة");
    }
  };

  return (
    <article className="rounded-card border border-hairline bg-surface p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-title font-extrabold text-ink">{planLabels[planType]}</h2>
          <p className="mt-1 text-caption text-muted">القيم المتاحة في كل دورة شهرية</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-control bg-primary-tint text-primary">
          <Boxes className="size-5" aria-hidden />
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          label="العقارات النشطة"
          type="number"
          min={1}
          value={values.activeListings}
          onChange={(event) => field("activeListings", event.target.value)}
        />
        <InputField
          label="العروض الشهرية"
          type="number"
          min={0}
          value={values.offers}
          onChange={(event) => field("offers", event.target.value)}
        />
        <InputField
          label="استخدامات محسن AI"
          type="number"
          min={0}
          value={values.aiUses}
          onChange={(event) => field("aiUses", event.target.value)}
        />
        <InputField
          label="أرصدة Boost الشهرية"
          type="number"
          min={0}
          value={values.boostCredits}
          onChange={(event) => field("boostCredits", event.target.value)}
        />
        <InputField
          label="مدة رصيد Boost بالأيام"
          type="number"
          min={1}
          value={values.boostDurationDays}
          onChange={(event) => field("boostDurationDays", event.target.value)}
        />
      </div>
      <Button className="mt-5" size="sm" loading={update.isPending} onClick={save}>
        <Save className="size-4" aria-hidden />
        حفظ الخطة
      </Button>
    </article>
  );
}

function ProductEditor({ product }: { product: CommercialProduct }) {
  const toast = useToast();
  const update = useUpdateProductConfiguration();
  const [values, setValues] = useState<ProductConfigurationInput>({
    priceEgp: product.priceEgp,
    enabled: product.enabled,
    quantity: product.quantity,
    validityDays: product.validityDays,
    durationDays: product.durationDays,
  });

  const save = async () => {
    try {
      await update.mutateAsync({ paymentType: product.paymentType, values });
      toast("success", `تم حفظ ${paymentTypeLabels[product.paymentType]}`);
    } catch (error) {
      toast("error", isApiClientError(error) ? error.message : "تعذر حفظ إعدادات المنتج");
    }
  };

  return (
    <article className="rounded-card border border-hairline bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-ink">{paymentTypeLabels[product.paymentType]}</h3>
          <p className="mt-1 text-caption text-muted">
            {product.kind === "SUBSCRIPTION"
              ? "اشتراك"
              : product.kind === "BOOST"
                ? "ترقية ظهور"
                : "إضافة مستقلة"}
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-small font-semibold text-body-text">
          <input
            type="checkbox"
            checked={values.enabled}
            onChange={(event) =>
              setValues((current) => ({ ...current, enabled: event.target.checked }))
            }
            className="size-4 accent-primary"
          />
          متاح للبيع
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          label="السعر بالجنيه المصري"
          type="number"
          min={1}
          value={values.priceEgp}
          onChange={(event) =>
            setValues((current) => ({ ...current, priceEgp: parsePositive(event.target.value) }))
          }
        />
        {product.kind === "ENTITLEMENT" && (
          <>
            <InputField
              label="عدد الوحدات"
              type="number"
              min={1}
              value={values.quantity}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  quantity: parsePositive(event.target.value),
                }))
              }
            />
            <InputField
              label="الصلاحية بالأيام"
              type="number"
              min={1}
              value={values.validityDays}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  validityDays: parsePositive(event.target.value),
                }))
              }
            />
          </>
        )}
        {product.kind === "BOOST" && (
          <InputField
            label="مدة Boost بالأيام"
            type="number"
            min={1}
            value={values.durationDays}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                durationDays: parsePositive(event.target.value),
              }))
            }
          />
        )}
      </div>
      <Button className="mt-5" size="sm" loading={update.isPending} onClick={save}>
        <Save className="size-4" aria-hidden />
        حفظ المنتج
      </Button>
    </article>
  );
}

export function AdminCommercialConfig() {
  const session = useAdminSession();
  const catalog = useCommercialConfig();
  const canManage = session.data?.capabilities.includes("commercial:manage");

  if (session.isLoading || catalog.isLoading) {
    return (
      <div
        className="h-72 animate-pulse rounded-card bg-surface"
        aria-label="جارٍ تحميل إعدادات الأسعار"
      />
    );
  }
  if (!canManage) {
    return <ErrorState message="ليس لديك صلاحية إدارة الأسعار والكوتا." />;
  }
  if (!catalog.data || catalog.isError) {
    return (
      <ErrorState
        message="تعذر تحميل إعدادات الأسعار والكوتا."
        onRetry={() => void catalog.refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-card border border-primary/15 bg-gradient-to-l from-primary-tint to-surface p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-card bg-primary text-white">
            <BadgeDollarSign className="size-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-heading font-extrabold text-ink">الأسعار والكوتا</h1>
            <p className="mt-2 max-w-3xl text-small leading-6 text-body-text">
              عدّل أسعار الاشتراكات والإضافات وحدود الخطط من مكان واحد. الأسعار الجديدة تسري على
              عمليات الدفع الجديدة، وتُحدّث كوتا المستخدمين مع الحفاظ على ما استهلكوه.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-caption font-semibold text-body-text">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5">
            <ShieldCheck className="size-4 text-success" /> محفوظ في قاعدة البيانات
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5">
            <CalendarClock className="size-4 text-primary" /> الدفع الجاري يحتفظ بشروطه
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5">
            <Sparkles className="size-4 text-primary" /> يظهر للعملاء تلقائيًا
          </span>
        </div>
      </header>

      <section>
        <h2 className="mb-4 text-title font-extrabold text-ink">حدود الخطط الشهرية</h2>
        <div className="grid gap-5 xl:grid-cols-3">
          {planOrder.map((planType) => (
            <PlanEditor
              key={`${planType}:${JSON.stringify(catalog.data.plans[planType])}`}
              planType={planType}
              initial={catalog.data.plans[planType]}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-title font-extrabold text-ink">الاشتراكات والإضافات</h2>
        <div className="grid gap-5 xl:grid-cols-2">
          {productOrder.map((paymentType) => (
            <ProductEditor
              key={`${paymentType}:${JSON.stringify(catalog.data.products[paymentType])}`}
              product={catalog.data.products[paymentType]!}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
