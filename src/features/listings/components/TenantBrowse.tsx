"use client";

import { PropertyCard } from "@/src/components/PropertyCard";
import { PropertyCardSkeleton, Skeleton } from "@/src/components/ui/Skeleton";
import { BedDouble, Inbox, Lock, MapPin, Search, Sofa } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useApprovedProperties, usePublicTenantRequests, useSemanticPropertySearch } from "../hooks/useProperties";

import { Button } from "@/src/components/ui/Button";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { useSession } from "@/src/features/auth/hooks/useSession";
import { isApiClientError } from "@/src/lib/api/browserClient";
import type {
  PropertySearchQuery,
  SemanticPropertySearchItem,
} from "@/src/lib/api/contracts/property";
import { propertyTypeLabels } from "@/src/lib/api/contracts/property";
import { cn } from "@/src/utils/cn";
import { formatEGP, formatNumber, formatRelativeTime } from "@/src/utils/format";
import { FavoriteButton } from "./FavoriteButton";
import { SearchFilters } from "./SearchFilters";

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export function AuthPromptModal({ isOpen, onClose, title, description }: AuthPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-card border border-hairline bg-surface p-6 shadow-card animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-center mb-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary-tint text-primary">
            <Lock className="size-6" />
          </span>
        </div>
        <h2 className="text-h2 font-bold text-center text-ink">{title}</h2>
        <p className="mt-2 text-body text-center text-muted leading-relaxed">{description}</p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link href="/login" className="w-full">
            <Button className="w-full justify-center">تسجيل الدخول</Button>
          </Link>
          <Link href="/signup" className="w-full">
            <Button variant="secondary" className="w-full justify-center">إنشاء حساب جديد</Button>
          </Link>
          <Button variant="ghost" onClick={onClose} className="w-full justify-center mt-1">
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}


const semanticSearchLimit = 10;
const noRelevantSemanticMatchReason = "NO_RELEVANT_SEMANTIC_MATCH";

