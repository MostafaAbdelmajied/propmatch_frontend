import { api } from "./browserClient";
import type { SubmitVerificationInput, VerificationResponse } from "./contracts/verification";

export function getMyVerification(): Promise<VerificationResponse> {
  return api.get<VerificationResponse>("verification/me");
}

export function submitVerification(input: SubmitVerificationInput): Promise<VerificationResponse> {
  const formData = new FormData();

  if (input.nationalId !== undefined) {
    formData.append("nationalId", input.nationalId);
  }

  formData.append("nationalIdFront", input.nationalIdFront);
  formData.append("nationalIdBack", input.nationalIdBack);
  formData.append("selfie", input.selfie);

  return api.postForm<VerificationResponse>("verification/submit", formData);
}
