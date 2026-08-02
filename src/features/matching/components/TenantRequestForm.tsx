"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ShieldQuestion, Sparkles } from "lucide-react";
import { InputField, TextAreaField } from "@/src/components/ui/Field";
import { ChipGroup } from "@/src/components/ui/Chip";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/components/ui/Toast";
import { formatNumber } from "@/src/utils/format";
import { useCreateTenantRequest, useExtractTenantRequest } from "../hooks/useTenantRequests";
import {
  CreateTenantRequestSchema,
  type TenantRequestExtractionResponse,
  type TenantRequestSuggestionField,
  type CreateTenantRequest,
} from "@/src/lib/api/contracts/tenantRequest";
import type { ActionError } from "@/src/lib/api/actionError";
import { propertyTypeLabels, type PropertyType } from "@/src/lib/api/contracts/property";
import { VerificationGate } from "@/src/features/ekyc/components/VerificationGate";

const defaults: CreateTenantRequest = {
  minBudget: 2000,
  maxBudget: 5000,
  preferredLocations: "",
  propertyType: "APARTMENT",
  requiredBedrooms: 2,
  needsFurnished: false,
  flexibilityScore: 5,
  lifestyleRequirements: "",
};

const suggestionFields = [
  "minBudget",
  "maxBudget",
  "preferredLocations",
  "propertyType",
  "requiredBedrooms",
  "needsFurnished",
  "flexibilityScore",
  "lifestyleRequirements",
] as const satisfies readonly TenantRequestSuggestionField[];

const missingFieldLabels: Record<TenantRequestSuggestionField, string> = {
  minBudget: "الحد الأدنى للميزانية",
  maxBudget: "الحد الأقصى للميزانية",
  preferredLocations: "المنطقة المفضلة",
  propertyType: "نوع العقار",
  requiredBedrooms: "عدد الغرف",
  needsFurnished: "حالة الفرش",
  flexibilityScore: "درجة المرونة",
  lifestyleRequirements: "التفضيلات والاحتياجات",
};

function extractionErrorMessage(error: ActionError): string {
  if (error.code === "TENANT_REQUEST_EXTRACTION_UNAVAILABLE")
    return "المساعد مش متاح حاليًا. تقدر تكمّل البيانات يدويًا وتحاول تاني بعدين.";
  if (error.code === "TENANT_REQUEST_EXTRACTION_TIMEOUT")
    return "تحليل الطلب أخد وقت أطول من المتوقع. تقدر تحاول تاني أو تكمّل يدويًا.";
  if (error.code === "TENANT_REQUEST_EXTRACTION_INVALID_RESPONSE")
    return "مقدرناش نحوّل الوصف لبيانات بشكل موثوق. راجع الطلب أو كمّل البيانات يدويًا.";
  return error.message;
}

/**
 * PRO-05 — the tenant posts what they're looking for and verified landlords
 * come to them. The request enters PENDING for admin approval (anti-spam,
 * SRS 3.2.2); nothing is published until then, so the success copy says so.
 */
export function TenantRequestForm() {
  return (
    <VerificationGate verificationPath="/verify">
      <TenantRequestFormContent />
    </VerificationGate>
  );
}

