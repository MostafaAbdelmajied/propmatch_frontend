import { isApiClientError } from "@/src/lib/api/browserClient";

const DEFAULT_CHECKOUT_ERROR = "تعذر بدء عملية الدفع حالياً. حاول مرة أخرى لاحقاً.";

const SAFE_CHECKOUT_ERRORS = new Set([
  DEFAULT_CHECKOUT_ERROR,
  "خدمة الدفع بالبطاقات غير متاحة حالياً. حاول مرة أخرى لاحقاً.",
  "خدمة الدفع بالمحفظة الإلكترونية غير متاحة حالياً. حاول مرة أخرى لاحقاً.",
  "أدخل رقم الهاتف المرتبط بالمحفظة الإلكترونية.",
  "رقم الهاتف غير مسجل كمحفظة إلكترونية. في وضع الاختبار استخدم رقم محفظة Paymob التجريبي 01010101010.",
  "تعذر تجهيز محفظة الدفع الإلكترونية لدى Paymob. تحقق من رقم المحفظة ثم حاول مرة أخرى.",
]);

export function getCheckoutErrorMessage(error: unknown): string {
  if (!isApiClientError(error) || !SAFE_CHECKOUT_ERRORS.has(error.message)) {
    return DEFAULT_CHECKOUT_ERROR;
  }
  return error.message;
}
