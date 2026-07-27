"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { User as UserIcon, Mail, Phone, LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useSession, useLogout } from "@/src/features/auth/hooks/useSession";
import { VerifiedBadge } from "@/src/components/ui/VerifiedBadge";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";

export function ProfileScreen() {
  const router = useRouter();
  const { data: user, isLoading } = useSession();
  const logout = useLogout();

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, router, user]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!user) return null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="text-h1 font-bold text-ink">حسابي</h1>

      <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-tint text-primary">
            <UserIcon className="size-7" aria-hidden />
          </span>
          <div>
            <p className="text-title font-bold text-ink">{user.fullName}</p>
            <VerifiedBadge status={user.verificationStatus} />
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-hairline pt-3 text-small text-body-text">
          <p className="flex items-center gap-2">
            <Mail className="size-4 text-muted" aria-hidden />
            {user.email}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="size-4 text-muted" aria-hidden />
            {user.phoneNumber}
          </p>
        </div>
      </div>

      {/* Verification CTA — progressive verification (SRS 3.1/3.4): required
          before publishing a listing/request, accepting an offer, or revealing
          contact. Admins don't need it. */}
      {user.verificationStatus !== "APPROVED" && user.role !== "admin" && (
        <Link href="/verify" className="flex items-center gap-3 rounded-card border border-pending/30 bg-pending-tint px-4 py-3">
          <ShieldAlert className="size-5 text-pending" aria-hidden />
          <span className="flex-1 text-small font-semibold text-pending">وثّق حسابك لتفعيل كل المزايا</span>
          <span className="text-small text-pending">←</span>
        </Link>
      )}

      <Button variant="danger" onClick={() => logout.mutate()} loading={logout.isPending}>
        <LogOut className="size-4" aria-hidden />
        تسجيل الخروج
      </Button>
    </div>
  );
}
