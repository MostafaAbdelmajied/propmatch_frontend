import { isVerificationRequired, toActionError } from "../actionError";

function apiError(statusCode: number, code: string) {
  return Object.assign(new Error("رفض الخادم"), { name: "ApiClientError", statusCode, body: { code } });
}

describe("verification action errors", () => {
  it("preserves the API status and recognizes only the exact backend verification error", () => {
    const error = toActionError(apiError(403, "VERIFICATION_REQUIRED"));
    expect(error).toMatchObject({ statusCode: 403, code: "VERIFICATION_REQUIRED" });
    expect(isVerificationRequired(error)).toBe(true);
  });

  it.each([400, 500])("does not classify %i + VERIFICATION_REQUIRED as a verification gate", (statusCode) => {
    expect(isVerificationRequired(toActionError(apiError(statusCode, "VERIFICATION_REQUIRED")))).toBe(false);
  });

  it("does not classify an unrelated 403 as a verification gate", () => {
    expect(isVerificationRequired(toActionError(apiError(403, "CAPABILITY_REQUIRED")))).toBe(false);
  });
});
