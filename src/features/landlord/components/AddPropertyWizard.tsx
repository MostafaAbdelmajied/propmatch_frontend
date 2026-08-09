"use client";

import { Button } from "@/src/components/ui/Button";
import { ChipGroup } from "@/src/components/ui/Chip";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { InputField, SelectField, TextAreaField } from "@/src/components/ui/Field";
import { QuotaChip } from "@/src/components/ui/QuotaChip";
import { useToast } from "@/src/components/ui/Toast";
import { useActiveRegions } from "@/src/features/admin/hooks/useRegions";
import { VerificationGate } from "@/src/features/ekyc/components/VerificationGate";
import { PaymentSheet } from "@/src/features/payments/PaymentSheet";
import type { ActionError } from "@/src/lib/api/actionError";
import type { CheckoutPaymentType } from "@/src/lib/api/contracts/payment";
import { propertyTypeLabels, type PropertyType } from "@/src/lib/api/contracts/property";
import { cn } from "@/src/utils/cn";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GripVertical,
  ImagePlus,
  Sparkles,
  Star,
  Undo2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { useCreateProperty, useQuota, useStreamOptimizeDescription } from "../hooks/useLandlord";
import { addPropertyFormSchema, stepFields, type AddPropertyForm } from "../validation/schemas";
import { clearPropertyDraft, loadPropertyDraft, savePropertyDraft } from "../propertyDraftDb";

const steps = ["تفاصيل العقار", "الصور والخدمات", "تحسين الوصف والإنهاء"] as const;
const REVIEW_STEP_INDEX = steps.length - 1;
const REVIEW_SUBMISSION_ARM_DELAY_MS = 600;
type StepKey = keyof typeof stepFields;
const stepKeys: StepKey[] = ["propertyDetails", "mediaAndServices", "aiOptimization"];
const MAX_PROPERTY_IMAGES = 10;
const MAX_PROPERTY_IMAGE_SIZE = 5 * 1024 * 1024;
const PROPERTY_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
/** Debounce IndexedDB writes — form.watch fires on every keystroke, and each
 * write now clones the full image File set (not just text), so writing on
 * every keystroke would be wasteful. */
const DRAFT_SAVE_DEBOUNCE_MS = 500;

const defaults: Partial<AddPropertyForm> = {
  governorate: "الدقهلية",
  city: "المنصورة",
  district: "",
  manualAddress: "",
  title: "",
  propertyType: "APARTMENT",
  rentAmount: 3000,
  areaM2: 100,
  bedrooms: 2,
  bathrooms: 1,
  isFurnished: false,
  hasElevator: true,
  hasParking: false,
  description: "",
  propertyAroundServices: "",
  images: [],
};

export function AddPropertyWizard() {
  return (
    <VerificationGate verificationPath="/landlord/verify">
      <AddPropertyWizardContent />
    </VerificationGate>
  );
}

