"use client";

import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { ticketStatusLabels } from "@/src/lib/api/contracts/support";
import { cn } from "@/src/utils/cn";
import { formatRelativeTime } from "@/src/utils/format";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Headset,
  User as UserIcon,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type AdminTicketCommercialFilter,
  type AdminTicketStatusFilter,
  useTickets,
} from "../hooks/useTickets";

const statusTone: Record<string, string> = {
  NEW: "bg-trust-blue-tint text-trust-blue",
  ASSIGNED: "bg-primary-tint text-primary",
  IN_PROGRESS: "bg-pending-tint text-pending",
  WAITING: "bg-background text-muted",
  CLOSED: "bg-success-tint text-success",
  new: "bg-trust-blue-tint text-trust-blue",
  assigned: "bg-primary-tint text-primary",
  in_progress: "bg-pending-tint text-pending",
  waiting: "bg-background text-muted",
  closed: "bg-success-tint text-success",
};

const statusFilters: { value: AdminTicketStatusFilter; label: string }[] = [
  { value: "all", label: "كل الحالات" },
  { value: "new", label: "جديد" },
  { value: "assigned", label: "مُعيّن" },
  { value: "in_progress", label: "قيد المعالجة" },
  { value: "waiting", label: "بانتظار العميل" },
  { value: "closed", label: "مغلق" },
];

const commercialFilters: { value: AdminTicketCommercialFilter; label: string }[] = [
  { value: "ALL", label: "كل الباقات" },
  { value: "FREEMIUM", label: "Freemium" },
  { value: "OWNER_PLUS", label: "Owner Plus" },
  { value: "PREMIUM", label: "Premium" },
];

const PAGE_SIZE = 10;

export function AdminTickets() {
  const router = useRouter();
  const [status, setStatus] = useState<AdminTicketStatusFilter>("all");
  const [commercialPriority, setCommercialPriority] = useState<AdminTicketCommercialFilter>("ALL");
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError, refetch } = useTickets({
    status,
    commercialPriority,
    page,
    pageSize: PAGE_SIZE,
  });
  const filtersActive = status !== "all" || commercialPriority !== "ALL";
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  function clearFilters() {
    setStatus("all");
    setCommercialPriority("ALL");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-h1 font-bold text-ink">
          <Headset className="size-6 text-primary" aria-hidden />
          الدعم الفني
        </h1>
        <p className="mt-1 text-small text-muted">
          تذاكر العملاء وطلبات مراجعة إيقاف الحسابات المحوّلة إلى فريق الدعم.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-y border-hairline py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ticket-status-filter"
              className="flex items-center gap-1.5 text-caption font-bold text-muted"
            >
              <Filter className="size-3.5" aria-hidden />
              حالة التذكرة
            </label>
            <select
              id="ticket-status-filter"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as AdminTicketStatusFilter);
                setPage(1);
              }}
              className="min-w-44 rounded-control border border-hairline bg-surface px-3 py-2 text-small text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {statusFilters.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ticket-plan-filter" className="text-caption font-bold text-muted">
              باقة العميل
            </label>
            <select
              id="ticket-plan-filter"
              value={commercialPriority}
              onChange={(event) => {
                setCommercialPriority(event.target.value as AdminTicketCommercialFilter);
                setPage(1);
              }}
              className="min-w-44 rounded-control border border-hairline bg-surface px-3 py-2 text-small text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {commercialFilters.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-4" aria-hidden />
              مسح الفلاتر
            </Button>
          )}
        </div>

        <p className="text-small text-muted" aria-live="polite">
          {data ? `${data.total} تذكرة` : "جارٍ تحميل التذاكر"}
        </p>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || isFetching ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          Icon={Headset}
          title={filtersActive ? "لا توجد تذاكر مطابقة" : "لا توجد تذاكر"}
          description={
            filtersActive
              ? "جرّب تغيير حالة التذكرة أو باقة العميل."
              : "عندما يطلب عميل التحدث مع موظف ستظهر تذكرته هنا."
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.items.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => router.push(`/admin/support/${t.id}`)}
                className="flex w-full items-center justify-between gap-3 rounded-card border border-hairline bg-surface p-4 text-start shadow-card hover:border-primary/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-pill px-2 py-0.5 text-caption font-bold",
                        statusTone[t.status],
                      )}
                    >
                      {ticketStatusLabels[t.status]}
                    </span>
                    <span className="truncate text-small font-bold text-ink">{t.subject}</span>
                    {t.commercialPriority && (
                      <span
                        className={cn(
                          "rounded-pill px-2 py-0.5 text-[10px] font-bold",
                          t.commercialPriority === "PREMIUM" && "bg-amber-500/15 text-amber-700",
                          t.commercialPriority === "OWNER_PLUS" && "bg-primary-tint text-primary",
                          t.commercialPriority === "FREEMIUM" && "bg-background text-muted",
                        )}
                      >
                        {t.commercialPriority === "PREMIUM"
                          ? "Premium"
                          : t.commercialPriority === "OWNER_PLUS"
                            ? "Owner Plus"
                            : "Freemium"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-caption text-muted">
                    <UserIcon className="size-3" aria-hidden />
                    {t.userName}
                    {t.assignedAdminName && <span>· معيّن لـ {t.assignedAdminName}</span>}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-caption text-muted">
                  <Clock className="size-3" aria-hidden />
                  {formatRelativeTime(t.lastMessageAt)}
                  <ChevronLeft className="size-4" aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {data && data.total > PAGE_SIZE && (
        <nav
          className="flex flex-wrap items-center justify-center gap-3"
          aria-label="صفحات تذاكر الدعم"
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronRight className="size-4" aria-hidden />
            السابق
          </Button>
          <span className="text-small text-muted">
            صفحة {data.page} من {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((current) => current + 1)}
          >
            التالي
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
        </nav>
      )}
    </div>
  );
}
