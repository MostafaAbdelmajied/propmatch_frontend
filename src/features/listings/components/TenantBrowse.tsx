"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useApprovedProperties, useSemanticPropertySearch } from "../hooks/useProperties";
import { PropertyCard } from "@/src/components/PropertyCard";
import { PropertyCardSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { Button } from "@/src/components/ui/Button";
import { formatNumber } from "@/src/utils/format";
import { isApiClientError } from "@/src/lib/api/browserClient";
import type {
  PropertySearchQuery,
  SemanticPropertySearchItem,
} from "@/src/lib/api/contracts/property";
import { FavoriteButton } from "./FavoriteButton";
import { SearchFilters } from "./SearchFilters";

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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h1 font-bold text-ink">تصفّح العقارات</h1>
        <p className="mt-1 text-small text-muted">إعلانات موثّقة من ملّاك مباشرة في المنصورة.</p>
      </div>

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
              className="pointer-events-none absolute top-1/2 start-3 size-5 -translate-y-1/2 text-muted"
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
                    onClick={() => router.push(`/tenant/properties/${property.id}`)}
                    actionSlot={<FavoriteButton propertyId={property.id} />}
                  />
                ))
              : normalBrowse.data!.items.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onClick={() => router.push(`/tenant/properties/${property.id}`)}
                    actionSlot={<FavoriteButton propertyId={property.id} />}
                  />
                ))}
          </div>
        </>
      )}
    </div>
  );
}