function TenantRequestFormContent() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateTenantRequest();
  const extract = useExtractTenantRequest();
  const [naturalLanguageText, setNaturalLanguageText] = useState("");
  const [missingFields, setMissingFields] = useState<TenantRequestSuggestionField[]>([]);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractionSuccess, setExtractionSuccess] = useState(false);
  const extractionVersion = useRef(0);
  const form = useForm<CreateTenantRequest>({
    resolver: zodResolver(CreateTenantRequestSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  const {
    register,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = form;

  const isMissing = (field: TenantRequestSuggestionField) => missingFields.includes(field);

  async function extractSuggestions() {
    const text = naturalLanguageText.trim();
    setExtractionError(null);
    setExtractionSuccess(false);
    if (!text) {
      setExtractionError("اكتب وصفًا مختصرًا لاحتياجاتك أولًا، أو كمّل البيانات يدويًا.");
      return;
    }
    if (text.length > 2000) {
      setExtractionError("الوصف طويل جدًا. اكتب حتى 2000 حرف.");
      return;
    }

    const requestVersion = ++extractionVersion.current;
    const valuesAtRequestStart = getValues();
    try {
      const response = await extract.mutateAsync({ text });
      if (requestVersion !== extractionVersion.current) return;
      applySuggestions(response, valuesAtRequestStart);
      setMissingFields(response.missingFields);
      setExtractionSuccess(true);
    } catch (error) {
      if (requestVersion !== extractionVersion.current) return;
      setExtractionError(extractionErrorMessage(error as ActionError));
    }
  }

  function applySuggestions(
    response: TenantRequestExtractionResponse,
    valuesAtRequestStart: CreateTenantRequest,
  ) {
    for (const field of suggestionFields) {
      const suggestion = response.suggestions[field];
      // A manual edit made while waiting, or a newer request, always wins.
      if (suggestion !== null && getValues(field) === valuesAtRequestStart[field]) {
        setValue(field, suggestion as never, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    }
  }

  function submit(values: CreateTenantRequest) {
    create.mutate(values, {
      onSuccess: () => {
        toast("success", "تم إرسال طلبك للمراجعة");
        router.push("/tenant/requests");
      },
      onError: (e) => {
        if (e.code === "VERIFICATION_REQUIRED") {
          toast("info", e.message);
        } else {
          toast("error", e.message);
        }
      },
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-h1 font-bold text-ink">اطلب سكنك</h1>
        <p className="mt-1 text-small text-muted">
          اكتب ما تبحث عنه، ويصلك عرض من الملّاك الموثّقين مباشرة — بدون وسيط.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-5">
        <section className="flex flex-col gap-3 rounded-card border border-primary/20 bg-primary-tint/40 p-5">
          <div>
            <h2 className="text-small font-bold text-ink">اوصف العقار اللي محتاجه</h2>
            <p className="mt-1 text-caption text-muted">
              ممكن تكمّل البيانات يدويًا، أو تستخدم المساعد عشان يقترح قيم تراجعها وتعدّلها.
            </p>
          </div>
          <TextAreaField
            label="اوصف العقار اللي محتاجه"
            value={naturalLanguageText}
            onChange={(event) => {
              setNaturalLanguageText(event.target.value);
              setExtractionError(null);
            }}
            maxLength={2000}
            placeholder="مثال: عايز شقة مفروشة غرفتين في حي الجامعة وميزانيتي من 7000 لـ 9000 جنيه وتكون في مكان هادي"
            hint="اختياري — المساعد يقترح بيانات فقط، وإنت تراجعها قبل الإرسال."
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={extractSuggestions}
              loading={extract.isPending}
            >
              <Sparkles className="size-4" aria-hidden />
              ساعدني أملأ الطلب
            </Button>
            {extract.isPending && (
              <p className="text-caption text-muted">بنحلل طلبك ونجهّز اقتراحات للبيانات...</p>
            )}
          </div>
          {extractionError && (
            <p role="alert" className="text-caption text-error">
              {extractionError}
            </p>
          )}
          {extractionSuccess && (
            <p className="text-caption text-success">
              ضفنا الاقتراحات. راجع كل البيانات وعدّل أي حاجة قبل إرسال الطلب.
            </p>
          )}
          {missingFields.length > 0 && (
            <div className="rounded-control border border-warning/30 bg-surface px-3 py-2 text-caption text-body-text">
              <p>محتاجين منك تكمّل الحقول المحددة قبل إرسال الطلب.</p>
              <ul className="mt-1 list-inside list-disc">
                {missingFields.map((field) => (
                  <li key={field}>{missingFieldLabels[field]}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="أقل ميزانية (ج.م)"
              type="number"
              inputMode="numeric"
              required
              {...register("minBudget", { valueAsNumber: true })}
              error={
                errors.minBudget?.message ??
                (isMissing("minBudget") ? "محتاجين منك تكمّل هذا الحقل." : undefined)
              }
            />
            <InputField
              label="أعلى ميزانية (ج.م)"
              type="number"
              inputMode="numeric"
              required
              {...register("maxBudget", { valueAsNumber: true })}
              error={
                errors.maxBudget?.message ??
                (isMissing("maxBudget") ? "محتاجين منك تكمّل هذا الحقل." : undefined)
              }
            />
          </div>
          <InputField
            label="المناطق المفضلة"
            placeholder="حي الجامعة، توريل، المشاية"
            hint="اذكر أكثر من منطقة لزيادة فرص وصول العروض."
            required
            {...register("preferredLocations")}
            error={
              errors.preferredLocations?.message ??
              (isMissing("preferredLocations") ? "محتاجين منك تكمّل هذا الحقل." : undefined)
            }
          />
        </section>

        <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5">
          <Controller
            control={control}
            name="propertyType"
            render={({ field }) => (
              <ChipGroup
                label="نوع العقار"
                options={(Object.keys(propertyTypeLabels) as PropertyType[]).map((v) => ({
                  value: v,
                  label: propertyTypeLabels[v],
                }))}
                value={field.value}
                onChange={field.onChange}
                error={
                  errors.propertyType?.message ??
                  (isMissing("propertyType") ? "محتاجين منك تكمّل هذا الحقل." : undefined)
                }
              />
            )}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="عدد غرف النوم المطلوبة"
              type="number"
              inputMode="numeric"
              required
              {...register("requiredBedrooms", { valueAsNumber: true })}
              error={
                errors.requiredBedrooms?.message ??
                (isMissing("requiredBedrooms") ? "محتاجين منك تكمّل هذا الحقل." : undefined)
              }
            />
            <label className="flex cursor-pointer items-end gap-2 pb-3 text-small text-body-text">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                {...register("needsFurnished")}
              />
              أحتاج وحدة مفروشة
            </label>
            {isMissing("needsFurnished") && (
              <p className="text-caption text-warning">محتاجين منك تحدد حالة الفرش.</p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5">
          <Controller
            control={control}
            name="flexibilityScore"
            render={({ field }) => (
              <FlexibilitySlider
                value={field.value}
                onChange={field.onChange}
                missing={isMissing("flexibilityScore")}
              />
            )}
          />
          <TextAreaField
            label="ما الذي تبحث عنه بالضبط؟"
            required
            className="min-h-36"
            placeholder="أبحث عن شقة هادئة قريبة من جامعة المنصورة، يفضّل دور عالٍ وقريبة من المواصلات…"
            hint="اكتب بحرية — نستخدم هذا النص في المطابقة الذكية مع عقارات الملّاك."
            {...register("lifestyleRequirements")}
            error={
              errors.lifestyleRequirements?.message ??
              (isMissing("lifestyleRequirements") ? "محتاجين منك تكمّل هذا الحقل." : undefined)
            }
          />
        </section>

        <p className="flex items-start gap-2 rounded-control bg-trust-blue-tint px-3.5 py-2.5 text-caption leading-relaxed text-body-text">
          <ShieldQuestion className="mt-0.5 size-4 shrink-0" aria-hidden />
          بياناتك الشخصية لا تظهر للملّاك — يرون تفاصيل الطلب فقط، ولا يصلهم رقمك إلا بعد قبولك لعرض
          منهم.
        </p>

        <Button type="submit" size="lg" block loading={create.isPending}>
          <Check className="size-4" aria-hidden />
          إرسال الطلب للمراجعة
        </Button>
      </form>
    </div>
  );
}

/** ERD: `flexibility_score` 1–10 — how much the matcher may bend the criteria. */
function FlexibilitySlider({
  value,
  onChange,
  missing,
}: {
  value: number;
  onChange: (v: number) => void;
  missing: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor="flexibility" className="text-small font-semibold text-ink">
          مدى مرونتك في الشروط
        </label>
        <span className="rounded-pill bg-primary-tint px-2.5 py-0.5 text-caption font-bold text-primary">
          {formatNumber(value)} / {formatNumber(10)}
        </span>
      </div>
      <input
        id="flexibility"
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-caption text-muted">
        <span>شروطي ثابتة</span>
        <span>مرن جدًا</span>
      </div>
      {missing && <p className="text-caption text-warning">محتاجين منك تحدد درجة المرونة.</p>}
    </div>
  );
}