function AddPropertyWizardContent() {
  const router = useRouter();
  const toast = useToast();
  const quota = useQuota();
  const form = useForm<AddPropertyForm>({
    resolver: zodResolver(addPropertyFormSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  const [step, setStep] = useState(0);
  const [draftRestored, setDraftRestored] = useState(false);
  const [optimizerUsesLeft, setOptimizerUsesLeft] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [reviewSubmissionReady, setReviewSubmissionReady] = useState(false);
  const [reviewConfirmationOpen, setReviewConfirmationOpen] = useState(false);
  const create = useCreateProperty();
  const [paywall, setPaywall] = useState<CheckoutPaymentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const draft = await loadPropertyDraft();
        if (cancelled) return;
        if (draft?.values && typeof draft.step === "number") {
          form.reset({ ...defaults, ...draft.values } as AddPropertyForm);
          setStep(Math.max(0, Math.min(draft.step, steps.length - 1)));
          if (
            typeof draft.optimizerUsesLeft === "number" &&
            draft.optimizerUsesLeft >= 0 &&
            Number.isSafeInteger(draft.optimizerUsesLeft)
          ) {
            setOptimizerUsesLeft(draft.optimizerUsesLeft);
          }
        }
      } catch {
        await clearPropertyDraft();
      } finally {
        if (!cancelled) setDraftRestored(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form]);

  useEffect(() => {
    if (quota.data) setOptimizerUsesLeft(quota.data.optimizerUsesLeft);
  }, [quota.data]);

  useEffect(() => {
    if (step !== REVIEW_STEP_INDEX) return;

    // The next and review buttons occupy the same place. Arm the consequential
    // action only after the click/tap that advanced the wizard has fully
    // finished, so a rapid second click cannot land on the newly mounted
    // review button and create a property accidentally.
    const timer = window.setTimeout(
      () => setReviewSubmissionReady(true),
      REVIEW_SUBMISSION_ARM_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (!draftRestored) return;

    let debounceTimer: number | null = null;
    const saveDraft = (values: Partial<AddPropertyForm>) => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        // Images kept intact — IndexedDB (unlike the old localStorage cache)
        // natively stores File objects, so uploaded photos survive a remount.
        void savePropertyDraft({ step, values, optimizerUsesLeft });
      }, DRAFT_SAVE_DEBOUNCE_MS);
    };
    saveDraft(form.getValues());
    const subscription = form.watch((values) => {
      saveDraft(values as Partial<AddPropertyForm>);
    });
    return () => {
      subscription.unsubscribe();
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    };
  }, [draftRestored, form, optimizerUsesLeft, step]);

  async function next() {
    const fields = stepFields[stepKeys[step]] as unknown as (keyof AddPropertyForm)[];
    if (await form.trigger(fields)) {
      const nextStep = Math.min(step + 1, REVIEW_STEP_INDEX);
      if (nextStep === REVIEW_STEP_INDEX) setReviewSubmissionReady(false);
      setStep(nextStep);
    } else {
      // Never leave the button feeling dead — tell the user why it didn't advance.
      const firstError = Object.keys(form.formState.errors)[0];
      toast(
        "error",
        firstError === "images"
          ? "أضف صورة واحدة على الأقل للعقار قبل المتابعة"
          : "يرجى إكمال الحقول المطلوبة قبل المتابعة",
      );
    }
  }

  /** Submit blocked by validation must never fail silently. Jump to the step
   * that owns the first offending field — e.g. images (step 2) are dropped from
   * the persisted draft, so after a reload the submit on step 3 would otherwise
   * do nothing — and tell the user. */
  function onInvalid(errors: typeof form.formState.errors) {
    const firstErrorField = Object.keys(errors)[0] ?? "";
    const targetStep = stepKeys.findIndex((key) =>
      (stepFields[key] as readonly string[]).includes(firstErrorField),
    );
    if (targetStep >= 0 && targetStep !== step) setStep(targetStep);
    const isImages = firstErrorField === "images";
    toast(
      "error",
      isImages
        ? "أضف صورة واحدة على الأقل للعقار قبل الإرسال"
        : "يرجى مراجعة الحقول المطلوبة قبل الإرسال",
    );
  }

  function submit(values: AddPropertyForm) {
    if (isOptimizing) {
      toast("info", "انتظر حتى يكتمل تحسين الوصف قبل إرسال العقار للمراجعة");
      return;
    }
    create.mutate(values, {
      onSuccess: () => {
        setReviewConfirmationOpen(false);
        void clearPropertyDraft();
        // ERD: PROPERTY.status defaults to PENDING — admin must approve (PRO-04).
        toast("success", "تم إرسال إعلانك للمراجعة");
        router.push("/landlord");
      },
      onError: (e) => {
        setReviewConfirmationOpen(false);
        if (e.code === "VERIFICATION_REQUIRED") {
          toast("info", e.message);
        } else if (e.code === "PLAN_LIMIT_REACHED") {
          setPaywall("EXTRA_LISTING_60D");
        } else {
          toast("error", e.message);
        }
      },
    });
  }

  /** Native form submission is intentionally disabled. Property creation is
   * a consequential action and may only start from the dedicated review
   * button below — never from Enter, an optimizer click, or another control
   * inside the wizard. Keyboard activation of that button still calls its
   * onClick handler, so the explicit action remains accessible. */
  function preventImplicitSubmission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function requestReviewConfirmation() {
    if (!reviewSubmissionReady) return;
    if (isOptimizing) {
      toast("info", "انتظر حتى يكتمل تحسين الوصف قبل إرسال العقار للمراجعة");
      return;
    }
    void form.handleSubmit(() => setReviewConfirmationOpen(true), onInvalid)();
  }

  function confirmSubmitForReview() {
    void form.handleSubmit(submit, (errors) => {
      setReviewConfirmationOpen(false);
      onInvalid(errors);
    })();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-h1 font-bold text-ink">إضافة عقار</h1>
            <p className="mt-1 text-small text-muted">أكمل بيانات عقارك، اختر الخدمات والصور، ثم حسّن الوصف وأرسله</p>
          </div>
          {quota.data && (
            <QuotaChip
              remaining={Math.max(0, quota.data.maxActiveListings - quota.data.activeUnitCount)}
              label={`وحدات نشطة متاحة من ${quota.data.maxActiveListings}`}
            />
          )}
        </div>
        <Stepper current={step} />
      </div>

      <form onSubmit={preventImplicitSubmission} className="flex flex-col gap-5">
        {step === 0 && <PropertyDetailsStep form={form} />}
        {step === 1 && <MediaAndServicesStep form={form} />}
        {step === 2 && (
          <OptimizationAndReviewStep
            form={form}
            optimizerUsesLeft={optimizerUsesLeft}
            onOptimizerUse={() => setOptimizerUsesLeft((uses) => Math.max(0, uses - 1))}
            onAiPaywall={() => setPaywall("AI_USES_10_90D")}
            onOptimizerStateChange={setIsOptimizing}
          />
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 0}
            onClick={() => {
              setReviewSubmissionReady(false);
              setStep((s) => Math.max(0, s - 1));
            }}
          >
            <ArrowRight className="size-4" aria-hidden />
            السابق
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={next}>
              التالي
              <ArrowLeft className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={requestReviewConfirmation}
              loading={create.isPending}
              disabled={isOptimizing || !reviewSubmissionReady}
            >
              <Check className="size-4" aria-hidden />
              {isOptimizing ? "جارٍ تحسين الوصف..." : "إرسال للمراجعة"}
            </Button>
          )}
        </div>
      </form>

      <PaymentSheet
        open={paywall !== null}
        onClose={() => setPaywall(null)}
        paymentType={paywall ?? "EXTRA_LISTING_60D"}
        onActivated={() => {
          const activatedType = paywall;
          setPaywall(null);
          toast(
            "success",
            activatedType === "AI_USES_10_90D"
              ? "تمت إضافة استخدام الذكاء الاصطناعي"
              : "تم تفعيل الخطة المميزة — يمكنك إضافة وحدتك الآن",
          );
          quota.refetch();
        }}
      />

      <ConfirmDialog
        open={reviewConfirmationOpen}
        title="إرسال العقار للمراجعة"
        message="هل أنت متأكد من اكتمال بيانات العقار وترغب في إرساله الآن؟ بعد الإرسال سيظهر العقار لفريق الإدارة للمراجعة قبل نشره."
        confirmLabel="نعم، إرسال للمراجعة"
        cancelLabel="العودة للتعديل"
        loading={create.isPending}
        onConfirm={confirmSubmitForReview}
        onCancel={() => setReviewConfirmationOpen(false)}
      />
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="relative mt-6 grid grid-cols-3">
      <li
        aria-hidden
        className={cn(
          "absolute left-1/6 right-1/6 top-5 h-0.5 -translate-y-1/2 transition-colors",
          current > 0 ? "bg-primary" : "bg-hairline",
        )}
      />
      {steps.map((label, i) => (
        <li key={label} className="relative z-10 flex flex-col items-center gap-2">
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-full border-4 border-surface text-small font-bold shadow-sm transition-colors",
              i < current && "bg-success text-white",
              i === current && "bg-primary text-white",
              i > current && "bg-background text-muted",
            )}
          >
            {i < current ? <Check className="size-4" aria-hidden /> : i + 1}
          </span>
          <span
            className={cn(
              "text-center text-small",
              i === current ? "font-bold text-primary" : "font-medium text-muted",
            )}
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

type StepProps = { form: UseFormReturn<AddPropertyForm> };

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5">
      {children}
    </div>
  );
}

