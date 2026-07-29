import { z } from "zod";

/** Narrow contract for internal, explicit-consent optional-service requests. */
export const PartnerServiceTypeSchema = z.enum(["MOVING", "INSURANCE"]);
export type PartnerServiceType = z.infer<typeof PartnerServiceTypeSchema>;

export const partnerServiceLabels: Record<PartnerServiceType, string> = {
  MOVING: "مساعدة في نقل الأثاث",
  INSURANCE: "تأمين الإيجار",
};

export const PartnerLeadStatusSchema = z.enum(["PENDING", "SENT", "CONVERTED"]);
export type PartnerLeadStatus = z.infer<typeof PartnerLeadStatusSchema>;

export const CreatePartnerLeadRequestSchema = z.object({
  serviceType: PartnerServiceTypeSchema,
  consent: z.literal(true),
});
export type CreatePartnerLeadRequest = z.infer<typeof CreatePartnerLeadRequestSchema>;

export const PartnerLeadSchema = z.object({
  id: z.string(),
  serviceType: PartnerServiceTypeSchema,
  status: z.literal("PENDING"),
  consentedAt: z.string(),
  createdAt: z.string(),
});
export type PartnerLead = z.infer<typeof PartnerLeadSchema>;
