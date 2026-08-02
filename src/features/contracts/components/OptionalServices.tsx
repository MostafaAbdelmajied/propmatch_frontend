"use client";

import { useState } from "react";
import { ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Sheet } from "@/src/components/ui/Sheet";
import { useToast } from "@/src/components/ui/Toast";
import { isApiClientError } from "@/src/lib/api/browserClient";
import type { AccountRole } from "@/src/lib/api/contracts/auth";
import type { PartnerServiceType } from "@/src/lib/api/contracts/partnerLead";
import { useCreatePartnerLead } from "../hooks/usePartnerLead";

const services: Record<
  PartnerServiceType,
  {
    title: string;
    description: string;
    action: string;
    dialogTitle: string;
    submit: string;
    loading: string;
    success: string;
    Icon: typeof Truck;
  }
> = {
  MOVING: {
    title: "مساعدة في نقل الأثاث",
    description: "اطلب مساعدة اختيارية لترتيب خدمة نقل مناسبة بعد مراجعة فريق الإدارة.",
    action: "طلب مساعدة في النقل",
    dialogTitle: "تأكيد طلب مساعدة النقل",
    submit: "إرسال طلب النقل",
    loading: "جاري إرسال طلب النقل...",
    success: "تم إرسال طلب مساعدة النقل. فريق الإدارة هيراجعه.",
    Icon: Truck,
  },
  INSURANCE: {
    title: "تأمين الإيجار",
    description: "ابعت طلب اهتمام اختياري بخدمة تأمين الإيجار، وفريق الإدارة هيراجع الطلب.",
    action: "طلب معلومات عن التأمين",
    dialogTitle: "تأكيد طلب معلومات التأمين",
    submit: "إرسال طلب التأمين",
    loading: "جاري إرسال طلب التأمين...",
    success: "تم إرسال طلب التأمين. فريق الإدارة هيراجعه.",
    Icon: ShieldCheck,
  },
};

function errorMessage(error: unknown): string {
  if (!isApiClientError(error)) return "مقدرناش نرسل الطلب حالياً. حاول مرة تانية.";
  const code =
    typeof error.body === "object" && error.body && "code" in error.body
      ? String(error.body.code)
      : "";
  if (error.statusCode === 403) return "مش مسموح للحساب ده بإرسال طلب الخدمة.";
  if (error.statusCode === 409 && code === "PARTNER_LEAD_ALREADY_PENDING")
    return "عندك طلب للخدمة دي قيد المراجعة بالفعل.";
  if (error.statusCode === 400) return "لازم توافق بشكل صريح قبل إرسال الطلب.";
  return "مقدرناش نرسل الطلب حالياً. حاول مرة تانية.";
}

export function OptionalServices({ role }: { role: AccountRole }) {
  const toast = useToast();
  const create = useCreatePartnerLead();
  const [serviceType, setServiceType] = useState<PartnerServiceType | null>(null);
  const [consent, setConsent] = useState(false);
  const [requested, setRequested] = useState<PartnerServiceType[]>([]);
  if (role === "admin") return null;
  const selected = serviceType ? services[serviceType] : null;
  const close = () => {
    if (!create.isPending) {
      setServiceType(null);
      setConsent(false);
    }
  };
  const open = (type: PartnerServiceType) => {
    if (!create.isPending && !requested.includes(type)) {
      setServiceType(type);
      setConsent(false);
    }
  };
  const submit = () => {
    if (!serviceType || !consent || create.isPending) return;
    const type = serviceType;
    create.mutate(
      { serviceType: type, consent: true },
      {
        onSuccess: () => {
          setRequested((items) => [...items, type]);
          toast("success", services[type].success);
          setServiceType(null);
          setConsent(false);
        },
        onError: (error) => {
          const message = errorMessage(error);
          if (isApiClientError(error) && error.statusCode === 409) {
            setRequested((items) => [...items, type]);
            setServiceType(null);
            setConsent(false);
          }
          toast("error", message);
        },
      },
    );
  };
  return (
    <section
      className="rounded-card border border-hairline bg-surface p-5"
      aria-labelledby="optional-services-title"
    >
      <h2 id="optional-services-title" className="text-title font-bold text-ink">
        خدمات اختيارية
      </h2>
      <p className="mt-1 text-small text-muted">
        محتاج مساعدة في النقل أو تأمين الإيجار؟ تقدر تبعت طلب اختياري، وفريق الإدارة هيراجعه ويتواصل
        معاك لاحقاً.
      </p>
      <p className="mt-2 text-caption text-muted">
        إرسال الطلب مش معناه مشاركة بياناتك تلقائياً مع أي شركة خارجية.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(Object.keys(services) as PartnerServiceType[]).map((type) => {
          const item = services[type];
          const done = requested.includes(type);
          const loading = create.isPending && serviceType === type;
          return (
            <article key={type} className="rounded-card border border-hairline p-4">
              <item.Icon className="size-5 text-primary" aria-hidden />
              <h3 className="mt-2 font-bold text-ink">{item.title}</h3>
              <p className="mt-1 text-small text-muted">{item.description}</p>
              <Button
                className="mt-4"
                variant="secondary"
                disabled={done || loading}
                onClick={() => open(type)}
              >
                {done ? "تم إرسال الطلب" : loading ? item.loading : item.action}
              </Button>
            </article>
          );
        })}
      </div>
      <Sheet
        open={Boolean(serviceType)}
        onClose={close}
        title={selected?.dialogTitle}
        dismissible={!create.isPending}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <p className="text-body text-body-text">
              الطلب هيتسجل داخل PropMatch AI عشان فريق الإدارة يراجعه. مش هيتم إرسال بياناتك
              تلقائياً لأي شركة خارجية.
            </p>
            <label className="flex items-start gap-2 text-small text-body-text">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 size-4 accent-primary"
              />
              أوافق على تسجيل طلبي ومراجعته بواسطة فريق الإدارة.
            </label>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={close} disabled={create.isPending}>
                إلغاء
              </Button>
              <Button
                onClick={submit}
                disabled={!consent || create.isPending}
                loading={create.isPending}
              >
                {create.isPending ? selected.loading : selected.submit}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </section>
  );
}
