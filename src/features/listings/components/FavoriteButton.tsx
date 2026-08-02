"use client";

import { Heart } from "lucide-react";
import { cn } from "@/src/utils/cn";
import { useIsFavorited, useToggleFavorite } from "../hooks/useFavorites";

/**
 * ERD `FAVORITE` toggle. Sits on cards and the detail page; stops click
 * propagation so tapping it never navigates into the card underneath.
 */
export function FavoriteButton({ propertyId, className }: { propertyId: string; className?: string }) {
  const favorited = useIsFavorited(propertyId);
  const toggle = useToggleFavorite();

  return (
    <button
      type="button"
      aria-pressed={favorited}
      aria-label={favorited ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      title={favorited ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      disabled={toggle.isPending}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggle.mutate({ propertyId, favorited });
      }}
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-surface/90 shadow-card transition-colors",
        "hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <Heart className={cn("size-4.5 transition-colors", favorited ? "fill-error text-error" : "text-muted")} aria-hidden />
    </button>
  );
}
