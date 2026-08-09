"use client";

import { useState } from "react";
import { Pencil, Trash2, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProperty } from "@/src/features/listings/hooks/useProperties";
import { PropertyDetailView } from "@/src/features/listings/components/PropertyDetailView";
import { StatusChip } from "@/src/components/ui/StatusChip";
import { Button } from "@/src/components/ui/Button";
import { PaymentSheet } from "@/src/features/payments/PaymentSheet";
import { useToast } from "@/src/components/ui/Toast";
import { useQueryClient } from "@tanstack/react-query";
import { useBoostProperty, useDeleteProperty } from "../hooks/useLandlord";
import { ArchivePropertyAction } from "./ArchivePropertyAction";
import { PropertyAnalyticsPanel } from "./PropertyAnalyticsPanel";

/** Landlord view of their own listing: status, rejection reason, boost CTA. */
export function LandlordPropertyView({ id }: { id: string }) {
  const { data: p } = useProperty(id);
  const [boostOpen, setBoostOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const remove = useDeleteProperty(id);
  const boost = useBoostProperty(id);

  function activateBoost() {
    boost.mutate(undefined, {
      onSuccess: () => {
        toast("success", "تم استخدام رصيد Boost لمدة 7 أيام");
        qc.invalidateQueries({ queryKey: ["properties", id] });
        qc.invalidateQueries({ queryKey: ["quota"] });
      },
      onError: (error) => {
        if (error.code === "QUOTA_EXHAUSTED") setBoostOpen(true);
        else toast("error", error.message);
      },
    });
  }

  function deleteProperty() {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast("success", "تم حذف العقار");
        router.push("/landlord");
      },
      onError: (error) => toast("error", error.message),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {p && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline bg-surface p-4">
          <div className="flex items-center gap-2">
            <StatusChip status={p.status} />
            {p.status !== "APPROVED" && p.rejectionReason && (
              <span className="text-small text-error">سبب طلب التعديلات: {p.rejectionReason}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {p.status !== "ARCHIVED" && (
              <Link
                href={`/landlord/properties/${id}/edit`}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-control bg-primary px-3 text-small font-semibold text-white hover:bg-primary-dark"
              >
                <Pencil className="size-4" aria-hidden />
                تعديل العقار
              </Link>
            )}
            {p.status === "APPROVED" && (
              <Button size="sm" onClick={activateBoost} loading={boost.isPending}>
                <TrendingUp className="size-4" aria-hidden />
                {p.isBoosted ? "إضافة Boost متتالٍ" : "تمييز الإعلان"}
              </Button>
            )}
            {p.status !== "ARCHIVED" && (
              <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" aria-hidden />
                حذف العقار
              </Button>
            )}
          </div>
          {p.isBoosted && (
            <span className="rounded-pill bg-pending-tint px-3 py-1 text-caption font-bold text-pending">
              إعلان مميّز
            </span>
          )}
          <ArchivePropertyAction propertyId={p.id} status={p.status} />
        </div>
      )}

      <PropertyDetailView id={id} hideContact />

      {p?.status === "APPROVED" && <PropertyAnalyticsPanel propertyId={id} />}

      <PaymentSheet
        open={boostOpen}
        onClose={() => setBoostOpen(false)}
        paymentType="BOOST_7D"
        propertyId={id}
        onActivated={() => {
          toast("success", "تم تمييز إعلانك");
          qc.invalidateQueries({ queryKey: ["properties", id] });
          setBoostOpen(false);
        }}
      />

      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !remove.isPending) setDeleteOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-property-title"
            className="w-full max-w-md rounded-card border border-hairline bg-surface p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="delete-property-title" className="text-title font-bold text-ink">
                  حذف العقار؟
                </h2>
                <p className="mt-2 text-small leading-relaxed text-muted">
                  سيختفي الإعلان من حسابك ومن نتائج البحث، ولن يتمكن المستأجرون من فتحه.
                </p>
              </div>
              <button
                type="button"
                aria-label="إغلاق"
                disabled={remove.isPending}
                onClick={() => setDeleteOpen(false)}
                className="rounded-full p-1 text-muted hover:bg-background hover:text-ink disabled:opacity-50"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="mt-5 flex gap-3">
              <Button
                variant="danger"
                className="flex-1"
                loading={remove.isPending}
                onClick={deleteProperty}
              >
                <Trash2 className="size-4" aria-hidden />
                تأكيد الحذف
              </Button>
              <Button
                variant="ghost"
                disabled={remove.isPending}
                onClick={() => setDeleteOpen(false)}
              >
                إلغاء
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
