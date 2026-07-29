"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ImagePlus, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/Button";
import { InputField, SelectField, TextAreaField } from "@/src/components/ui/Field";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { ErrorState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { useActiveRegions } from "@/src/features/admin/hooks/useRegions";
import { useProperty } from "@/src/features/listings/hooks/useProperties";
import {
  propertyTypeLabels,
  type PropertyImage,
  type PropertyType,
} from "@/src/lib/api/contracts/property";
import { editPropertyFormSchema, type EditPropertyForm as FormValues } from "../validation/schemas";
import { useUpdateProperty } from "../hooks/useLandlord";

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function EditPropertyForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const toast = useToast();
  const propertyQuery = useProperty(propertyId);
  const regions = useActiveRegions();
  const update = useUpdateProperty(propertyId);
  const form = useForm<FormValues>({
    resolver: zodResolver(editPropertyFormSchema),
    defaultValues: {
      title: "",
      description: "",
      governorate: "",
      city: "",
      district: "",
      manualAddress: "",
      propertyType: "APARTMENT",
      propertyAroundServices: "",
      rentAmount: 0,
      areaM2: 0,
      bedrooms: 0,
      bathrooms: 0,
      isFurnished: false,
      hasElevator: false,
      hasParking: false,
      existingImageIds: [],
      newImages: [],
    },
    mode: "onTouched",
  });

  useEffect(() => {
    const property = propertyQuery.data;
    if (!property) return;
    form.reset({
      title: property.title,
      description: property.description,
      governorate: property.governorate,
      city: property.city,
      district: property.district,
      manualAddress: property.manualAddress ?? "",
      propertyType: property.propertyType,
      propertyAroundServices: property.propertyAroundServices ?? "",
      rentAmount: property.rentAmount,
      areaM2: property.areaM2,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      isFurnished: property.isFurnished,
      hasElevator: property.hasElevator,
      hasParking: property.hasParking,
      existingImageIds: property.images.map((image) => image.id),
      newImages: [],
    });
  }, [form, propertyQuery.data]);

  const retainedIds = useWatch({ control: form.control, name: "existingImageIds" });
  const newImages = useWatch({ control: form.control, name: "newImages" });
  const governorateValue = useWatch({ control: form.control, name: "governorate" });
  const cityValue = useWatch({ control: form.control, name: "city" });
  const retainedImages =
    propertyQuery.data?.images.filter((image) => retainedIds.includes(image.id)) ?? [];
  const previews = useMemo(
    () => newImages.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newImages],
  );
  useEffect(
    () => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)),
    [previews],
  );

  const activeGovernorates =
    regions.data?.flatMap((country) =>
      country.governorates.filter((governorate) => governorate.status),
    ) ?? [];
  const selectedGovernorate = activeGovernorates.find(
    (governorate) =>
      governorate.nameAr === governorateValue ||
      governorate.nameEn === governorateValue,
  );
  const activeCities = selectedGovernorate?.cities.filter((city) => city.status) ?? [];
  const selectedCity = activeCities.find(
    (city) => city.nameAr === cityValue || city.nameEn === cityValue,
  );
  const districts = selectedCity?.districts?.filter((district) => district.status) ?? [];

  function selectImages(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const supported = selected.filter(
      (file) => IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_SIZE,
    );
    const available = MAX_IMAGES - retainedImages.length - newImages.length;
    form.setValue("newImages", [...newImages, ...supported.slice(0, available)], {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (supported.length !== selected.length) {
      toast("error", "تأكد أن الصور JPG أو PNG أو WEBP وأقل من 5 ميجابايت");
    } else if (selected.length > available) {
      toast("info", "يمكنك الاحتفاظ بعشر صور كحد أقصى");
    }
    event.target.value = "";
  }

  function submit(values: FormValues) {
    update.mutate(values, {
      onSuccess: () => {
        toast("success", "تم حفظ التعديلات وإرسال العقار للمراجعة");
        router.push(`/landlord/properties/${propertyId}`);
      },
      onError: (error) => toast("error", error.message),
    });
  }

  if (propertyQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (propertyQuery.isError || !propertyQuery.data) {
    return <ErrorState onRetry={() => propertyQuery.refetch()} />;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="rounded-card border border-hairline bg-surface p-5">
        <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowRight className="size-4" aria-hidden />
          رجوع
        </Button>
        <h1 className="mt-3 text-h1 font-bold text-ink">تعديل العقار</h1>
        <p className="mt-1 text-small text-muted">
          بعد حفظ أي تعديل سيعود الإعلان إلى المراجعة ولن يظهر للمستأجرين حتى موافقة المشرف.
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(submit)}>
        <FormCard title="بيانات العقار">
          <Controller
            control={form.control}
            name="propertyType"
            render={({ field }) => (
              <SelectField
                label="نوع العقار"
                options={(Object.keys(propertyTypeLabels) as PropertyType[]).map((type) => ({
                  value: type,
                  label: propertyTypeLabels[type],
                }))}
                {...field}
              />
            )}
          />
          <InputField label="عنوان الإعلان" {...form.register("title")} error={form.formState.errors.title?.message} />
          <InputField
            label="الإيجار الشهري (ج.م)"
            type="number"
            {...form.register("rentAmount", { valueAsNumber: true })}
            error={form.formState.errors.rentAmount?.message}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="المحافظة"
              options={activeGovernorates.map((item) => ({
                value: item.nameAr,
                label: `${item.nameAr} (${item.nameEn})`,
              }))}
              value={governorateValue}
              onChange={(event) => {
                const governorate = activeGovernorates.find(
                  (item) => item.nameAr === event.target.value,
                );
                const city = governorate?.cities.find((item) => item.status);
                form.setValue("governorate", event.target.value, { shouldValidate: true });
                form.setValue("city", city?.nameAr ?? "", { shouldValidate: true });
                form.setValue(
                  "district",
                  city?.districts?.find((item) => item.status)?.nameAr ?? "",
                  { shouldValidate: true },
                );
              }}
              error={form.formState.errors.governorate?.message}
            />
            <SelectField
              label="المدينة"
              options={activeCities.map((item) => ({
                value: item.nameAr,
                label: `${item.nameAr} (${item.nameEn})`,
              }))}
              value={cityValue}
              onChange={(event) => {
                const city = activeCities.find((item) => item.nameAr === event.target.value);
                form.setValue("city", event.target.value, { shouldValidate: true });
                form.setValue(
                  "district",
                  city?.districts?.find((item) => item.status)?.nameAr ?? "",
                  { shouldValidate: true },
                );
              }}
              error={form.formState.errors.city?.message}
            />
          </div>
          {districts.length > 0 ? (
            <SelectField
              label="الحي / المنطقة"
              options={districts.map((item) => ({
                value: item.nameAr,
                label: `${item.nameAr} (${item.nameEn})`,
              }))}
              {...form.register("district")}
              error={form.formState.errors.district?.message}
            />
          ) : (
            <InputField label="الحي / المنطقة" {...form.register("district")} error={form.formState.errors.district?.message} />
          )}
          <InputField
            label="العنوان التفصيلي"
            hint="لا يظهر للمستأجرين إلا بعد قبول العرض والتواصل."
            {...form.register("manualAddress")}
            error={form.formState.errors.manualAddress?.message}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <InputField label="المساحة (م²)" type="number" {...form.register("areaM2", { valueAsNumber: true })} error={form.formState.errors.areaM2?.message} />
            <InputField label="غرف النوم" type="number" {...form.register("bedrooms", { valueAsNumber: true })} error={form.formState.errors.bedrooms?.message} />
            <InputField label="الحمّامات" type="number" {...form.register("bathrooms", { valueAsNumber: true })} error={form.formState.errors.bathrooms?.message} />
          </div>
          <div className="flex flex-wrap gap-4">
            <Checkbox label="مفروش" {...form.register("isFurnished")} />
            <Checkbox label="يوجد أسانسير" {...form.register("hasElevator")} />
            <Checkbox label="يوجد جراج" {...form.register("hasParking")} />
          </div>
        </FormCard>

        <FormCard title="الوصف والصور">
          <TextAreaField label="الوصف" {...form.register("description")} error={form.formState.errors.description?.message} />
          <TextAreaField label="الخدمات المحيطة" {...form.register("propertyAroundServices")} />
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-small font-bold text-ink">صور العقار</h2>
              <span className="text-caption text-muted">
                {retainedImages.length + newImages.length} / {MAX_IMAGES}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {retainedImages.map((image) => (
                <ImageTile
                  key={image.id}
                  image={image}
                  onRemove={() =>
                    form.setValue(
                      "existingImageIds",
                      retainedIds.filter((id) => id !== image.id),
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                />
              ))}
              {previews.map(({ file, url }, index) => (
                <PreviewTile
                  key={`${file.name}-${file.lastModified}-${index}`}
                  src={url}
                  name={file.name}
                  onRemove={() =>
                    form.setValue(
                      "newImages",
                      newImages.filter((_, itemIndex) => itemIndex !== index),
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                />
              ))}
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-control border-2 border-dashed border-primary/30 bg-primary-tint/30 p-5 font-bold text-primary">
              <ImagePlus className="size-5" aria-hidden />
              إضافة صور
              <input
                className="sr-only"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={selectImages}
              />
            </label>
            {form.formState.errors.newImages?.message && (
              <p className="mt-2 text-caption text-error" role="alert">
                {form.formState.errors.newImages.message}
              </p>
            )}
          </div>
        </FormCard>

        <Button type="submit" loading={update.isPending} disabled={update.isPending}>
          <Save className="size-4" aria-hidden />
          حفظ وإرسال للمراجعة
        </Button>
      </form>
    </div>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5">
      <h2 className="text-title font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Checkbox({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 text-small font-semibold text-ink">
      <input type="checkbox" className="size-4 accent-primary" {...props} />
      {label}
    </label>
  );
}

function ImageTile({ image, onRemove }: { image: PropertyImage; onRemove: () => void }) {
  return <PreviewTile src={image.imageUrl} name="صورة حالية" onRemove={onRemove} />;
}

function PreviewTile({ src, name, onRemove }: { src: string; name: string; onRemove: () => void }) {
  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-control bg-background">
      {/* Existing property images may be backend-relative, so use the same URL contract as the gallery. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} className="h-full w-full object-cover" />
      <button
        type="button"
        aria-label={`حذف ${name}`}
        onClick={onRemove}
        className="absolute left-2 top-2 rounded-full bg-ink/70 p-1.5 text-white"
      >
        <X className="size-4" aria-hidden />
      </button>
    </figure>
  );
}
