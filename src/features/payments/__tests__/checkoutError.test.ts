import type { ApiClientError } from "@/src/lib/api/browserClient";
import { getCheckoutErrorMessage } from "../checkoutError";

function apiError(message: string): ApiClientError {
  const error = new Error(message) as ApiClientError;
  error.name = "ApiClientError";
  error.statusCode = 400;
  error.body = { message };
  return error;
}

describe("getCheckoutErrorMessage", () => {
  it("hides internal backend configuration details", () => {
    expect(getCheckoutErrorMessage(apiError("Card payment iframe is not configured."))).toBe(
      "تعذر بدء عملية الدفع حالياً. حاول مرة أخرى لاحقاً.",
    );
  });

  it("preserves approved customer-facing payment messages", () => {
    const message =
      "رقم الهاتف غير مسجل كمحفظة إلكترونية. في وضع الاختبار استخدم رقم محفظة Paymob التجريبي 01010101010.";

    expect(getCheckoutErrorMessage(apiError(message))).toBe(message);
  });

  it("uses the generic message for unexpected errors", () => {
    expect(getCheckoutErrorMessage(new Error("network details"))).toBe(
      "تعذر بدء عملية الدفع حالياً. حاول مرة أخرى لاحقاً.",
    );
  });
});
