"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, BadgeCheck, Home, Sparkles, Star, CreditCard, FileText, Inbox, MessageCircle } from "lucide-react";
import { api } from "@/src/lib/api/browserClient";
import { cn } from "@/src/utils/cn";
import { formatNumber, formatRelativeTime } from "@/src/utils/format";
import type { NotificationType, NotificationsResponse } from "@/src/lib/api/contracts/notification";

/**
 * The bell switches on the ERD `NOTIFICATION.type` enum, never on free text
 * (requirements.md §6) — every member must be mapped here or the icon lookup
 * silently yields undefined and React fails to render.
 */
const typeIcon: Record<NotificationType, typeof Bell> = {
  EKYC_APPROVED: BadgeCheck,
  PROPERTY_APPROVED: Home,
  NEW_MATCH: Sparkles,
  PAYMENT_SUCCESS: CreditCard,
  NEW_REVIEW_SUBMITTED: Star,
  REVIEW_APPROVED: Star,
  NEW_TENANT_REQUEST: FileText,
  NEW_OFFER_RECEIVED: Inbox,
  NEW_MESSAGE: MessageCircle,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const notificationsEnabled = process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED !== "false";

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationsResponse>("notifications"),
    enabled: notificationsEnabled,
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post<{ ok: boolean }>("notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => api.post<{ ok: boolean }>(`notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-9 items-center justify-center rounded-full text-body-text hover:bg-background"
        aria-label={unread > 0 ? `الإشعارات (${formatNumber(unread)} غير مقروء)` : "الإشعارات"}
        aria-expanded={open}
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
            {formatNumber(unread)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
            <span className="text-small font-bold text-ink">الإشعارات</span>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-caption font-semibold text-primary hover:underline disabled:opacity-50"
              >
                تعليم الكل كمقروء
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-muted">
              <BellOff className="size-6" aria-hidden />
              <span className="text-small">لا توجد إشعارات جديدة</span>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => {
                const Icon = typeIcon[n.type] ?? Bell;
                const body = (
                  <>
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                        n.isRead ? "bg-background text-muted" : "bg-primary-tint text-primary",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-small", n.isRead ? "text-body-text" : "font-semibold text-ink")}>
                        {n.title}
                      </span>
                      <span className="block truncate text-caption text-muted">{n.message}</span>
                      <span className="block text-caption text-muted">{formatRelativeTime(n.createdAt)}</span>
                    </span>
                    {!n.isRead && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                  </>
                );

                return (
                  <li key={n.id} className="border-b border-hairline last:border-0">
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => {
                          if (!n.isRead) markRead.mutate(n.id);
                          setOpen(false);
                        }}
                        className="flex w-full items-start gap-3 px-4 py-3 text-start hover:bg-background"
                      >
                        {body}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => !n.isRead && markRead.mutate(n.id)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-start hover:bg-background"
                      >
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
