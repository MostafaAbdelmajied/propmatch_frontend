import { CreateTenantRequestSchema } from "../tenantRequest";

const valid = {
  minBudget: 3000,
  maxBudget: 5000,
  preferredLocations: "حي الجامعة",
  propertyType: "APARTMENT" as const,
  requiredBedrooms: 2,
  needsFurnished: true,
  flexibilityScore: 6,
  lifestyleRequirements: "أبحث عن شقة هادئة قريبة من الجامعة",
};

describe("CreateTenantRequestSchema", () => {
  it("accepts a well-formed request", () => {
    expect(CreateTenantRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an inverted budget range, reporting it on maxBudget", () => {
    const res = CreateTenantRequestSchema.safeParse({ ...valid, minBudget: 8000, maxBudget: 5000 });

    expect(res.success).toBe(false);
    expect(res.error?.issues[0]).toMatchObject({
      path: ["maxBudget"],
      message: "أعلى ميزانية يجب أن تكون أكبر من أقلها",
    });
  });

  it("allows an exact budget (min === max)", () => {
    expect(CreateTenantRequestSchema.safeParse({ ...valid, minBudget: 5000, maxBudget: 5000 }).success).toBe(true);
  });

  it("holds flexibilityScore to the ERD's 1–10 range", () => {
    expect(CreateTenantRequestSchema.safeParse({ ...valid, flexibilityScore: 0 }).success).toBe(false);
    expect(CreateTenantRequestSchema.safeParse({ ...valid, flexibilityScore: 11 }).success).toBe(false);
    expect(CreateTenantRequestSchema.safeParse({ ...valid, flexibilityScore: 5.5 }).success).toBe(false);
  });

  it("requires the free-text field the AI matcher depends on", () => {
    const res = CreateTenantRequestSchema.safeParse({ ...valid, lifestyleRequirements: "قصير" });
    expect(res.success).toBe(false);
  });
});
