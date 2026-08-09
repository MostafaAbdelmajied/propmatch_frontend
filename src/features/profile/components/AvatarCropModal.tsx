"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Sheet } from "@/src/components/ui/Sheet";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/utils/cn";
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Check,
  X,
  Loader2,
  Sliders,
} from "lucide-react";

export interface AvatarCropModalProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (croppedBase64: string) => Promise<void>;
  isUploading?: boolean;
}

export function renderCroppedAvatar(
  img: HTMLImageElement,
  {
    rotation,
    flipH,
    flipV,
    zoom,
    offsetX,
    offsetY,
    outputSize = 300,
  }: {
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    zoom: number;
    offsetX: number;
    offsetY: number;
    outputSize?: number;
  },
): string {
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.clearRect(0, 0, outputSize, outputSize);

  ctx.save();
  ctx.translate(outputSize / 2, outputSize / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

  const minDim = Math.min(img.width, img.height);
  const baseScale = (outputSize / minDim) * zoom;

  const drawWidth = img.width * baseScale;
  const drawHeight = img.height * baseScale;

  ctx.drawImage(
    img,
    -drawWidth / 2 + offsetX,
    -drawHeight / 2 + offsetY,
    drawWidth,
    drawHeight,
  );

  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.88);
}

export function AvatarCropModal({
  open,
  imageSrc,
  onClose,
  onConfirm,
  isUploading = false,
}: AvatarCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load image element
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      // Reset state for new image
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    };
  }, [imageSrc]);

  // Update canvas rendering and live preview
  const updateRender = useCallback(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    const minDim = Math.min(img.width, img.height);
    const baseScale = (width / minDim) * zoom;

    const drawWidth = img.width * baseScale;
    const drawHeight = img.height * baseScale;

    ctx.drawImage(
      img,
      -drawWidth / 2 + offsetX,
      -drawHeight / 2 + offsetY,
      drawWidth,
      drawHeight,
    );

    ctx.restore();

    // Generate live output preview
    const cropped = renderCroppedAvatar(img, {
      rotation,
      flipH,
      flipV,
      zoom,
      offsetX,
      offsetY,
      outputSize: 200,
    });
    setPreviewUrl(cropped);
  }, [imageLoaded, rotation, flipH, flipV, zoom, offsetX, offsetY]);

  useEffect(() => {
    updateRender();
  }, [updateRender]);

  // Dragging handlers
  function handlePointerDown(e: React.PointerEvent) {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    setOffsetX(e.clientX - dragStart.x);
    setOffsetY(e.clientY - dragStart.y);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  }

  function handleReset() {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }

  async function handleSave() {
    const img = imageRef.current;
    if (!img) return;

    const finalBase64 = renderCroppedAvatar(img, {
      rotation,
      flipH,
      flipV,
      zoom,
      offsetX,
      offsetY,
      outputSize: 350,
    });

    await onConfirm(finalBase64);
  }

  if (!open) return null;

  return (
    <Sheet open={open} onClose={onClose} title="قص وتعديل الصورة الشخصية">
      <div className="flex flex-col gap-5 text-start" dir="rtl">
        {/* Main Crop Viewport & Mask */}
        <div className="relative mx-auto flex flex-col items-center justify-center gap-2">
          <div className="relative size-64 overflow-hidden rounded-card border-2 border-primary/30 bg-ink/90 shadow-inner select-none cursor-move">
            <canvas
              ref={canvasRef}
              width={256}
              height={256}
              className="size-full object-cover"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />

            {/* Circular Crop Guide Mask */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="size-56 rounded-full border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.5)]" />
            </div>

            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface/80">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            )}
          </div>

          <p className="text-caption text-muted font-semibold">
            اسحب الصورة للتحريك والموضع المطلوب داخل الدائرة
          </p>
        </div>

        {/* Live Circular Preview Badge */}
        {previewUrl && (
          <div className="flex items-center justify-between rounded-card border border-hairline bg-surface p-3 shadow-xs">
            <div className="flex items-center gap-3">
              <img
                src={previewUrl}
                alt="المعاينة الحية"
                className="size-14 rounded-full border-2 border-primary/40 object-cover shadow-sm"
              />
              <div className="flex flex-col">
                <span className="text-small font-bold text-ink">المعاينة الحية</span>
                <span className="text-caption text-muted">
                  هكذا ستظهر صورتك الشخصية في حسابك
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Editing Controls Toolbar */}
        <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-hairline pb-2">
            <span className="flex items-center gap-1.5 text-small font-bold text-ink">
              <Sliders className="size-4 text-primary" />
              أدوات التعديل والدوران
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 text-caption font-bold text-muted hover:text-ink"
              title="إعادة ضبط"
            >
              <RefreshCw className="size-3.5" />
              إعادة ضبط
            </Button>
          </div>

          {/* Quick Action Buttons: Rotate & Flip */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setRotation((r) => (r - 90) % 360)}
              className="flex flex-col items-center justify-center gap-1 rounded-control border border-hairline p-2 text-caption font-bold text-body-text hover:bg-primary-tint hover:text-primary transition-colors"
              title="تدوير عكس عقارب الساعة"
            >
              <RotateCcw className="size-4" />
              <span>تدوير ٩٠°-</span>
            </button>

            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex flex-col items-center justify-center gap-1 rounded-control border border-hairline p-2 text-caption font-bold text-body-text hover:bg-primary-tint hover:text-primary transition-colors"
              title="تدوير مع عقارب الساعة"
            >
              <RotateCw className="size-4" />
              <span>تدوير ٩٠°+</span>
            </button>

            <button
              type="button"
              onClick={() => setFlipH((f) => !f)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-control border p-2 text-caption font-bold transition-colors",
                flipH
                  ? "border-primary bg-primary-tint text-primary"
                  : "border-hairline text-body-text hover:bg-primary-tint hover:text-primary",
              )}
              title="انعكاس أفقي"
            >
              <FlipHorizontal className="size-4" />
              <span>انعكاس أفقي</span>
            </button>

            <button
              type="button"
              onClick={() => setFlipV((f) => !f)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-control border p-2 text-caption font-bold transition-colors",
                flipV
                  ? "border-primary bg-primary-tint text-primary"
                  : "border-hairline text-body-text hover:bg-primary-tint hover:text-primary",
              )}
              title="انعكاس رأسي"
            >
              <FlipVertical className="size-4" />
              <span>انعكاس رأسي</span>
            </button>
          </div>

          {/* Sliders: Zoom & Continuous Rotation */}
          <div className="flex flex-col gap-3 pt-2">
            {/* Zoom Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-caption font-semibold text-body-text">
                <span className="flex items-center gap-1">
                  <ZoomIn className="size-3.5 text-primary" />
                  التكبير والنسبة (Zoom):
                </span>
                <span className="font-bold text-ink">{zoom.toFixed(1)}x</span>
              </div>
              <div className="flex items-center gap-2">
                <ZoomOut className="size-4 text-muted shrink-0" />
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="h-2 flex-1 cursor-pointer accent-primary"
                />
                <ZoomIn className="size-4 text-muted shrink-0" />
              </div>
            </div>

            {/* Rotation Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-caption font-semibold text-body-text">
                <span className="flex items-center gap-1">
                  <RotateCw className="size-3.5 text-primary" />
                  زاوية الدوران (Rotation):
                </span>
                <span className="font-bold text-ink">{rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                className="h-2 w-full cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isUploading}>
            <X className="size-4" />
            إلغاء
          </Button>

          <Button onClick={handleSave} loading={isUploading} disabled={!imageLoaded}>
            <Check className="size-4" />
            حفظ واستخدام الصورة
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
