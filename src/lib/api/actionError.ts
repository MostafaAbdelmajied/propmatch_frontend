import { isApiClientError } from "./browserClient";
import type { PaymentType } from "./contracts/payment";

/**
 * A domain error the UI must react to specifically rather than showing a
 * generic failure: VERIFICATION_REQUIRED → send to eKYC; QUOTA_EXHAUSTED →
 * open the paywall for `paymentType` (docs/analysis/rbac.md "gate composition").
 *
 * Both gates are server-authoritative — the client only mirrors the decision
 * the backend already made, never pre-empts it.
 */
export interface ActionError {
  statusCode?: number;
  code?: string;
  paymentType?: PaymentType;
  message: string;
}

export function toActionError(e: unknown): ActionError {
  if (isApiClientError(e)) {
    const body = e.body as { code?: string; paymentType?: PaymentType } | null;
    return { statusCode: e.statusCode, code: body?.code, paymentType: body?.paymentType, message: e.message };
  }
  return { message: "تعذر إتمام العملية، حاول مرة أخرى" };
}

export const isVerificationRequired = (e: ActionError | null | undefined) =>
  e?.statusCode === 403 && e.code === "VERIFICATION_REQUIRED";

export const isQuotaExhausted = (e: ActionError | null | undefined) => e?.code === "QUOTA_EXHAUSTED";
