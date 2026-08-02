"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, KeyRound, Ban, CheckCircle2, ShieldAlert, Users } from "lucide-react";
import { useTeam, useCreateAdmin, useUpdateAdmin, useResetAdminPassword, useAdminSession } from "../hooks/useTeam";
import { Button } from "@/src/components/ui/Button";
import { InputField, SelectField } from "@/src/components/ui/Field";
import { Sheet } from "@/src/components/ui/Sheet";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/States";
import { useToast } from "@/src/components/ui/Toast";
import { cn } from "@/src/utils/cn";
import { formatRelativeTime } from "@/src/utils/format";
import {
  AdminRoleSchema,
  CreateAdminRequestSchema,
  adminRoleLabels,
  type AdminRole,
  type CreateAdminRequest,
} from "@/src/lib/api/contracts/admin";

const roleOptions = AdminRoleSchema.options.map((r) => ({ value: r, label: adminRoleLabels[r] }));

export function AdminTeam() {
  const toast = useToast();
  const { data: session } = useAdminSession();
  const { data, isLoading, isError, refetch } = useTeam();
  const update = useUpdateAdmin();
  const reset = useResetAdminPassword();
  const [createOpen, setCreateOpen] = useState(false);

  const canManage = session?.capabilities.includes("admin:manage") ?? false;
  const canCreate = session?.capabilities.includes("admin:create") ?? false;

  // The layout already blocks non-admins; this guards the sub-capability.
  if (session && !canManage) {
    return (
      <EmptyState
        Icon={ShieldAlert}
        title="لا تملك صلاحية إدارة المشرفين"
        description="هذا القسم متاح لأصحاب صلاحية admin:manage فقط."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-h1 font-bold text-ink">
            <Users className="size-6 text-primary" aria-hidden />
            فريق الإشراف
          </h1>
          <p className="mt-1 text-small text-muted">إدارة المشرفين وأدوارهم وصلاحياتهم.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" aria-hidden />
            إضافة مشرف
          </Button>
        )}
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
        <EmptyState Icon={Users} title="لا يوجد مشرفون" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-hairline">
          <table className="w-full min-w-[640px] text-start text-small">
            <thead className="bg-background text-caption text-muted">
              <tr>
                <th className="p-3 text-start font-semibold">المشرف</th>
                <th className="p-3 text-start font-semibold">الدور</th>
                <th className="p-3 text-start font-semibold">آخر دخول</th>
                <th className="p-3 text-start font-semibold">الحالة</th>
                <th className="p-3 text-start font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((m) => (
                <tr key={m.id} className="border-t border-hairline">
                  <td className="p-3">
                    <p className="font-bold text-ink">{m.fullName}</p>
                    <p className="text-caption text-muted">{m.email}</p>
                  </td>
                  <td className="p-3">
                    <SelectField
                      aria-label="الدور"
                      options={roleOptions}
                      value={m.role}
                      onChange={(e) =>
                        update.mutate(
                          { id: m.id, body: { role: e.target.value as AdminRole } },
                          { onSuccess: () => toast("success", "تم تحديث الدور") },
                        )
                      }
                      className="w-40"
                    />
                  </td>
                  <td className="p-3 text-muted">{m.lastLoginAt ? formatRelativeTime(m.lastLoginAt) : "—"}</td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-caption font-semibold",
                        m.disabled ? "bg-error-tint text-error" : "bg-success-tint text-success",
                      )}
                    >
                      {m.disabled ? "معطّل" : "نشط"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        title="إعادة تعيين كلمة المرور"
                        onClick={() => reset.mutate(m.id, { onSuccess: () => toast("success", "تم إرسال رابط إعادة التعيين") })}
                        className="flex size-8 items-center justify-center rounded-control text-muted hover:bg-background hover:text-ink"
                      >
                        <KeyRound className="size-4" aria-hidden />
                      </button>
                      <button
                        title={m.disabled ? "تفعيل" : "تعطيل"}
                        onClick={() =>
                          update.mutate(
                            { id: m.id, body: { disabled: !m.disabled } },
                            { onSuccess: () => toast("success", m.disabled ? "تم التفعيل" : "تم التعطيل") },
                          )
                        }
                        className={cn(
                          "flex size-8 items-center justify-center rounded-control hover:bg-background",
                          m.disabled ? "text-success" : "text-error",
                        )}
                      >
                        {m.disabled ? <CheckCircle2 className="size-4" aria-hidden /> : <Ban className="size-4" aria-hidden />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateAdminSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateAdminSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const create = useCreateAdmin();
  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<CreateAdminRequest>({ resolver: zodResolver(CreateAdminRequestSchema), defaultValues: { role: "customer-support" } });

  function submit(values: CreateAdminRequest) {
    create.mutate(values, {
      onSuccess: () => {
        toast("success", "تم إنشاء المشرف");
        resetForm();
        onClose();
      },
      onError: () => toast("error", "تعذر إنشاء المشرف"),
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="إضافة مشرف جديد">
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        <InputField label="الاسم بالكامل" error={errors.fullName?.message} {...register("fullName")} />
        <InputField label="البريد الإلكتروني" type="email" error={errors.email?.message} {...register("email")} />
        <InputField label="رقم الهاتف" error={errors.phoneNumber?.message} {...register("phoneNumber")} />
        <InputField label="كلمة المرور" type="password" error={errors.password?.message} {...register("password")} />
        <SelectField label="الدور" options={roleOptions} {...register("role")} />
        <p className="text-caption text-muted">
          يحدد الدور مجموعة الصلاحيات تلقائيًا (راجع مصفوفة الصلاحيات في وثائق RBAC).
        </p>
        <Button type="submit" block loading={create.isPending}>
          إنشاء
        </Button>
      </form>
    </Sheet>
  );
}
