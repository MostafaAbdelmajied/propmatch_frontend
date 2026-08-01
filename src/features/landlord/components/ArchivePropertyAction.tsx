"use client";

import { useState } from "react";
import { Archive, RotateCcw } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/components/ui/Toast";
import { useArchiveProperty, useUnarchiveProperty } from "@/src/features/landlord/hooks/useLandlord";
import type { PropertyStatus } from "@/src/lib/api/contracts/common";

export function ArchivePropertyAction({
  propertyId,
  status,
}: {
  propertyId: string;
  status: PropertyStatus;
}) {
  const [open, setOpen] = useState(false);
  const archive = useArchiveProperty(propertyId);
  const unarchive = useUnarchiveProperty(propertyId);
  const toast = useToast();

  const restoring = status === "ARCHIVED";
  const mutation = restoring ? unarchive : archive;

  const submit = () => {
    mutation.mutate(undefined, {
      onSuccess: () => {
        setOpen(false);
        toast(
          "success",
          restoring
            ? "تمت إعادة العقار للمراجعة قبل نشره مرة أخرى."
            : "تمت أرشفة العقار بنجاح.",
        );
      },
      onError: (error) => {
        if (error.statusCode === 401 || error.statusCode === 403) {
          toast("error", restoring ? "ليس لديك صلاحية لاستعادة هذا العقار." : "ليس لديك صلاحية لأرشفة هذا العقار.");
          return;
        }
        toast("error", restoring ? "تعذرت استعادة العقار حالياً. حاول مرة أخرى." : "تعذرت أرشفة العقار حالياً. حاول مرة أخرى.");
      },
    });
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {restoring ? <RotateCcw className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
        {restoring ? "إعادة للمراجعة" : "أرشفة العقار"}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-ink/40 p-4 sm:items-center sm:justify-center"
          role="presentation"
          onClick={() => !mutation.isPending && setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-property-title"
            className="w-full max-w-md rounded-card bg-surface p-5 shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="archive-property-title" className="text-title font-bold text-ink">
              {restoring ? "إعادة العقار للمراجعة" : "أرشفة العقار"}
            </h2>
            <p className="mt-2 text-body text-body-text">
              {restoring
                ? "لن يعود العقار ظاهراً للمستأجرين مباشرة. سيتم إرساله للمراجعة الإدارية أولاً."
                : "سيختفي العقار من نتائج البحث والعروض الجديدة، وسيبقى ظاهراً لك ضمن عقاراتك المؤرشفة."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={mutation.isPending}>
                إلغاء
              </Button>
              <Button type="button" variant={restoring ? "primary" : "danger"} loading={mutation.isPending} onClick={submit}>
                {restoring ? "إرسال للمراجعة" : "تأكيد الأرشفة"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
