"use client";

import { Button } from "@/src/components/ui/Button";
import { InputField } from "@/src/components/ui/Field";
import { Sheet } from "@/src/components/ui/Sheet";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import {
  useCreateCity,
  useCreateCountry,
  useCreateDistrict,
  useCreateGovernorate,
  useRegions,
  useUpdateCityStatus,
  useUpdateCountryStatus,
  useUpdateDistrictStatus,
  useUpdateGovernorateStatus,
} from "@/src/features/admin/hooks/useRegions";
import { useAdminSession } from "@/src/features/admin/hooks/useTeam";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  ChevronRight,
  Globe,
  Map,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Zod schemas for forms
const createCountrySchema = z.object({
  nameAr: z.string().min(2, "الاسم العربي مطلوب"),
  nameEn: z.string().min(2, "English name is required"),
  code: z.string().min(2, "رمز الدولة مطلوب"),
});

const createGovernorateSchema = z.object({
  nameAr: z.string().min(2, "الاسم العربي مطلوب"),
  nameEn: z.string().min(2, "English name is required"),
});

const createCitySchema = z.object({
  nameAr: z.string().min(2, "الاسم العربي مطلوب"),
  nameEn: z.string().min(2, "English name is required"),
});

const createDistrictSchema = z.object({
  nameAr: z.string().min(2, "الاسم العربي مطلوب"),
  nameEn: z.string().min(2, "English name is required"),
});

