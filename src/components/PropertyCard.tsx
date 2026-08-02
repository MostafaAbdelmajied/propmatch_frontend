"use client";

import Image from "next/image";
import { BedDouble, Bath, Ruler, Sofa, BadgeCheck, TrendingUp, ImageOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/src/utils/cn";
import { formatNumber } from "@/src/utils/format";
import { MatchScoreRing } from "./ui/MatchScoreRing";
import { propertyTypeLabels, type PropertySummary } from "@/src/lib/api/contracts/property";

export interface PropertyCardProps {
  property: PropertySummary;
  onClick?: () => void;
  matchScore?: number;
  className?: string;
  /**
   * Overlay control rendered top-end (e.g. the favorite toggle). A slot rather
   * than a direct import: this is a shared primitive, and shared code must not
   * depend on a feature (src/features/README.md).
   */
  actionSlot?: React.ReactNode;
}

export function PropertyCard({ property, onClick, matchScore, className, actionSlot }: PropertyCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article
      onClick={onClick}
      className={cn(
        "group cursor-pointer overflow-hidden rounded-card border border-hairline bg-surface shadow-card transition-all",
        "hover:border-primary/40 hover:shadow-lg",
        className,
      )}
    >
      <div className="relative h-44 bg-background">
        {imageFailed || !property.coverImage ? (
          <div className="flex h-full items-center justify-center text-muted">
            <ImageOff className="size-8" aria-hidden />
          </div>
        ) : (
          <Image
            src={property.coverImage}
            alt={property.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1440px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="absolute top-2 start-2 flex flex-col items-start gap-1">
          {property.isBoosted && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-pending-tint px-2 py-0.5 text-caption font-bold text-pending">
              <TrendingUp className="size-3" aria-hidden />
              مميّز
            </span>
          )}
          {property.ownerVerified && (
            <span className="inline-flex items-center gap-1 rounded-pill border border-success/30 bg-surface/90 px-2 py-0.5 text-caption font-semibold text-success">
              <BadgeCheck className="size-3" aria-hidden />
              مالك موثّق الهوية
            </span>
          )}
        </div>
        {actionSlot && <div className="absolute top-2 end-2">{actionSlot}</div>}
        {matchScore !== undefined && (
          <div className="absolute bottom-2 end-2 rounded-card bg-surface/95 p-1 shadow-card">
            <MatchScoreRing score={matchScore} size={46} />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-body font-bold leading-snug text-ink">{property.title}</h3>
            {/* Pre-connection we only ever show the general area (SRS 3.4). */}
            <p className="mt-0.5 text-small text-muted">
              {property.district}، {property.city} · {propertyTypeLabels[property.propertyType]}
            </p>
          </div>
          <div className="shrink-0 text-left">
            <span className="text-title font-bold text-primary">{formatNumber(property.rentAmount)}</span>
            <span className="block text-caption text-muted">ج.م / شهريًا</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-hairline pt-3 text-caption text-muted">
          <span className="flex items-center gap-1">
            <BedDouble className="size-3.5" aria-hidden />
            {formatNumber(property.bedrooms)} غرف
          </span>
          <span className="flex items-center gap-1">
            <Bath className="size-3.5" aria-hidden />
            {formatNumber(property.bathrooms)} حمّام
          </span>
          <span className="flex items-center gap-1">
            <Ruler className="size-3.5" aria-hidden />
            {formatNumber(property.areaM2)} م²
          </span>
          {property.isFurnished && (
            <span className="flex items-center gap-1">
              <Sofa className="size-3.5" aria-hidden />
              مفروش
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
