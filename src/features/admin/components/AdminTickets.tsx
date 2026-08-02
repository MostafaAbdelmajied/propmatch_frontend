"use client";

import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { ticketStatusLabels } from "@/src/lib/api/contracts/support";
import { cn } from "@/src/utils/cn";
import { formatRelativeTime } from "@/src/utils/format";
import { ChevronLeft, Clock, Headset, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTickets } from "../hooks/useTickets";

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

export function AdminTickets() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useTickets();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-h1 font-bold text-ink">
          <Headset className="size-6 text-primary" aria-hidden />
          الدعم الفني
        </h1>
        <p className="mt-1 text-small text-muted">التذاكر المحوّلة من المساعد الآلي إلى موظفي الدعم.</p>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState Icon={Headset} title="لا توجد تذاكر" description="عندما يطلب عميل التحدث مع موظف ستظهر تذكرته هنا." />
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
                    <span className={cn("rounded-pill px-2 py-0.5 text-caption font-bold", statusTone[t.status])}>
                      {ticketStatusLabels[t.status]}
                    </span>
                    <span className="truncate text-small font-bold text-ink">{t.subject}</span>
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
    </div>
  );
}