function PropertyDetailsStep({
  form: {
    watch,
    setValue,
    register,
    control,
    formState: { errors },
  },
}: StepProps) {
  const { data: activeCountries, isLoading } = useActiveRegions();

  const selectedGovName = watch("governorate");
  const selectedCityName = watch("city");

  const activeGovernorates =
    activeCountries?.flatMap((c) => c.governorates.filter((g) => g.status)) ?? [];

  const currentGov = activeGovernorates.find(
    (g) => g.nameAr === selectedGovName || g.nameEn === selectedGovName,
  );

  const activeCities = currentGov?.cities.filter((city) => city.status) ?? [];

  const currentCity = activeCities.find(
    (c) => c.nameAr === selectedCityName || c.nameEn === selectedCityName,
  );

  const activeDistricts = currentCity?.districts?.filter((d) => d.status) ?? [];

  const govOptions = activeGovernorates.map((g) => ({
    value: g.nameAr,
    label: `${g.nameAr} (${g.nameEn})`,
  }));

  const cityOptions = activeCities.map((c) => ({
    value: c.nameAr,
    label: `${c.nameAr} (${c.nameEn})`,
  }));

  const districtOptions = activeDistricts.map((d) => ({
    value: d.nameAr,
    label: `${d.nameAr} (${d.nameEn})`,
  }));

  const handleGovChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGov = e.target.value;
    setValue("governorate", newGov, { shouldValidate: true });

    const newGovObj = activeGovernorates.find((g) => g.nameAr === newGov || g.nameEn === newGov);
    const firstCityObj = newGovObj?.cities.filter((c) => c.status)[0];
    const firstCity = firstCityObj?.nameAr ?? "";
    setValue("city", firstCity, { shouldValidate: true });

    const firstDistrict = firstCityObj?.districts?.filter((d) => d.status)[0]?.nameAr ?? "";
    setValue("district", firstDistrict, { shouldValidate: true });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCity = e.target.value;
    setValue("city", newCity, { shouldValidate: true });

    const newCityObj = activeCities.find((c) => c.nameAr === newCity || c.nameEn === newCity);
    const firstDistrict = newCityObj?.districts?.filter((d) => d.status)[0]?.nameAr ?? "";
    setValue("district", firstDistrict, { shouldValidate: true });
  };

  return (
    <Card>
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
          />
        )}
      />
      <InputField
        label="عنوان الإعلان"
        placeholder="شقة مفروشة قرب جامعة المنصورة"
        {...register("title")}
        error={errors.title?.message}
      />
      <InputField
        label="الإيجار الشهري (ج.م)"
        type="number"
        inputMode="numeric"
        {...register("rentAmount", { valueAsNumber: true })}
        error={errors.rentAmount?.message}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="المحافظة"
          options={govOptions}
          placeholder={isLoading ? "جاري تحميل المحافظات..." : "اختر المحافظة"}
          value={selectedGovName}
          onChange={handleGovChange}
          error={errors.governorate?.message}
        />
        <SelectField
          label="المدينة"
          options={cityOptions}
          placeholder={
            isLoading
              ? "جاري تحميل المدن..."
              : !selectedGovName
                ? "اختر المحافظة أولاً"
                : cityOptions.length === 0
                  ? "لا يوجد مدن متاحة"
                  : "اختر المدينة"
          }
          value={selectedCityName}
          onChange={handleCityChange}
          error={errors.city?.message}
          disabled={!selectedGovName || cityOptions.length === 0}
        />
      </div>
      {districtOptions.length > 0 ? (
        <SelectField
          label="الحي / المنطقة"
          options={districtOptions}
          placeholder="اختر الحي / المنطقة"
          {...register("district")}
          error={errors.district?.message}
        />
      ) : (
        <InputField
          label="الحي / المنطقة"
          placeholder="مثال: حي الجامعة"
          {...register("district")}
          error={errors.district?.message}
        />
      )}
      <InputField
        label="العنوان التفصيلي"
        hint="لا يظهر للمستأجرين إلا بعد قبول العرض والتواصل."
        {...register("manualAddress")}
        error={errors.manualAddress?.message}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <InputField
          label="المساحة (م²)"
          type="number"
          inputMode="numeric"
          {...register("areaM2", { valueAsNumber: true })}
          error={errors.areaM2?.message}
        />
        <InputField
          label="عدد غرف النوم"
          type="number"
          inputMode="numeric"
          {...register("bedrooms", { valueAsNumber: true })}
          error={errors.bedrooms?.message}
        />
        <InputField
          label="عدد الحمّامات"
          type="number"
          inputMode="numeric"
          {...register("bathrooms", { valueAsNumber: true })}
          error={errors.bathrooms?.message}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <Toggle label="مفروش" {...register("isFurnished")} />
        <Toggle label="يوجد أسانسير" {...register("hasElevator")} />
        <Toggle label="يوجد جراج" {...register("hasParking")} />
      </div>
    </Card>
  );
}

