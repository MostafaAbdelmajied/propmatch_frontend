"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/src/lib/api/browserClient";
import type { CreatePartnerLeadRequest, PartnerLead } from "@/src/lib/api/contracts/partnerLead";

export function useCreatePartnerLead() {
  return useMutation({
    mutationFn: (body: CreatePartnerLeadRequest) => api.post<PartnerLead>("partner-leads", body),
  });
}
