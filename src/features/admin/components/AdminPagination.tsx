"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
}

export function AdminPagination({
  page,
  pageSize,
  total,
  isFetching = false,
  onPageChange,
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  return (
    <nav
      aria-label="التنقل بين الصفحات"
      className="flex flex-wrap items-center justify-center gap-3"
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1 || isFetching}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        <ChevronRight className="size-4" aria-hidden />
        السابق
      </Button>
      <span className="min-w-24 text-center text-small text-muted" aria-live="polite">
        صفحة {page} من {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages || isFetching}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      >
        التالي
        <ChevronLeft className="size-4" aria-hidden />
      </Button>
    </nav>
  );
}
