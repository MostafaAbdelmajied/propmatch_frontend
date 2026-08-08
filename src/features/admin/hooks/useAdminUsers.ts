/**
 * Suspension presentation constants. The actual data/mutation hooks
 * (useAdminUsers, useSuspendUser, useUnsuspendUser, useDeleteUser) live in
 * ./useTeam — one shared source for the merged Active/Suspended/Deleted
 * users table, instead of a second competing `useAdminUsers` here.
 *
 * Mirrors the backend `SUSPENSION_REASONS` codes + Arabic labels.
 */
export const SUSPENSION_REASONS: { code: string; label: string }[] = [
  { code: "SPAM", label: "رسائل مزعجة أو إعلانات مكررة" },
  { code: "FRAUD", label: "احتيال أو نصب" },
  { code: "FAKE_LISTING", label: "إعلان وهمي أو بيانات مضللة" },
  { code: "HARASSMENT", label: "تحرش أو إساءة تجاه المستخدمين" },
  { code: "IDENTITY_ABUSE", label: "انتحال هوية أو إساءة استخدام التوثيق" },
  { code: "TERMS_VIOLATION", label: "مخالفة شروط الاستخدام" },
  { code: "OTHER", label: "أخرى" },
];

/** Preset durations; `days: null` = permanent. */
export const SUSPENSION_DURATIONS: { days: number | null; label: string }[] = [
  { days: 1, label: "يوم واحد" },
  { days: 3, label: "3 أيام" },
  { days: 7, label: "7 أيام" },
  { days: 30, label: "30 يوم" },
  { days: null, label: "دائم" },
];