function SemanticPropertyCard({
  property,
  onClick,
  actionSlot,
}: {
  property: SemanticPropertySearchItem;
  onClick: () => void;
  actionSlot: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
      <PropertyCard
        property={property}
        onClick={onClick}
        actionSlot={actionSlot}
        className="border-0 shadow-none"
      />
      {property.matchReasons.length > 0 && (
        <div className="border-t border-hairline px-4 py-3">
          <p className="text-caption font-semibold text-muted">أسباب الظهور في النتائج</p>
          <ul className="mt-1.5 space-y-1 text-small text-ink">
            {property.matchReasons.map((reason) => (
              <li key={reason.code}>{reason.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TenantBrowse() {
  const router = useRouter();
  const { data: user } = useSession();
  const [activeTab, setActiveTab] = useState<"properties" | "requests">("properties");
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptData, setAuthPromptData] = useState({ title: "", description: "" });

  const semanticInputRef = useRef<HTMLInputElement>(null);
  const [semanticInput, setSemanticInput] = useState("");
  const [semanticQuery, setSemanticQuery] = useState<string | null>(null);
  const [semanticValidation, setSemanticValidation] = useState<string | null>(null);
  const [query, setQuery] = useState<PropertySearchQuery>({});
  const normalBrowse = useApprovedProperties(query);
  const semanticSearch = useSemanticPropertySearch(
    semanticQuery ? { query: semanticQuery, limit: semanticSearchLimit } : null,
  );
  const isSemanticMode = semanticQuery !== null;
  const activeSearch = isSemanticMode ? semanticSearch : normalBrowse;
  const trimmedSemanticInput = semanticInput.trim();
  const semanticInputIsValid =
    trimmedSemanticInput.length >= 2 && trimmedSemanticInput.length <= 300;
  const semanticError = isApiClientError(semanticSearch.error) ? semanticSearch.error : null;
  const semanticUnavailable =
    semanticError?.statusCode === 503 ||
    (semanticError?.body &&
      typeof semanticError.body === "object" &&
      "code" in semanticError.body &&
      semanticError.body.code === "SEMANTIC_SEARCH_UNAVAILABLE");
  const hasNoRelevantSemanticMatch =
    isSemanticMode &&
    semanticSearch.data?.items.length === 0 &&
    semanticSearch.data.reason === noRelevantSemanticMatchReason;

  const publicRequests = usePublicTenantRequests();

  function semanticValidationMessage(value: string) {
    if (value.length < 2) return "اكتب حرفين على الأقل للبحث.";
    if (value.length > 300) return "يجب ألا يتجاوز وصف البحث 300 حرف.";
    return null;
  }

  function submitSemanticSearch(e: React.FormEvent) {
    e.preventDefault();
    const validationMessage = semanticValidationMessage(trimmedSemanticInput);
    if (validationMessage || semanticSearch.isFetching) {
      setSemanticValidation(validationMessage);
      return;
    }

    setSemanticValidation(null);
    setSemanticQuery(trimmedSemanticInput);
  }

  function clearSemanticSearch() {
    setSemanticInput("");
    setSemanticQuery(null);
    setSemanticValidation(null);
  }

  function focusSemanticSearchInput() {
    semanticInputRef.current?.focus();
  }

  function handlePropertyCardClick(propertyId: string) {
    if (!user) {
      setAuthPromptData({
        title: "رؤية تفاصيل العقار",
        description: "يرجى تسجيل الدخول أو إنشاء حساب لمشاهدة الصور الكاملة والمميزات والتواصل المباشر مع مالك العقار.",
      });
      setAuthPromptOpen(true);
    } else {
      router.push(`/tenant/properties/${propertyId}`);
    }
  }



  function handleRequestCardClick() {
    if (!user) {
      setAuthPromptData({
        title: "رؤية تفاصيل طلب السكن",
        description: "يرجى تسجيل الدخول أو إنشاء حساب للتواصل مع المستأجر وإرسال عروض العقارات المناسبة له.",
      });
      setAuthPromptOpen(true);
    } else {
      if (user.role === "landlord") {
        router.push("/landlord/requests");
      } else {
        setAuthPromptData({
          title: "التواصل مع مستأجر آخر",
          description: "طلبات السكن مخصصة لتلقي عروض الملاك. لا يمكنك إرسال عروض لمستأجرين آخرين بصفتك مستأجرًا.",
        });
        setAuthPromptOpen(true);
      }
    }
  }

  // The "tenant requests" tab is a guest-only discovery surface: a signed-in
  // tenant can't act on another tenant's request (see handleRequestCardClick),
  // and landlords have their own /landlord/requests. So it's shown only to
  // guests; any signed-in user browsing here sees just the properties view.
  const isGuest = !user;
  const effectiveTab = isGuest ? activeTab : "properties";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold text-ink">تصفّح المنصة</h1>
          <p className="mt-1 text-small text-muted">إعلانات عقارات وطلبات مستأجرين مباشرة في المنصورة.</p>
        </div>

        {/* Tab Switcher — guests can also browse tenant requests. */}
        {isGuest && (
          <div className="flex rounded-control border border-hairline bg-surface p-1 self-start">
            <button
              type="button"
              onClick={() => setActiveTab("properties")}
              className={cn(
                "rounded-control px-4 py-1.5 text-small font-bold transition-all",
                effectiveTab === "properties"
                  ? "bg-primary text-white"
                  : "text-muted hover:text-ink"
              )}
            >
              العقارات المعروضة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("requests")}
              className={cn(
                "rounded-control px-4 py-1.5 text-small font-bold transition-all",
                effectiveTab === "requests"
                  ? "bg-primary text-white"
                  : "text-muted hover:text-ink"
              )}
            >
              طلبات المستأجرين
            </button>
          </div>
        )}
      </div>

      {effectiveTab === "properties" ? (
        <>
          <form
            onSubmit={submitSemanticSearch}
            className="rounded-card border border-hairline bg-surface p-4"
          >
            <h2 className="text-title font-bold text-ink">ابحث بوصف العقار الذي تحتاجه</h2>
            <p className="mt-1 text-small text-muted">
              اكتب وصفًا طبيعيًا لمواصفات السكن، وسنعرض لك العقارات الأقرب لاحتياجاتك.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 inset-s-3 size-5 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  ref={semanticInputRef}
                  value={semanticInput}
                  onChange={(e) => {
                    setSemanticInput(e.target.value);
                    if (semanticValidation) setSemanticValidation(null);
                  }}
                  onBlur={() => setSemanticValidation(semanticValidationMessage(trimmedSemanticInput))}
                  placeholder="مثال: شقة هادئة غرفتين قريبة من الجامعة وبميزانية متوسطة"
                  aria-label="ابحث بوصف العقار الذي تحتاجه"
                  aria-describedby={semanticValidation ? "semantic-search-validation" : undefined}
                  className="w-full rounded-control border border-hairline bg-surface py-2.5 ps-10 pe-3 text-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button
                type="submit"
                disabled={!semanticInputIsValid}
                loading={semanticSearch.isFetching}
              >
                بحث ذكي
              </Button>
              {isSemanticMode && (
                <Button type="button" variant="ghost" onClick={clearSemanticSearch}>
                  مسح البحث
                </Button>
              )}
            </div>
            {semanticValidation && (
              <p id="semantic-search-validation" className="mt-2 text-small text-error" role="alert">
                {semanticValidation}
              </p>
            )}
          </form>

          <SearchFilters value={query} onChange={setQuery} />

          {isSemanticMode && (
            <p className="text-small font-semibold text-primary">
              نتائج البحث الذكي عن: “{semanticQuery}”
            </p>
          )}

          {activeSearch.isError ? (
            isSemanticMode ? (
              <EmptyState
                title={
                  semanticUnavailable
                    ? "خدمة البحث الذكي غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل."
                    : "تعذر إتمام البحث الذكي. حاول مرة أخرى بعد قليل."
                }
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" onClick={() => semanticSearch.refetch()}>
                      إعادة المحاولة
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearSemanticSearch}>
                      العودة للتصفح العادي
                    </Button>
                  </div>
                }
              />
            ) : (
              <ErrorState onRetry={() => normalBrowse.refetch()} />
            )
          ) : activeSearch.isLoading ? (
            <>
              {isSemanticMode && (
                <p className="text-small text-muted">جارٍ البحث عن العقارات الأقرب لاحتياجاتك...</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <PropertyCardSkeleton key={i} />
                ))}
              </div>
            </>
          ) : !activeSearch.data || activeSearch.data.items.length === 0 ? (
            isSemanticMode ? (
              hasNoRelevantSemanticMatch ? (
                <EmptyState
                  title="ملقيناش عقار مناسب كفاية لطلبك"
                  description="البحث اكتمل، لكن ما لقيناش عقار مناسب كفاية. جرّب تضيف تفاصيل أكتر أو توسّع طلبك."
                  action={
                    <div className="flex flex-col items-center gap-4">
                      <ul className="list-disc space-y-1 ps-5 text-start text-small text-muted">
                        <li>حدّد المدينة أو المنطقة بشكل أوضح</li>
                        <li>اكتب نوع العقار وعدد الغرف</li>
                        <li>راجع الشروط الاختيارية اللي ممكن توسّعها</li>
                      </ul>
                      <Button size="sm" onClick={focusSemanticSearchInput}>
                        عدّل طلبك وجرّب تاني
                      </Button>
                    </div>
                  }
                />
              ) : (
                <EmptyState
                  title="لم نجد عقارات مطابقة لوصفك حاليًا."
                  description="جرّب تعديل الوصف أو استخدام مواصفات أكثر عمومية."
                  action={
                    <Button size="sm" variant="ghost" onClick={clearSemanticSearch}>
                      مسح البحث
                    </Button>
                  }
                />
              )
            ) : (
              <EmptyState
                title="لا توجد عقارات مطابقة"
                description="جرّب كلمات بحث مختلفة أو وسّع نطاق التصفية."
              />
            )
          ) : (
            <>
              <p className="text-caption text-muted">{formatNumber(activeSearch.data.total)} عقار</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isSemanticMode
                  ? semanticSearch.data!.items.map((property) => (
                      <SemanticPropertyCard
                        key={property.id}
                        property={property}
                        onClick={() => handlePropertyCardClick(property.id)}
                        actionSlot={!user ? undefined : <FavoriteButton propertyId={property.id} />}
                      />
                    ))
                  : normalBrowse.data!.items.map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        onClick={() => handlePropertyCardClick(property.id)}
                        actionSlot={!user ? undefined : <FavoriteButton propertyId={property.id} />}
                      />
                    ))}

              </div>
            </>
          )}
        </>
      ) : (
        <>
          {publicRequests.isError ? (
            <ErrorState onRetry={() => publicRequests.refetch()} />
          ) : publicRequests.isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-card" />
              ))}
            </div>
          ) : !publicRequests.data || publicRequests.data.items.length === 0 ? (
            <EmptyState
              Icon={Inbox}
              title="لا توجد طلبات متاحة الآن"
              description="سيتم إدراج طلبات السكن النشطة فور إضافتها من المستأجرين."
            />
          ) : (
            <>
              <p className="text-caption text-muted">{formatNumber(publicRequests.data.items.length)} طلب سكن نشط</p>
              <ul className="flex flex-col gap-4">
                {publicRequests.data.items.map((request) => (
                  <li key={request.id}>
                    <article
                      onClick={handleRequestCardClick}
                      className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card hover:border-primary/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-body font-bold text-ink">
                            {propertyTypeLabels[request.propertyType as keyof typeof propertyTypeLabels] || request.propertyType} · {formatEGP(request.minBudget)} –{" "}
                            {formatEGP(request.maxBudget)}

                          </h2>
                          <p className="mt-0.5 flex items-center gap-1 text-small text-muted">
                            <MapPin className="size-3.5 shrink-0" aria-hidden />
                            {request.preferredLocations}
                          </p>
                        </div>
                      </div>

                      <p className="line-clamp-3 text-small leading-relaxed text-body-text">{request.lifestyleRequirements}</p>

                      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-3 text-caption text-muted">
                        <span className="flex items-center gap-1">
                          <BedDouble className="size-3.5" aria-hidden />
                          {formatNumber(request.requiredBedrooms)} غرف
                        </span>
                        {request.needsFurnished && (
                          <span className="flex items-center gap-1">
                            <Sofa className="size-3.5" aria-hidden />
                            يريد مفروش
                          </span>
                        )}
                        <span>مرونة {formatNumber(request.flexibilityScore)}/{formatNumber(10)}</span>
                        <span>{formatRelativeTime(new Date(request.createdAt))}</span>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <AuthPromptModal
        isOpen={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        title={authPromptData.title}
        description={authPromptData.description}
      />
    </div>
  );
}
