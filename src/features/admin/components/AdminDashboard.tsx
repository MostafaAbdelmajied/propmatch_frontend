"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ScanFace, Clock, ChevronLeft, FileText, Star, ShieldAlert, Pencil } from "lucide-react";
import { useAdminQueues, useModerateReview, useReviewTenantRequest } from "../hooks/useAdmin";
import { useAdminSession } from "../hooks/useTeam";
import { InputField } from "@/src/components/ui/Field";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { formatRelativeTime } from "@/src/utils/format";
import { cn } from "@/src/utils/cn";
import type { QueueItem } from "@/src/lib/api/contracts/admin";
import type { Capability } from "@/src/lib/api/contracts/common";

/**
 * Moderation queues: eKYC, new properties, property edits, tenant requests,
 * and property reviews.
 *
 * Each column is capability-gated (sub-roles restored — conflicts.md B2-R), so
 * a kyc-reviewer sees only the eKYC column. That is UX only; the backend's
 * capability guard is what actually enforces it.
 */
export function AdminDashboard() {
  const { data, isLoading } = useAdminQueues();
  const { data: session } = useAdminSession();
  const caps = session?.capabilities ?? [];
  const can = (c: Capability) => caps.includes(c);

  const columns = [
    {
      cap: "property:approve" as Capability,
      title: "عقارات بانتظار المراجعة",
      Icon: Home,
      items: data?.propertyQueue,
      emptyText: "لا توجد عقارات بانتظار المراجعة",
      hrefBase: "/admin/properties",
    },
    {
      cap: "property:approve" as Capability,
      title: "تعديلات عقارات بانتظار المراجعة",
      Icon: Pencil,
      items: data?.editedPropertyQueue,
      emptyText: "لا توجد تعديلات عقارات بانتظار المراجعة",
      hrefBase: "/admin/properties",
    },
    {
      cap: "kyc:review" as Capability,
      title: "مستخدمون بحاجة لمراجعة",
      Icon: ScanFace,
      items: data?.kycQueue,
      emptyText: "لا توجد طلبات توثيق جديدة",
      hrefBase: "/admin/users",
    },
    {
      cap: "request:approve" as Capability,
      title: "طلبات سكن بانتظار النشر",
      Icon: FileText,
      items: data?.requestQueue,
      emptyText: "لا توجد طلبات سكن جديدة",
      hrefBase: "/admin/requests",
      // Inline decide + a link through to the full read (PRO-08).
      type: "request" as const,
    },
    {
      cap: "review:moderate" as Capability,
      title: "تقييمات بانتظار المراجعة",
      Icon: Star,
      items: data?.reviewQueue,
      emptyText: "لا توجد تقييمات جديدة",
      hrefBase: "/admin/reviews",
      type: "review" as const,
    },
  ].filter((c) => can(c.cap));

  return (
    <div id="moderation" className="flex scroll-mt-6 flex-col gap-5">
      <div>
        <h1 className="text-h1 font-bold text-ink">لوحة المراجعة</h1>
        <p className="mt-1 text-small text-muted">تُحدَّث القائمة تلقائيًا فور وصول طلبات جديدة.</p>
      </div>

      {session && columns.length === 0 ? (
        <EmptyState
          Icon={ShieldAlert}
          title="لا تملك صلاحية مراجعة أي طابور"
          description={`دورك الحالي «${session.roleName}» للاطلاع فقط.`}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {columns.map((col) => (
            <QueueColumn key={col.title} {...col} loading={isLoading} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueColumn({
  title,
  Icon,
  items,
  loading,
  emptyText,
  hrefBase,
  type,
}: {
  title: string;
  Icon: typeof Home;
  items?: QueueItem[];
  loading: boolean;
  emptyText: string;
  hrefBase?: string;
  type?: "request" | "review";
}) {
  const router = useRouter();
  return (
    <section className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4">
      <h2 className="flex items-center gap-2 text-title font-bold text-ink">
        <Icon className="size-5 text-primary" aria-hidden />
        {title}
        {items && items.length > 0 && (
          <span className="rounded-pill bg-primary px-2 py-0.5 text-caption font-bold text-white">{items.length}</span>
        )}
      </h2>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState Icon={Icon} title={emptyText} />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li key={item.id}>
              {type ? (
                <ModeratableItem item={item} type={type} hrefBase={hrefBase} />
              ) : (
                <button
                  onClick={() => router.push(`${hrefBase}/${item.subjectId}`)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-control border border-hairline p-3 text-start",
                    "hover:border-primary hover:bg-primary-tint/30",
                    "animate-[queue-slide-in_.5s_ease-out]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-small font-bold text-ink">{item.title}</p>
                      <CommercialPriorityBadge tier={item.commercialPriority} />
                    </div>
                    <p className="truncate text-caption text-muted">{item.subtitle}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-caption text-muted">
                    <Clock className="size-3" aria-hidden />
                    {formatRelativeTime(item.submittedAt)}
                    <ChevronLeft className="size-4" aria-hidden />
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Decide from the queue, or open the full record first.
 *
 * The title links through to the detail page deliberately: the subtitle is
 * truncated, and approving a tenant request publishes it to every verified
 * landlord — the full free text is where PII the tenant typed gets caught
 * (ASSUMPTIONS.md #20). Fast path for the obvious ones, full read when it
 * matters.
 */
function ModeratableItem({
  item,
  type,
  hrefBase,
}: {
  item: QueueItem;
  type: "request" | "review";
  hrefBase?: string;
}) {
  const toast = useToast();
  // Both hooks must be called unconditionally (rules of hooks); only the one
  // matching this queue is used.
  const requestReview = useReviewTenantRequest(item.subjectId);
  const reviewModeration = useModerateReview(item.subjectId);
  const review = type === "request" ? requestReview : reviewModeration;

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function decide(decision: "approve" | "reject") {
    review.mutate(
      { decision: { decision, reason: decision === "reject" ? reason.trim() : undefined } },
      {
        onSuccess: () => {
          toast("success", decision === "approve" ? "تمت الموافقة" : "تم الرفض");
          setRejecting(false);
          setReason("");
        },
        // 409 = someone else already moderated it; that's information, not failure.
        onError: (e) => toast(e.conflict ? "info" : "error", e.message),
      },
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-control border border-hairline p-3 animate-[queue-slide-in_.5s_ease-out]">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <CommercialPriorityBadge tier={item.commercialPriority} />
        </div>
        {hrefBase ? (
          <Link
            href={`${hrefBase}/${item.subjectId}`}
            className="text-small font-bold text-ink hover:text-primary hover:underline"
          >
            {item.title}
          </Link>
        ) : (
          <p className="text-small font-bold text-ink">{item.title}</p>
        )}
        <p className="mt-1 truncate text-caption leading-relaxed text-muted">{item.subtitle}</p>
        <p className="mt-1.5 flex items-center gap-1 text-caption text-muted">
          <Clock className="size-3" aria-hidden />
          {formatRelativeTime(item.submittedAt)}
        </p>
      </div>

      {rejecting && (
        <InputField
          aria-label="سبب الرفض"
          placeholder="سبب الرفض (يظهر لصاحبه)…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
      )}

      <div className="mt-1 flex gap-2 border-t border-hairline pt-2">
        {rejecting ? (
          <>
            <button
              type="button"
              // The backend 400s without a reason — don't let them try.
              disabled={review.isPending || !reason.trim()}
              onClick={() => decide("reject")}
              className="flex-1 rounded-control bg-error px-2 py-1 text-caption font-bold text-white hover:bg-error/90 disabled:opacity-50"
            >
              تأكيد الرفض
            </button>
            <button
              type="button"
              disabled={review.isPending}
              onClick={() => {
                setRejecting(false);
                setReason("");
              }}
              className="rounded-control px-2 py-1 text-caption font-bold text-muted hover:text-ink"
            >
              إلغاء
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={review.isPending}
              onClick={() => decide("approve")}
              className="flex-1 rounded-control bg-success px-2 py-1 text-caption font-bold text-white hover:bg-success/80 disabled:opacity-50"
            >
              قبول
            </button>
            <button
              type="button"
              disabled={review.isPending}
              onClick={() => setRejecting(true)}
              className="flex-1 rounded-control border border-error px-2 py-1 text-caption font-bold text-error hover:bg-error-tint/30 disabled:opacity-50"
            >
              رفض
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CommercialPriorityBadge({ tier }: { tier: QueueItem["commercialPriority"] }) {
  tier ??= "FREEMIUM";
  const label = tier === "PREMIUM" ? "Premium" : tier === "OWNER_PLUS" ? "Owner Plus" : "Freemium";
  return (
    <span
      className={cn(
        "shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-bold",
        tier === "PREMIUM" && "bg-amber-500/15 text-amber-700",
        tier === "OWNER_PLUS" && "bg-primary-tint text-primary",
        tier === "FREEMIUM" && "bg-background text-muted",
      )}
    >
      {label}
    </span>
  );
}
