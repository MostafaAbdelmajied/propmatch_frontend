import { addPropertyFormSchema, stepFields } from "../schemas";

const validValues = {
  title: "شقة للإيجار",
  description: "وصف تفصيلي مناسب للعقار المعروض للإيجار",
  governorate: "الدقهلية",
  city: "المنصورة",
  district: "حي الجامعة",
  manualAddress: "شارع الجمهورية",
  propertyType: "APARTMENT" as const,
  propertyAroundServices: "جامعة ومواصلات",
  rentAmount: 3000,
  areaM2: 100,
  bedrooms: 2,
  bathrooms: 1,
  isFurnished: false,
  hasElevator: true,
  hasParking: false,
};

describe("add property wizard schema", () => {
  it("groups all existing fields into the requested two steps", () => {
    expect(stepFields).toEqual({
      propertyDetails: [
        "propertyType",
        "title",
        "rentAmount",
        "governorate",
        "city",
        "district",
        "manualAddress",
        "areaM2",
        "bedrooms",
        "bathrooms",
        "isFurnished",
        "hasElevator",
        "hasParking",
      ],
      mediaAndDescription: ["images", "description", "propertyAroundServices"],
    });
  });

  it.each(["image/jpeg", "image/png", "image/webp"])("accepts selected %s files", (type) => {
    const result = addPropertyFormSchema.safeParse({
      ...validValues,
      images: [new File(["image"], "property-image", { type })],
    });

    expect(result.success).toBe(true);
  });

  it("requires at least one image and allows no more than ten", () => {
    const noImages = addPropertyFormSchema.safeParse({ ...validValues, images: [] });
    const elevenImages = addPropertyFormSchema.safeParse({
      ...validValues,
      images: Array.from(
        { length: 11 },
        (_, index) => new File(["image"], `${index}.jpg`, { type: "image/jpeg" }),
      ),
    });

    expect(noImages.success).toBe(false);
    expect(elevenImages.success).toBe(false);
  });

  it("rejects unsupported image types", () => {
    const result = addPropertyFormSchema.safeParse({
      ...validValues,
      images: [new File(["image"], "property.gif", { type: "image/gif" })],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an image larger than five megabytes", () => {
    const result = addPropertyFormSchema.safeParse({
      ...validValues,
      images: [
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
          type: "image/jpeg",
        }),
      ],
    });

    expect(result.success).toBe(false);
  });
});
