"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  X,
  Grid,
} from "lucide-react";
import type { PropertyImage } from "@/src/lib/api/contracts/property";
import type { PropertyStatus } from "@/src/lib/api/contracts/common";
import { MatchScoreRing } from "@/src/components/ui/MatchScoreRing";
import { StatusChip } from "@/src/components/ui/StatusChip";

interface PropertyImageGalleryProps {
  images: PropertyImage[];
  title: string;
  isBoosted?: boolean;
  status?: PropertyStatus;
  favoriteSlot?: React.ReactNode;
  matchScore?: number;
  autoPlayInterval?: number;
}

export function PropertyImageGallery({
  images,
  title,
  isBoosted,
  status,
  favoriteSlot,
  matchScore,
  autoPlayInterval = 4000,
}: PropertyImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const total = images.length;

  const goToNext = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-scroll effect
  useEffect(() => {
    if (total <= 1 || isHovered || isGalleryOpen) return;

    const timer = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [total, isHovered, isGalleryOpen, autoPlayInterval, goToNext]);

  // Keyboard navigation for Lightbox Gallery Modal
  useEffect(() => {
    if (!isGalleryOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsGalleryOpen(false);
      else if (e.key === "ArrowLeft") goToNext();
      else if (e.key === "ArrowRight") goToPrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGalleryOpen, goToNext, goToPrev]);

  if (total === 0) {
    return (
      <div className="relative h-64 w-full overflow-hidden rounded-card bg-background md:h-80">
        <div className="flex h-full items-center justify-center text-muted">
          <ImageOff className="size-10" aria-hidden />
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex] ?? images[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Main Carousel Display */}
      <div
        className="group relative h-72 w-full overflow-hidden rounded-card bg-background md:h-96"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Main Image */}
        <Image
          src={currentImage.imageUrl}
          alt={`${title} - صورة ${currentIndex + 1}`}
          fill
          sizes="(max-width:1024px) 100vw, 66vw"
          className="object-cover transition-all duration-500 ease-in-out cursor-pointer"
          priority={currentIndex === 0}
          onClick={() => setIsGalleryOpen(true)}
        />

        {/* Top Floating Badges */}
        <div className="absolute top-3 start-3 z-10 flex items-center gap-2">
          {isBoosted && (
            <span className="rounded-pill bg-pending-tint px-2.5 py-0.5 text-caption font-bold text-pending shadow-sm">
              مميّز
            </span>
          )}
          {status && status !== "APPROVED" && <StatusChip status={status} />}
        </div>

        {favoriteSlot && <div className="absolute top-3 end-3 z-10">{favoriteSlot}</div>}

        {/* Match Score Badge */}
        {matchScore !== undefined && (
          <div className="absolute bottom-3 end-3 z-10 rounded-card bg-surface/95 p-1.5 shadow-card backdrop-blur-sm">
            <MatchScoreRing score={matchScore} size={56} />
          </div>
        )}

        {/* Navigation Arrows (visible if > 1 image) */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              aria-label="الصورة السابقة"
              className="absolute start-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-ink/50 p-2 text-white shadow-md backdrop-blur-sm transition-all hover:bg-ink/80 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ChevronRight className="size-5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              aria-label="الصورة التالية"
              className="absolute end-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-ink/50 p-2 text-white shadow-md backdrop-blur-sm transition-all hover:bg-ink/80 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ChevronLeft className="size-5" />
            </button>
          </>
        )}

        {/* Image Counter & Full Gallery Action */}
        <div className="absolute bottom-3 start-3 z-10 flex items-center gap-2">
          {total > 1 && (
            <span className="rounded-pill bg-ink/65 px-3 py-1 text-caption font-semibold text-white backdrop-blur-md">
              {currentIndex + 1} / {total}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsGalleryOpen(true)}
            className="flex items-center gap-1.5 rounded-pill bg-ink/65 px-3 py-1 text-caption font-semibold text-white backdrop-blur-md transition-all hover:bg-ink/90 hover:scale-105"
          >
            <Grid className="size-3.5" />
            <span>معرض الصور ({total})</span>
          </button>
        </div>

        {/* Auto-scroll progress indicator dots */}
        {total > 1 && (
          <div className="absolute bottom-3 start-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`الانتقال إلى صورة ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Fullscreen Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 p-4 md:p-6 backdrop-blur-md animate-in fade-in duration-200">
          {/* Modal Header */}
          <div className="flex items-center justify-between text-white border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-body font-bold line-clamp-1">{title}</h3>
              <span className="rounded-pill bg-white/15 px-2.5 py-0.5 text-caption font-medium">
                {currentIndex + 1} من {total}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsGalleryOpen(false)}
              aria-label="إغلاق المعرض"
              className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:outline-none"
            >
              <X className="size-6" />
            </button>
          </div>

          {/* Modal Main Display Area */}
          <div className="relative flex flex-1 items-center justify-center py-4">
            <div className="relative h-full w-full max-w-5xl">
              <Image
                src={currentImage.imageUrl}
                alt={`${title} - صورة ${currentIndex + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            {/* Modal Left/Right Arrows */}
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={goToPrev}
                  aria-label="الصورة السابقة"
                  className="absolute start-2 md:start-6 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur-md transition-all hover:bg-white/30 hover:scale-110"
                >
                  <ChevronRight className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  aria-label="الصورة التالية"
                  className="absolute end-2 md:end-6 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur-md transition-all hover:bg-white/30 hover:scale-110"
                >
                  <ChevronLeft className="size-6" />
                </button>
              </>
            )}
          </div>

          {/* Modal Bottom Thumbnails */}
          {total > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto pt-3 border-t border-white/10 no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-control transition-all ${
                    idx === currentIndex
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-black scale-105 opacity-100"
                      : "opacity-50 hover:opacity-90"
                  }`}
                >
                  <Image
                    src={img.imageUrl}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
