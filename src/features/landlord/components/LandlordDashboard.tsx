"use client";

import { PropertyCard } from "@/src/components/PropertyCard";
import { Button } from "@/src/components/ui/Button";
import { PropertyCardSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { StatusChip } from "@/src/components/ui/StatusChip";
import { useSession } from "@/src/features/auth/hooks/useSession";
import { useMyProperties } from "@/src/features/listings/hooks/useProperties";
import { Plus, ShieldAlert, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function LandlordDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, isLoading, isError, refetch } = useMyProperties();

  const notVerified = session && session.verificationStatus !== "APPROVED";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold text-ink">عقاراتي</h1>
          <p className="mt-1 text-small text-muted">أدر إعلاناتك وتابع الطلبات.</p>
        </div>
        <Link href="/landlord/properties/new">
          <Button>
            <Plus className="size-4" aria-hidden />
            إضافة عقار
          </Button>
        </Link>
      </div>

      {/* Verification banner */}
      {notVerified && (
        <Link
          href="/landlord/verify"
          className="flex items-center gap-3 rounded-card border border-pending/30 bg-pending-tint px-4 py-3"
        >
          <ShieldAlert className="size-5 shrink-0 text-pending" aria-hidden />
          <div className="flex-1">
            <p className="text-small font-bold text-pending">وثّق هويتك لتتمكن من نشر إعلاناتك</p>
            <p className="text-caption text-body-text">التوثيق يمنح المستأجرين الثقة ويزيد فرص التطابق.</p>
          </div>
          <span className="text-small font-semibold text-pending">ابدأ التوثيق ←</span>
        </Link>
      )}


      {/* Free listing banner */}
      {!isLoading && !isError && data && data.items.length === 0 && (
        <div className="flex items-center gap-2 rounded-card bg-primary-tint px-4 py-2.5 text-small font-semibold text-primary-dark">
          <TrendingUp className="size-5" aria-hidden />
          أول إعلان مجانًا
        </div>
      )}


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
          Icon={Plus}
          title="لا توجد عقارات بعد"
          description="أضف أول عقار لك مجانًا وابدأ في استقبال الطلبات."
          action={
            <Link href="/landlord/properties/new">
              <Button>إضافة عقار</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((property) => (
            <div key={property.id} className="relative">
              <div className="absolute inset-e-3 top-3 z-10">
                <StatusChip status={property.status} />
              </div>
              <PropertyCard property={property} onClick={() => router.push(`/landlord/properties/${property.id}`)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