function MediaAndServicesStep({ form }: StepProps) {
  const toast = useToast();
  const images = form.watch("images");
  const previews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images],
  );
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const PREDEFINED_SERVICES = [
    "جامعة",
    "مواصلات",
    "سوبر ماركت",
    "صيدلية",
    "مستشفى",
    "مدرسة",
    "مسجد",
    "نادي رياضي",
    "مركز تسوق",
    "مطاعم وكافيهات",
    "حديقة عامة",
  ];

  const initialServices = form.watch("propertyAroundServices");
  const [tags, setTags] = useState<string[]>(() => {
    if (!initialServices) return [];
    return initialServices
      .split(/[،,]/)
      .map((s: string) => s.trim())
      .filter(Boolean);
  });

  const [customTag, setCustomTag] = useState("");

  useEffect(() => {
    form.setValue("propertyAroundServices", tags.join("، "), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [tags, form]);

  function handleToggleTag(tag: string) {
    if (tags.includes(tag)) {
      setTags((prev) => prev.filter((t) => t !== tag));
    } else {
      setTags((prev) => [...prev, tag]);
    }
  }

  function handleAddCustomTag() {
    const trimmed = customTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setCustomTag("");
  }

  function handleCustomTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustomTag();
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }

  function handleFileDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    if (images.length >= MAX_PROPERTY_IMAGES) {
      toast("info", "لقد وصلت للحد الأقصى من الصور");
      return;
    }

    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    if (droppedFiles.length === 0) return;

    const supported = droppedFiles.filter((file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type),
    );
    const withinSizeLimit = supported.filter((file) => file.size <= MAX_PROPERTY_IMAGE_SIZE);
    const remainingSlots = MAX_PROPERTY_IMAGES - images.length;
    const nextImages = [...images, ...withinSizeLimit.slice(0, remainingSlots)];

    if (supported.length !== droppedFiles.length) {
      toast("error", "يُسمح فقط بصور JPG وJPEG وPNG وWEBP");
    } else if (withinSizeLimit.length !== supported.length) {
      toast("error", "يجب ألا يتجاوز حجم الصورة الواحدة 5 ميجابايت");
    } else if (withinSizeLimit.length > remainingSlots) {
      toast("info", "يمكنك إضافة 10 صور كحد أقصى");
    }

    form.setValue("images", nextImages, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  function selectImages(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const supported = selected.filter((file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type),
    );
    const withinSizeLimit = supported.filter((file) => file.size <= MAX_PROPERTY_IMAGE_SIZE);
    const remainingSlots = MAX_PROPERTY_IMAGES - images.length;
    const nextImages = [...images, ...withinSizeLimit.slice(0, remainingSlots)];

    if (supported.length !== selected.length) {
      toast("error", "يُسمح فقط بصور JPG وJPEG وPNG وWEBP");
    } else if (withinSizeLimit.length !== supported.length) {
      toast("error", "يجب ألا يتجاوز حجم الصورة الواحدة 5 ميجابايت");
    } else if (withinSizeLimit.length > remainingSlots) {
      toast("info", "يمكنك إضافة 10 صور كحد أقصى");
    }

    form.setValue("images", nextImages, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    event.target.value = "";
  }

  function removeImage(index: number) {
    form.setValue(
      "images",
      images.filter((_, imageIndex) => imageIndex !== index),
      { shouldDirty: true, shouldTouch: true, shouldValidate: true },
    );
  }

  function reorderImages(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const reordered = [...images];
    const [movedImage] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedImage);
    form.setValue("images", reordered, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function startDragging(event: React.DragEvent<HTMLElement>, index: number) {
    setDraggedImageIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }

  function dropImage(event: React.DragEvent<HTMLElement>, toIndex: number) {
    event.preventDefault();
    const transferredIndex = Number(event.dataTransfer.getData("text/plain"));
    const fromIndex = draggedImageIndex ?? transferredIndex;
    if (Number.isInteger(fromIndex) && fromIndex >= 0 && fromIndex < images.length) {
      reorderImages(fromIndex, toIndex);
    }
    setDraggedImageIndex(null);
  }

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <label className="text-small font-bold text-ink">
          الخدمات المحيطة <span className="text-error">*</span>
        </label>
        <p className="text-caption text-muted">
          تُستخدم في المطابقة الذكية — اختر خدمة واحدة على الأقل أو أضف خدمات مخصصة.
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 rounded-card border border-hairline bg-background/50 p-2.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-pill bg-primary/10 px-2.5 py-0.5 text-caption font-bold text-primary-dark"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className="rounded-full hover:bg-primary/20 p-0.5"
                  title="إزالة"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {PREDEFINED_SERVICES.map((service) => {
            const isSelected = tags.includes(service);
            return (
              <button
                key={service}
                type="button"
                onClick={() => handleToggleTag(service)}
                className={cn(
                  "rounded-pill px-3 py-1 text-caption font-semibold transition-all border",
                  isSelected
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-ink border-hairline hover:border-primary/50 hover:bg-primary-tint/10",
                )}
              >
                {isSelected ? `✓ ${service}` : service}
              </button>
            );
          })}
        </div>

        <div className="flex items-stretch gap-2 mt-1">
          <input
            type="text"
            placeholder="أضف خدمة محيطة مخصصة (مثال: محطة قطار)..."
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={handleCustomTagKeyDown}
            className="flex-1 rounded-control border border-hairline bg-surface px-3 py-1.5 text-small placeholder-muted focus:border-primary focus:outline-none"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddCustomTag}
            disabled={!customTag.trim()}
          >
            إضافة
          </Button>
        </div>
        {form.formState.errors.propertyAroundServices && (
          <p className="text-caption text-error">{form.formState.errors.propertyAroundServices.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-hairline pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-small font-bold text-ink">صور العقار</h2>
            <p className="mt-1 text-caption text-muted">
              اسحب الصور لتغيير ترتيب ظهورها في الإعلان
            </p>
          </div>
          <span className="rounded-pill bg-primary-tint px-2.5 py-1 text-caption font-bold text-primary">
            {images.length} / {MAX_PROPERTY_IMAGES}
          </span>
        </div>

        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleFileDrop}
          className={cn(
            "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-4 py-7 text-center transition-colors",
            isDragOver
              ? "border-primary bg-primary-tint/40"
              : "border-primary/30 bg-primary-tint/30 hover:border-primary hover:bg-primary-tint",
            images.length >= MAX_PROPERTY_IMAGES && "pointer-events-none opacity-50",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-surface text-primary shadow-sm transition-transform group-hover:scale-105">
            <ImagePlus className="size-5" aria-hidden />
          </span>
          <span className="text-small font-bold text-primary">اسحب صور العقار هنا أو اخترها</span>
          <span className="text-caption text-muted">
            JPG أو JPEG أو PNG أو WEBP — حتى 5 ميجابايت للصورة وبحد أقصى 10 صور
          </span>
          <input
            type="file"
            accept={PROPERTY_IMAGE_ACCEPT}
            multiple
            className="sr-only"
            disabled={images.length >= MAX_PROPERTY_IMAGES}
            onChange={selectImages}
          />
        </label>

        {previews.length > 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-small font-bold text-ink">
                <Star className="size-4 fill-primary text-primary" aria-hidden />
                الصورة الرئيسية للإعلان
              </div>
              <PropertyImagePreview
                file={previews[0].file}
                url={previews[0].url}
                index={0}
                isMain
                isDragging={draggedImageIndex === 0}
                onDragStart={startDragging}
                onDragEnd={() => setDraggedImageIndex(null)}
                onDrop={dropImage}
                onRemove={removeImage}
              />
            </div>

            {previews.length > 1 && (
              <div>
                <p className="mb-2 text-small font-semibold text-ink">باقي صور العقار</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {previews.slice(1).map(({ file, url }, previewIndex) => {
                    const index = previewIndex + 1;
                    return (
                      <PropertyImagePreview
                        key={`${file.name}-${file.lastModified}-${index}`}
                        file={file}
                        url={url}
                        index={index}
                        isDragging={draggedImageIndex === index}
                        onDragStart={startDragging}
                        onDragEnd={() => setDraggedImageIndex(null)}
                        onDrop={dropImage}
                        onRemove={removeImage}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {form.formState.errors.images && (
          <p className="text-caption text-error">{form.formState.errors.images.message}</p>
        )}
      </div>
    </Card>
  );
}

type OptimizationAndReviewStepProps = StepProps & {
  optimizerUsesLeft: number;
  onOptimizerUse: () => void;
  onAiPaywall: () => void;
  onOptimizerStateChange: (isOptimizing: boolean) => void;
};

/** Arabic labels for the toast listing which required fields are still
 * missing/invalid — every field the AI Optimizer needs as context (i.e.
 * everything from steps 1–2 except `description`, which the AI itself
 * produces, so requiring it up front would be a chicken-and-egg block). */
const REQUIRED_FIELD_LABELS: Partial<Record<keyof AddPropertyForm, string>> = {
  propertyType: "نوع العقار",
  title: "عنوان الإعلان",
  rentAmount: "السعر",
  governorate: "الموقع",
  city: "الموقع",
  district: "الموقع",
  manualAddress: "العنوان التفصيلي",
  areaM2: "المساحة",
  bedrooms: "عدد غرف النوم",
  bathrooms: "عدد الحمّامات",
  propertyAroundServices: "الخدمات المحيطة",
  images: "صور العقار",
};
const AI_OPTIMIZER_REQUIRED_FIELDS = [
  ...stepFields.propertyDetails,
  ...stepFields.mediaAndServices,
] as (keyof AddPropertyForm)[];

function OptimizationAndReviewStep({
  form,
  optimizerUsesLeft,
  onOptimizerUse,
  onAiPaywall,
  onOptimizerStateChange,
}: OptimizationAndReviewStepProps) {
  const toast = useToast();
  const optimize = useStreamOptimizeDescription();
  const values = form.getValues();
  const description = form.watch("description");
  const [previous, setPrevious] = useState<string | null>(null);

  async function runOptimize(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (optimize.isStreaming) return;

    // Hard gate: the optimizer needs every other field as context, so it
    // must never fire on an incomplete form — never a silent no-op, always
    // a toast naming exactly what's missing.
    const formIsValid = await form.trigger(AI_OPTIMIZER_REQUIRED_FIELDS);
    if (!formIsValid) {
      const missingLabels = Array.from(
        new Set(
          AI_OPTIMIZER_REQUIRED_FIELDS.filter((field) => form.formState.errors[field]).map(
            (field) => REQUIRED_FIELD_LABELS[field] ?? field,
          ),
        ),
      );
      toast(
        "error",
        missingLabels.length > 0
          ? `يرجى ملء الحقول التالية: ${missingLabels.join("، ")}`
          : "يرجى إكمال بيانات العقار قبل استخدام محسّن الوصف",
      );
      return;
    }

    if (optimizerUsesLeft <= 0) {
      onAiPaywall();
      return;
    }
    const original = description || "عقار للإيجار";
    setPrevious(original);
    const { description: _desc, images: _images, ...context } = form.getValues();
    onOptimizerStateChange(true);
    try {
      await optimize.run(original, context, (soFar) =>
        form.setValue("description", soFar, { shouldValidate: false }),
      );
      form.trigger("description");
      onOptimizerUse();
      const remainingAfterUse = Math.max(0, optimizerUsesLeft - 1);
      toast(
        "success",
        remainingAfterUse > 0
          ? `تم تحسين الوصف بنجاح بناءً على كافة بيانات العقار — متبقي ${remainingAfterUse}`
          : "تم تحسين الوصف — انتهى رصيد الذكاء الاصطناعي",
      );
    } catch (e) {
      const err = e as ActionError;
      form.setValue("description", original, { shouldValidate: true });
      setPrevious(null);
      if (err.code === "QUOTA_EXHAUSTED") {
        onAiPaywall();
        return;
      }
      toast("error", err.message);
    } finally {
      onOptimizerStateChange(false);
    }
  }

  function undo() {
    if (previous === null) return;
    form.setValue("description", previous, { shouldValidate: true });
    setPrevious(null);
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 rounded-card border border-primary/20 bg-primary-tint/30 p-4">
        <h2 className="text-small font-bold text-ink">ملخص بيانات العقار المجمّعة</h2>
        <div className="grid grid-cols-2 gap-2 text-caption text-body-text sm:grid-cols-3">
          <div><span className="font-semibold">العنوان:</span> {values.title || "غير محدد"}</div>
          <div><span className="font-semibold">النوع:</span> {propertyTypeLabels[values.propertyType]}</div>
          <div><span className="font-semibold">الإيجار:</span> {values.rentAmount} ج.م/شهر</div>
          <div><span className="font-semibold">الموقع:</span> {values.governorate}، {values.city} {values.district && `(${values.district})`}</div>
          <div><span className="font-semibold">المساحة:</span> {values.areaM2} م²</div>
          <div><span className="font-semibold">الغرف:</span> {values.bedrooms} نوم / {values.bathrooms} حمام</div>
          <div className="col-span-2 sm:col-span-3">
            <span className="font-semibold">الخدمات المحيطة:</span> {values.propertyAroundServices || "لا يوجد"}
          </div>
          <div className="col-span-2 sm:col-span-3">
            <span className="font-semibold">عدد الصور:</span> {values.images?.length ?? 0} صور مرفقة
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-hairline pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-small font-bold text-ink flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary shrink-0" aria-hidden />
              تحسين صيغة الوصف بالذكاء الاصطناعي (الخطوة الأخيرة)
            </h2>
            <p className="mt-1 text-caption text-muted">
              يقوم الذكاء الاصطناعي بصياغة وصف جذاب ومكتمل اعتماداً على كافة البيانات المحيطة والتفاصيل التي أدخلتها.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {previous !== null && !optimize.isStreaming && (
              <Button type="button" variant="ghost" size="sm" onClick={undo} className="whitespace-nowrap">
                <Undo2 className="size-4" aria-hidden />
                تراجع
              </Button>
            )}
            <button
              type="button"
              onClick={runOptimize}
              disabled={optimize.isStreaming}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-small font-bold text-white shadow-md transition-all whitespace-nowrap cursor-pointer shrink-0",
                optimizerUsesLeft > 0
                  ? "bg-gradient-to-l from-primary via-primary-dark to-primary hover:brightness-110 active:scale-98"
                  : "bg-surface border border-hairline text-ink hover:bg-background",
                optimize.isStreaming && "opacity-75 pointer-events-none",
              )}
            >
              <Sparkles className={cn("size-4 shrink-0", optimize.isStreaming && "animate-spin")} aria-hidden />
              <span>
                {optimize.isStreaming
                  ? "جارٍ تحسين الوصف..."
                  : optimizerUsesLeft > 0
                  ? "تحسين الوصف بالذكاء الاصطناعي"
                  : "شراء حزمة الذكاء الاصطناعي (10 استخدامات)"}
              </span>
            </button>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col gap-3 rounded-card border p-4 transition-all sm:flex-row sm:items-center sm:justify-between",
            optimizerUsesLeft > 0
              ? "border-primary/25 bg-primary-tint/40 shadow-xs"
              : "border-hairline bg-background",
          )}
          role="status"
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full shadow-xs",
                optimizerUsesLeft > 0 ? "bg-surface text-primary border border-primary/20" : "bg-hairline text-muted",
              )}
            >
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-small font-bold text-ink">
                {optimizerUsesLeft > 0
                  ? `متبقي ${optimizerUsesLeft} استخدامات في رصيدك`
                  : "انتهى رصيد الذكاء الاصطناعي الحالي"}
              </p>
              <p className="mt-0.5 text-caption text-muted">
                يمكنك استخدام الرصيد الحالي أو شراء حزمة إضافية (10 استخدامات بـ 39 ج.م، صالحة 90 يومًا).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0" aria-label={`${optimizerUsesLeft} محاولات تحسين متبقية`}>
            <span className="text-caption font-bold text-primary ml-1">
              {optimizerUsesLeft} متبقي
            </span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-3 w-6 rounded-pill transition-all duration-300 border",
                    index < optimizerUsesLeft
                      ? "bg-primary border-primary shadow-xs"
                      : "bg-surface border-hairline opacity-50",
                  )}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>

        <TextAreaField
          label="صيغة الوصف النهائية"
          placeholder="الوصف النهائي للعقار…"
          className="min-h-40"
          error={form.formState.errors.description?.message}
          {...form.register("description")}
        />
        {optimize.isStreaming && (
          <p className="flex items-center gap-1.5 text-caption text-muted" role="status">
            <Sparkles className="size-3.5 animate-pulse" aria-hidden />
            جارٍ كتابة الوصف وتنسيقه بالذكاء الاصطناعي…
          </p>
        )}
      </div>
    </Card>
  );
}

type PropertyImagePreviewProps = {
  file: File;
  url: string;
  index: number;
  isMain?: boolean;
  isDragging: boolean;
  onDragStart: (event: React.DragEvent<HTMLElement>, index: number) => void;
  onDragEnd: () => void;
  onDrop: (event: React.DragEvent<HTMLElement>, index: number) => void;
  onRemove: (index: number) => void;
};

function PropertyImagePreview({
  file,
  url,
  index,
  isMain = false,
  isDragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onRemove,
}: PropertyImagePreviewProps) {
  return (
    <article
      draggable
      onDragStart={(event) => onDragStart(event, index)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => onDrop(event, index)}
      className={cn(
        "group relative cursor-grab overflow-hidden rounded-card border bg-subtle shadow-sm transition-all active:cursor-grabbing",
        isMain ? "border-primary/40" : "border-hairline",
        isDragging && "scale-[0.98] border-primary opacity-50",
      )}
      aria-label={`${file.name}، الصورة رقم ${index + 1}`}
    >
      <img
        src={url}
        alt={`معاينة صورة العقار ${index + 1}`}
        draggable={false}
        className={cn("w-full object-cover", isMain ? "aspect-[16/8]" : "aspect-[4/3]")}
      />
      <span className="absolute right-2 top-2 flex items-center gap-1 rounded-pill bg-ink/75 px-2 py-1 text-caption font-semibold text-white">
        <GripVertical className="size-3.5" aria-hidden />
        اسحب
      </span>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute left-2 top-2 flex size-8 items-center justify-center rounded-full bg-ink/75 text-white transition-colors hover:bg-error"
        aria-label={`حذف صورة العقار ${index + 1}`}
      >
        <X className="size-4" aria-hidden />
      </button>
    </article>
  );
}

const Toggle = function Toggle({
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-small text-body-text">
      <input type="checkbox" className="size-4 accent-primary" {...rest} />
      {label}
    </label>
  );
};