export default function RegionsSettingsPage() {
  const toast = useToast();
  const { data: session } = useAdminSession();
  const { data: countries, isLoading, isError, refetch } = useRegions();

  const toggleCountry = useUpdateCountryStatus();
  const toggleGov = useUpdateGovernorateStatus();
  const toggleCity = useUpdateCityStatus();
  const toggleDistrict = useUpdateDistrictStatus();

  // Navigation state (drill-down: Country -> Gov -> City -> District)
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedGovId, setSelectedGovId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Sheets visibility state
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  const [govSheetOpen, setGovSheetOpen] = useState(false);
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [districtSheetOpen, setDistrictSheetOpen] = useState(false);

  const canManage = session?.capabilities.includes("admin:manage") ?? false;

  if (session && !canManage) {
    return (
      <EmptyState
        Icon={ShieldAlert}
        title="لا تملك صلاحية إدارة المناطق"
        description="هذا القسم متاح لأصحاب صلاحية admin:manage فقط."
      />
    );
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (isLoading || !countries) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-96" />
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Get active objects
  const selectedCountry = countries.find((c) => c.id === selectedCountryId);
  const selectedGov = selectedCountry?.governorates.find((g) => g.id === selectedGovId);
  const selectedCity = selectedGov?.cities.find((city) => city.id === selectedCityId);

  // Toggle handlers
  const handleCountryToggle = (id: number, currentStatus: boolean) => {
    toggleCountry.mutate(
      { id, status: !currentStatus },
      {
        onSuccess: () => toast("success", "تم تحديث حالة الدولة بنجاح"),
        onError: () => toast("error", "حدث خطأ أثناء تحديث حالة الدولة"),
      }
    );
  };

  const handleGovToggle = (id: number, currentStatus: boolean) => {
    toggleGov.mutate(
      { id, status: !currentStatus },
      {
        onSuccess: () => toast("success", "تم تحديث حالة المحافظة بنجاح"),
        onError: () => toast("error", "حدث خطأ أثناء تحديث حالة المحافظة"),
      }
    );
  };

  const handleCityToggle = (id: number, currentStatus: boolean) => {
    toggleCity.mutate(
      { id, status: !currentStatus },
      {
        onSuccess: () => toast("success", "تم تحديث حالة المدينة بنجاح"),
        onError: () => toast("error", "حدث خطأ أثناء تحديث حالة المدينة"),
      }
    );
  };

  const handleDistrictToggle = (id: number, currentStatus: boolean) => {
    toggleDistrict.mutate(
      { id, status: !currentStatus },
      {
        onSuccess: () => toast("success", "تم تحديث حالة الحي بنجاح"),
        onError: () => toast("error", "حدث خطأ أثناء تحديث حالة الحي"),
      }
    );
  };

  // Search filtering
  const q = searchQuery.trim().toLowerCase();
  const filteredCountries = countries.filter(
    (c) =>
      c.nameAr.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
  );

  const filteredGovernorates = (selectedCountry?.governorates ?? []).filter(
    (g) => g.nameAr.toLowerCase().includes(q) || g.nameEn.toLowerCase().includes(q)
  );

  const filteredCities = (selectedGov?.cities ?? []).filter(
    (city) =>
      city.nameAr.toLowerCase().includes(q) ||
      city.nameEn.toLowerCase().includes(q)
  );

  const filteredDistricts = (selectedCity?.districts ?? []).filter(
    (district) =>
      district.nameAr.toLowerCase().includes(q) ||
      district.nameEn.toLowerCase().includes(q)
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2 text-caption text-muted">
            <span
              className="cursor-pointer hover:text-ink hover:underline"
              onClick={() => {
                setSelectedCountryId(null);
                setSelectedGovId(null);
                setSelectedCityId(null);
                setSearchQuery("");
              }}
            >
              الدول
            </span>
            {selectedCountry && (
              <>
                <ChevronRight className="size-3" />
                <span
                  className="cursor-pointer hover:text-ink hover:underline"
                  onClick={() => {
                    setSelectedGovId(null);
                    setSelectedCityId(null);
                    setSearchQuery("");
                  }}
                >
                  {selectedCountry.nameAr} ({selectedCountry.nameEn})
                </span>
              </>
            )}
            {selectedGov && (
              <>
                <ChevronRight className="size-3" />
                <span
                  className="cursor-pointer hover:text-ink hover:underline"
                  onClick={() => {
                    setSelectedCityId(null);
                    setSearchQuery("");
                  }}
                >
                  {selectedGov.nameAr} ({selectedGov.nameEn})
                </span>
              </>
            )}
            {selectedCity && (
              <>
                <ChevronRight className="size-3" />
                <span>
                  {selectedCity.nameAr} ({selectedCity.nameEn})
                </span>
              </>
            )}
          </div>

          <h1 className="mt-1 flex items-center gap-2 text-h1 font-bold text-ink">
            <Globe className="size-6 text-primary" />
            {!selectedCountry
              ? "إدارة الدول"
              : !selectedGov
              ? `محافظات ${selectedCountry.nameAr}`
              : !selectedCity
              ? `مدن ${selectedGov.nameAr}`
              : `أحياء ومناطق ${selectedCity.nameAr}`}
          </h1>
          <p className="mt-1 text-small text-muted">
            {!selectedCountry
              ? "إدارة الدول وتفعيلها أو تعطيلها في النظام."
              : !selectedGov
              ? "تفعيل أو تعطيل المحافظات داخل هذه الدولة."
              : !selectedCity
              ? "تفعيل أو تعطيل المدن والمناطق داخل هذه المحافظة."
              : "تفعيل أو تعطيل الأحياء والمناطق الفرعية داخل هذه المدينة."}
          </p>
        </div>

        {/* Action Button */}
        <div>
          {!selectedCountry ? (
            <Button onClick={() => setCountrySheetOpen(true)}>
              <Plus className="size-4" />
              إضافة دولة
            </Button>
          ) : !selectedGov ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedCountryId(null);
                  setSearchQuery("");
                }}
              >
                <ArrowRight className="size-4" />
                رجوع للدول
              </Button>
              <Button onClick={() => setGovSheetOpen(true)}>
                <Plus className="size-4" />
                إضافة محافظة
              </Button>
            </div>
          ) : !selectedCity ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedGovId(null);
                  setSearchQuery("");
                }}
              >
                <ArrowRight className="size-4" />
                رجوع للمحافظات
              </Button>
              <Button onClick={() => setCitySheetOpen(true)}>
                <Plus className="size-4" />
                إضافة مدينة
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedCityId(null);
                  setSearchQuery("");
                }}
              >
                <ArrowRight className="size-4" />
                رجوع للمدن
              </Button>
              <Button onClick={() => setDistrictSheetOpen(true)}>
                <Plus className="size-4" />
                إضافة حي / منطقة
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            !selectedCountry
              ? "بحث في الدول (بالاسم العربي، الإنجليزي، أو الكود)..."
              : !selectedGov
              ? "بحث في المحافظات..."
              : !selectedCity
              ? "بحث في المدن..."
              : "بحث في الأحياء والمناطق..."
          }
          className="w-full rounded-control border border-hairline bg-surface py-2.5 pr-10 pl-4 text-small text-ink placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </div>

      {/* Main List */}
      <div className="rounded-card border border-hairline bg-surface overflow-hidden">
        {/* Countries View */}
        {!selectedCountryId && (
          <div className="divide-y divide-hairline">
            {filteredCountries.length === 0 ? (
              <div className="p-8 text-center text-muted">
                {searchQuery ? "لا توجد نتائج تطابق بحثك." : "لا يوجد دول مضافة بعد."}
              </div>
            ) : (
              filteredCountries.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-background/50"
                >
                  <div
                    className="flex flex-1 cursor-pointer items-center gap-3"
                    onClick={() => {
                      setSelectedCountryId(c.id);
                      setSearchQuery("");
                    }}
                  >
                    <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-full border border-hairline bg-background">
                      {c.image ? (
                        <img
                          src={
                            c.image.startsWith("http")
                              ? c.image
                              : c.image.startsWith("/")
                              ? c.image
                              : `/${c.image}`
                          }
                          alt={c.nameEn}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Globe className="size-4 text-muted" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-ink">
                        {c.nameAr} / {c.nameEn}
                      </p>
                      <p className="text-caption text-muted">
                        كود: {c.code} • المحافظات: {c.governorates.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={c.status}
                        onChange={() => handleCountryToggle(c.id, c.status)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-background border border-hairline rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-muted after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-surface"></div>
                    </label>
                    <ChevronRight
                      className="size-5 text-muted cursor-pointer"
                      onClick={() => {
                        setSelectedCountryId(c.id);
                        setSearchQuery("");
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Governorates View */}
        {selectedCountryId && !selectedGovId && selectedCountry && (
          <div className="divide-y divide-hairline">
            {filteredGovernorates.length === 0 ? (
              <div className="p-8 text-center text-muted">
                {searchQuery
                  ? "لا توجد نتائج تطابق بحثك."
                  : "لا يوجد محافظات مضافة لهذه الدولة."}
              </div>
            ) : (
              filteredGovernorates.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-background/50"
                >
                  <div
                    className="flex flex-1 cursor-pointer items-center gap-3"
                    onClick={() => {
                      setSelectedGovId(g.id);
                      setSearchQuery("");
                    }}
                  >
                    <Map className="size-5 text-primary" />
                    <div>
                      <p className="font-bold text-ink">
                        {g.nameAr} / {g.nameEn}
                      </p>
                      <p className="text-caption text-muted">
                        المدن المتاحة: {g.cities.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={g.status}
                        onChange={() => handleGovToggle(g.id, g.status)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-background border border-hairline rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-muted after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-surface"></div>
                    </label>
                    <ChevronRight
                      className="size-5 text-muted cursor-pointer"
                      onClick={() => {
                        setSelectedGovId(g.id);
                        setSearchQuery("");
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Cities View */}
        {selectedCountryId && selectedGovId && !selectedCityId && selectedGov && (
          <div className="divide-y divide-hairline">
            {filteredCities.length === 0 ? (
              <div className="p-8 text-center text-muted">
                {searchQuery
                  ? "لا توجد نتائج تطابق بحثك."
                  : "لا يوجد مدن مضافة لهذه المحافظة."}
              </div>
            ) : (
              filteredCities.map((city) => (
                <div
                  key={city.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-background/50"
                >
                  <div
                    className="flex flex-1 cursor-pointer items-center gap-3"
                    onClick={() => {
                      setSelectedCityId(city.id);
                      setSearchQuery("");
                    }}
                  >
                    <MapPin className="size-5 text-secondary" />
                    <div>
                      <p className="font-bold text-ink">
                        {city.nameAr} / {city.nameEn}
                      </p>
                      <p className="text-caption text-muted">
                        الأحياء المتاحة: {city.districts?.length ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={city.status}
                        onChange={() => handleCityToggle(city.id, city.status)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-background border border-hairline rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-muted after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-surface"></div>
                    </label>
                    <ChevronRight
                      className="size-5 text-muted cursor-pointer"
                      onClick={() => {
                        setSelectedCityId(city.id);
                        setSearchQuery("");
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Districts View */}
        {selectedCountryId && selectedGovId && selectedCityId && selectedCity && (
          <div className="divide-y divide-hairline">
            {filteredDistricts.length === 0 ? (
              <div className="p-8 text-center text-muted">
                {searchQuery
                  ? "لا توجد نتائج تطابق بحثك."
                  : "لا يوجد أحياء مضافة لهذه المدينة بعد."}
              </div>
            ) : (
              filteredDistricts.map((district) => (
                <div
                  key={district.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-background/50"
                >
                  <div className="flex flex-1 items-center gap-3">
                    <MapPin className="size-5 text-primary" />
                    <div>
                      <p className="font-bold text-ink">
                        {district.nameAr} / {district.nameEn}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={district.status}
                        onChange={() => handleDistrictToggle(district.id, district.status)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-background border border-hairline rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-muted after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-surface"></div>
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Sheet Modals */}
      <CreateCountrySheet
        open={countrySheetOpen}
        onClose={() => setCountrySheetOpen(false)}
      />
      {selectedCountryId && (
        <CreateGovSheet
          open={govSheetOpen}
          countryId={selectedCountryId}
          onClose={() => setGovSheetOpen(false)}
        />
      )}
      {selectedGovId && (
        <CreateCitySheet
          open={citySheetOpen}
          governorateId={selectedGovId}
          onClose={() => setCitySheetOpen(false)}
        />
      )}
      {selectedCityId && (
        <CreateDistrictSheet
          open={districtSheetOpen}
          cityId={selectedCityId}
          onClose={() => setDistrictSheetOpen(false)}
        />
      )}
    </div>
  );
}

interface CreateSheetProps {
  open: boolean;
  onClose: () => void;
}

function CreateCountrySheet({ open, onClose }: CreateSheetProps) {
  const toast = useToast();
  const create = useCreateCountry();
  const [flagFile, setFlagFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof createCountrySchema>>({
    resolver: zodResolver(createCountrySchema),
  });

  const submit = (data: z.infer<typeof createCountrySchema>) => {
    if (!flagFile) {
      toast("error", "يرجى اختيار صورة العلم");
      return;
    }

    const formData = new FormData();
    formData.append("file", flagFile);
    formData.append("nameAr", data.nameAr);
    formData.append("nameEn", data.nameEn);
    formData.append("code", data.code);

    create.mutate(formData, {
      onSuccess: () => {
        toast("success", "تم إضافة الدولة بنجاح");
        reset();
        setFlagFile(null);
        onClose();
      },
      onError: () => {
        toast("error", "حدث خطأ أثناء إضافة الدولة");
      },
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title="إضافة دولة جديدة">
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        <InputField
          label="الاسم بالعربية"
          error={errors.nameAr?.message}
          {...register("nameAr")}
        />
        <InputField
          label="الاسم بالإنجليزية"
          error={errors.nameEn?.message}
          {...register("nameEn")}
        />
        <InputField
          label="كود الدولة (مثال: EG)"
          error={errors.code?.message}
          {...register("code")}
        />
        <div className="flex flex-col gap-1">
          <label className="text-small font-semibold text-body-text">صورة العلم</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setFlagFile(file);
            }}
            className="w-full rounded-control border border-hairline bg-surface p-2 text-small text-ink"
          />
        </div>
        <Button type="submit" block loading={create.isPending}>
          إضافة الدولة
        </Button>
      </form>
    </Sheet>
  );
}

interface CreateGovSheetProps extends CreateSheetProps {
  countryId: number;
}

function CreateGovSheet({ open, countryId, onClose }: CreateGovSheetProps) {
  const toast = useToast();
  const create = useCreateGovernorate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof createGovernorateSchema>>({
    resolver: zodResolver(createGovernorateSchema),
  });

  const submit = (data: z.infer<typeof createGovernorateSchema>) => {
    create.mutate(
      { ...data, countryId },
      {
        onSuccess: () => {
          toast("success", "تم إضافة المحافظة بنجاح");
          reset();
          onClose();
        },
        onError: () => {
          toast("error", "حدث خطأ أثناء إضافة المحافظة");
        },
      }
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="إضافة محافظة جديدة">
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        <InputField
          label="الاسم بالعربية"
          error={errors.nameAr?.message}
          {...register("nameAr")}
        />
        <InputField
          label="الاسم بالإنجليزية"
          error={errors.nameEn?.message}
          {...register("nameEn")}
        />
        <Button type="submit" block loading={create.isPending}>
          إضافة المحافظة
        </Button>
      </form>
    </Sheet>
  );
}

interface CreateCitySheetProps extends CreateSheetProps {
  governorateId: number;
}

function CreateCitySheet({ open, governorateId, onClose }: CreateCitySheetProps) {
  const toast = useToast();
  const create = useCreateCity();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof createCitySchema>>({
    resolver: zodResolver(createCitySchema),
  });

  const submit = (data: z.infer<typeof createCitySchema>) => {
    create.mutate(
      { ...data, governorateId },
      {
        onSuccess: () => {
          toast("success", "تم إضافة المدينة بنجاح");
          reset();
          onClose();
        },
        onError: () => {
          toast("error", "حدث خطأ أثناء إضافة المدينة");
        },
      }
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="إضافة مدينة جديدة">
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        <InputField
          label="الاسم بالعربية"
          error={errors.nameAr?.message}
          {...register("nameAr")}
        />
        <InputField
          label="الاسم بالإنجليزية"
          error={errors.nameEn?.message}
          {...register("nameEn")}
        />
        <Button type="submit" block loading={create.isPending}>
          إضافة المدينة
        </Button>
      </form>
    </Sheet>
  );
}

interface CreateDistrictSheetProps extends CreateSheetProps {
  cityId: number;
}

function CreateDistrictSheet({ open, cityId, onClose }: CreateDistrictSheetProps) {
  const toast = useToast();
  const create = useCreateDistrict();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof createDistrictSchema>>({
    resolver: zodResolver(createDistrictSchema),
  });

  const submit = (data: z.infer<typeof createDistrictSchema>) => {
    create.mutate(
      { ...data, cityId },
      {
        onSuccess: () => {
          toast("success", "تم إضافة الحي/المنطقة بنجاح");
          reset();
          onClose();
        },
        onError: () => {
          toast("error", "حدث خطأ أثناء إضافة الحي/المنطقة");
        },
      }
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="إضافة حي / منطقة جديدة">
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        <InputField
          label="الاسم بالعربية"
          error={errors.nameAr?.message}
          {...register("nameAr")}
        />
        <InputField
          label="الاسم بالإنجليزية"
          error={errors.nameEn?.message}
          {...register("nameEn")}
        />
        <Button type="submit" block loading={create.isPending}>
          إضافة الحي
        </Button>
      </form>
    </Sheet>
  );
}
