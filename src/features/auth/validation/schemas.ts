import { z } from "zod";

const normalizedEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("بريد إلكتروني غير صالح")
  .max(254);

export const loginFormSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string().min(1, "أدخل كلمة المرور"),
});
export type LoginForm = z.infer<typeof loginFormSchema>;

export const signupFormSchema = z.object({
  fullName: z.string().min(2, "أدخل اسمك بالكامل"),
  email: normalizedEmailSchema,
  phoneNumber: z.string().regex(/^01\d{9}$/, "رقم هاتف مصري غير صالح"),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل"),
  role: z.enum(["tenant", "landlord"], { required_error: "يرجى تحديد نوع الحساب" }),
});
export type SignupForm = z.infer<typeof signupFormSchema>;
