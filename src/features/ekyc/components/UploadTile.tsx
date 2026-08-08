"use client";

import Image from "next/image";
import { Camera, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/src/utils/cn";

type TileState = "empty" | "uploading" | "captured" | "bad-quality" | "locked";

export function UploadTile({
  title,
  hint,
  state,
  reason,
  previewUrl,
  onCapture,
  onFileChange,
  Icon = Camera,
}: {
  title: string;
  hint?: string;
  state: TileState;
  reason?: string | null;
  previewUrl?: string | null;
  onCapture?: () => void;
  onFileChange?: (file: File | null) => void;
  Icon?: typeof Camera;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const clickable = state === "empty" || state === "captured" || state === "bad-quality";

  const selectFile = () => {
    if (onFileChange) inputRef.current?.click();
    else onCapture?.();
  };
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-2 overflow-hidden rounded-card border-2 border-dashed p-3 text-center transition-colors",
        state === "captured" && "border-success bg-success-tint/40",
        state === "bad-quality" && "border-error bg-error-tint/40",
        state === "locked" && "border-hairline bg-background opacity-70",
        (state === "empty" || state === "uploading") && "border-hairline bg-surface",
        clickable && "hover:border-primary hover:bg-primary-tint/30",
      )}
    >
      {onFileChange && (
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          aria-label={title}
          accept="image/jpeg,image/png,image/webp"
          disabled={!clickable}
          onClick={(event) => {
            event.currentTarget.value = "";
          }}
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
      )}
      <button
        type="button"
        disabled={!clickable}
        onClick={selectFile}
        className="flex w-full flex-col items-center gap-2 rounded-[calc(var(--radius-card)-0.25rem)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {previewUrl && (
          <span className="relative block aspect-[16/9] w-full overflow-hidden rounded-[calc(var(--radius-card)-0.35rem)] bg-background">
            <Image
              src={previewUrl}
              alt={`معاينة ${title}`}
              fill
              unoptimized
              className="object-contain"
            />
            <span className="absolute inset-x-0 bottom-0 bg-ink/75 px-3 py-2 text-caption font-semibold text-white">
              {state === "locked" ? "جارٍ إرسال الصورة" : "اضغط لتغيير الصورة"}
            </span>
          </span>
        )}
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-full",
            state === "captured" && "bg-success-tint text-success",
            state === "bad-quality" && "bg-error-tint text-error",
            state === "locked" && "bg-hairline text-muted",
            (state === "empty" || state === "uploading") && "bg-primary-tint text-primary",
          )}
        >
          {state === "captured" ? (
            <CheckCircle2 className="size-6" aria-hidden />
          ) : state === "bad-quality" ? (
            <AlertCircle className="size-6" aria-hidden />
          ) : state === "locked" ? (
            <Lock className="size-6" aria-hidden />
          ) : (
            <Icon className="size-6" aria-hidden />
          )}
        </span>
        <span className="text-body font-bold text-ink">{title}</span>
        {state === "bad-quality" && reason ? (
          <span className="text-small text-error">{reason}</span>
        ) : hint ? (
          <span className="text-small text-muted">{hint}</span>
        ) : null}
      </button>
    </div>
  );
}
