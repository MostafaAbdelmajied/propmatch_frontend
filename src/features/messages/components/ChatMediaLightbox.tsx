"use client";

import { useEffect, useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/src/utils/cn";
import { mediaUrl } from "../hooks/useChatUpload";
import type { ChatAttachmentType } from "@/src/lib/api/contracts/message";

export interface MediaItem {
  id: string;
  url: string;
  type: ChatAttachmentType;
  name?: string | null;
}

export interface ChatMediaLightboxProps {
  items: MediaItem[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

export function ChatMediaLightbox({
  items,
  initialIndex,
  open,
  onClose,
}: ChatMediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomScale, setZoomScale] = useState(1);
  const [videoSpeed, setVideoSpeed] = useState(1);

  // Swipe gesture tracking
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeItem = items[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomScale(1);
    setVideoSpeed(1);
  }, [initialIndex, open]);

  // Keyboard navigation & Esc listener
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        // In RTL, ArrowRight moves to next item
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, items.length]);

  if (!open || !activeItem) return null;

  function handleNext() {
    setZoomScale(1);
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }

  function handlePrev() {
    setZoomScale(1);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }

  // Touch Swipe Handlers for Mobile
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchEndX.current = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;

    // Threshold of 50px for swipe
    if (distance > 50) {
      handleNext();
    } else if (distance < -50) {
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }

  const SPEEDS = [0.5, 1, 1.25, 1.5, 2];
  function cycleVideoSpeed() {
    const nextIdx = (SPEEDS.indexOf(videoSpeed) + 1) % SPEEDS.length;
    const next = SPEEDS[nextIdx];
    setVideoSpeed(next);
    if (videoRef.current) {
      videoRef.current.playbackRate = next;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 text-white animate-fade-in backdrop-blur-md select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Bar */}
      <div className="flex w-full items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <span className="text-small font-bold text-white/80">
            {currentIndex + 1} / {items.length}
          </span>
          {activeItem.name && (
            <span className="text-small text-white/60 truncate max-w-xs">
              {activeItem.name}
            </span>
          )}
        </div>

        {/* Zoom & Speed Controls */}
        <div className="flex items-center gap-3">
          {activeItem.type === "IMAGE" && (
            <div className="flex items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1">
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.min(s + 0.5, 3))}
                className="hover:text-primary transition-colors p-1"
                title="تكبير"
              >
                <ZoomIn className="size-4" />
              </button>
              <span className="text-caption font-bold w-10 text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.max(s - 0.5, 0.5))}
                className="hover:text-primary transition-colors p-1"
                title="تصغير"
              >
                <ZoomOut className="size-4" />
              </button>
              {zoomScale !== 1 && (
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="hover:text-primary transition-colors p-1"
                  title="إعادة ضبط"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              )}
            </div>
          )}

          {activeItem.type === "VIDEO" && (
            <button
              type="button"
              onClick={cycleVideoSpeed}
              className="rounded-pill bg-white/15 px-3 py-1 text-small font-bold hover:bg-white/25 transition-colors"
              title="سرعة تشغيل الفيديو"
            >
              سرعة: {videoSpeed}x
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="إغلاق المعاينة"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex flex-1 w-full items-center justify-center overflow-hidden p-4">
        {/* Navigation Arrow Left */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-4 z-10 flex size-12 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors shadow-lg"
            aria-label="السابق"
          >
            <ChevronLeft className="size-8" />
          </button>
        )}

        {/* Media Renderer */}
        {activeItem.type === "IMAGE" ? (
          <div className="relative flex items-center justify-center w-full h-full">
            <img
              src={mediaUrl(activeItem.url)}
              alt={activeItem.name ?? "صورة"}
              style={{ transform: `scale(${zoomScale})` }}
              onDoubleClick={() => setZoomScale((s) => (s === 1 ? 2 : 1))}
              className="max-h-[75vh] max-w-full rounded-card object-contain transition-transform duration-200 cursor-zoom-in"
            />
          </div>
        ) : (
          <video
            ref={videoRef}
            src={mediaUrl(activeItem.url)}
            controls
            autoPlay
            className="max-h-[75vh] max-w-full rounded-card shadow-2xl"
          />
        )}

        {/* Navigation Arrow Right */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-4 z-10 flex size-12 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors shadow-lg"
            aria-label="التالي"
          >
            <ChevronRight className="size-8" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {items.length > 1 && (
        <div className="flex w-full items-center justify-center gap-2 overflow-x-auto p-4 bg-gradient-to-t from-black/80 to-transparent">
          {items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setZoomScale(1);
                setCurrentIndex(idx);
              }}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-control border-2 transition-all",
                idx === currentIndex
                  ? "border-primary scale-110 shadow-md"
                  : "border-transparent opacity-50 hover:opacity-100",
              )}
            >
              {item.type === "IMAGE" ? (
                <img
                  src={mediaUrl(item.url)}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-zinc-800 text-white">
                  <Play className="size-5" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
