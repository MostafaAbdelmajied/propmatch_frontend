"use client";

import { useState } from "react";
import { ScrollText, LogIn, ShieldCheck, XCircle } from "lucide-react";
import { useAuditLog, useLoginHistory } from "../hooks/useTeam";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { formatRelativeTime } from "@/src/utils/format";
import { AdminPagination } from "./AdminPagination";

const PAGE_SIZE = 20;

/** Read-only audit log + login history (AuditLog is append-only — ASSUMPTIONS #9). */
export function AdminActivity() {
  const [auditPage, setAuditPage] = useState(1);
  const [loginPage, setLoginPage] = useState(1);
  const audit = useAuditLog({ page: auditPage, pageSize: PAGE_SIZE });
  const logins = useLoginHistory({ page: loginPage, pageSize: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-h1 font-bold text-ink">
          <ScrollText className="size-6 text-primary" aria-hidden />
          سجل النشاط
        </h1>
        <p className="mt-1 text-small text-muted">
          سجل الإجراءات الحساسة وعمليات الدخول (للاطلاع فقط).
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-bold text-ink">سجل الإجراءات</h2>
        {audit.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : audit.isError ? (
          <ErrorState onRetry={() => audit.refetch()} />
        ) : !audit.data || audit.data.items.length === 0 ? (
          <EmptyState Icon={ScrollText} title="لا توجد إجراءات مسجّلة بعد" />
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-hairline rounded-card border border-hairline bg-surface">
              {audit.data.items.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" aria-hidden />
                    <span className="text-small text-ink">
                      <b>{e.actorName}</b> —{" "}
                      <span dir="ltr" className="font-mono text-caption">
                        {e.action}
                      </span>
                    </span>
                  </div>
                  <span className="text-caption text-muted">{formatRelativeTime(e.at)}</span>
                </li>
              ))}
            </ul>
            <AdminPagination
              page={auditPage}
              pageSize={audit.data.pageSize}
              total={audit.data.total}
              isFetching={audit.isFetching}
              onPageChange={setAuditPage}
            />
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-bold text-ink">سجل الدخول</h2>
        {logins.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : logins.isError ? (
          <ErrorState onRetry={() => logins.refetch()} />
        ) : !logins.data || logins.data.items.length === 0 ? (
          <EmptyState Icon={LogIn} title="لا يوجد سجل دخول" />
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-hairline rounded-card border border-hairline bg-surface">
              {logins.data.items.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-2">
                    {e.success ? (
                      <LogIn className="size-4 text-success" aria-hidden />
                    ) : (
                      <XCircle className="size-4 text-error" aria-hidden />
                    )}
                    <span className="text-small text-ink">
                      <b>{e.adminName}</b> —{" "}
                      <span dir="ltr" className="text-caption text-muted">
                        {e.ip}
                      </span>
                    </span>
                  </div>
                  <span className="text-caption text-muted">{formatRelativeTime(e.at)}</span>
                </li>
              ))}
            </ul>
            <AdminPagination
              page={loginPage}
              pageSize={logins.data.pageSize}
              total={logins.data.total}
              isFetching={logins.isFetching}
              onPageChange={setLoginPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
