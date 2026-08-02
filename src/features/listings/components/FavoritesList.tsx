"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { PropertyCard } from "@/src/components/PropertyCard";
import { Button } from "@/src/components/ui/Button";
import { PropertyCardSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { useFavorites } from "../hooks/useFavorites";
import { FavoriteButton } from "./FavoriteButton";

/** ERD `FAVORITE` — the tenant's saved properties. */
export function FavoritesList() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useFavorites();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h1 font-bold text-ink">المفضلة</h1>
        <p className="mt-1 text-small text-muted">العقارات التي حفظتها للرجوع إليها لاحقًا.</p>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          Icon={Heart}
          title="لا توجد عقارات في المفضلة"
          description="اضغط على القلب في أي إعلان لحفظه هنا."
          action={
            <Link href="/tenant">
              <Button>تصفّح العقارات</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onClick={() => router.push(`/tenant/properties/${property.id}`)}
              actionSlot={<FavoriteButton propertyId={property.id} />}
            />
          ))}
        </div>
      )}
    </div>
  );
}
