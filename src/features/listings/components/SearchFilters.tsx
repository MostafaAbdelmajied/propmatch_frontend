"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { InputField, SelectField } from "@/src/components/ui/Field";
import { ChipGroup } from "@/src/components/ui/Chip";
import { cn } from "@/src/utils/cn";
import { formatNumber } from "@/src/utils/format";
import { propertyTypeLabels, type PropertySearchQuery, type PropertyType } from "@/src/lib/api/contracts/property";

export interface SearchFiltersProps {
  value: PropertySearchQuery;
  onChange: (next: PropertySearchQuery) => void;
}

const typeOptions = (Object.keys(propertyTypeLabels) as PropertyType[]).map((v) => ({
  value: v,
  label: propertyTypeLabels[v],
}));

/**
 * PRO-11's hard-filter half. Collapsed by default so browse stays a one-field
 * search; the count badge makes active filters obvious when collapsed.
 */
export function SearchFilters({ value, onChange }: SearchFiltersProps) {
  const [open, setOpen] = useState(false);

  // `q` is the semantic query, not a filter — don't count it here.
  const activeCount = (["city", "propertyType", "minRent", "maxRent", "bedrooms", "isFurnished"] as const).filter(
    (k) => value[k] !== undefined && value[k] !== "",
  ).length;

  const set = <K extends keyof PropertySearchQuery>(key: K, v: PropertySearchQuery[K]) =>
    onChange({ ...value, [key]: v });

  const clear = () => onChange({ q: value.q });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <SlidersHorizontal className="size-4" aria-hidden />
          تصفية
          {activeCount > 0 && (
            <span className="rounded-pill bg-primary px-1.5 text-caption font-bold text-white">
              {formatNumber(activeCount)}
            </span>
          )}
        </Button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1 text-caption font-semibold text-muted hover:text-ink"
          >
            <X className="size-3.5" aria-hidden />
            مسح الكل
          </button>
        )}
      </div>

      <div className={cn("flex-col gap-4 rounded-card border border-hairline bg-surface p-4", open ? "flex" : "hidden")}>
        <ChipGroup
          label="نوع العقار"
          options={typeOptions}
          value={value.propertyType ?? null}
          onChange={(v) =>
            // Tapping the selected chip clears it — single-select has no other way out.
            set("propertyType", (v as PropertyType) === value.propertyType ? undefined : (v as PropertyType))
          }
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <InputField
            label="أقل إيجار (ج.م)"
            type="number"
            inputMode="numeric"
            value={value.minRent ?? ""}
            onChange={(e) => set("minRent", e.target.value ? Number(e.target.value) : undefined)}
          />
          <InputField
            label="أعلى إيجار (ج.م)"
            type="number"
            inputMode="numeric"
            value={value.maxRent ?? ""}
            onChange={(e) => set("maxRent", e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="الحد الأدنى لغرف النوم"
            placeholder="أي عدد"
            value={value.bedrooms ?? ""}
            onChange={(e) => set("bedrooms", e.target.value ? Number(e.target.value) : undefined)}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${formatNumber(n)}+` }))}
          />
          <InputField
            label="المدينة"
            placeholder="المنصورة"
            value={value.city ?? ""}
            onChange={(e) => set("city", e.target.value || undefined)}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-small text-body-text">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={value.isFurnished ?? false}
            onChange={(e) => set("isFurnished", e.target.checked || undefined)}
          />
          مفروش فقط
        </label>
      </div>
    </div>
  );
}
