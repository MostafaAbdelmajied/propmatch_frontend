import { z } from "zod";
import { CreatePropertyRequestSchema } from "@/src/lib/api/contracts/property";

const PROPERTY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PROPERTY_IMAGE_SIZE = 5 * 1024 * 1024;

/** Reuses the wire contract fields while keeping browser-selected files in form state. */
export const addPropertyFormSchema = CreatePropertyRequestSchema.omit({ images: true }).extend({
  images: z
    .array(
      z
        .custom<File>(
          (value) =>
            typeof File !== "undefined" &&
            value instanceof File &&
            PROPERTY_IMAGE_TYPES.includes(value.type),
          "يُسمح فقط بصور JPG وJPEG وPNG وWEBP",
        )
        .refine((file) => file.size <= MAX_PROPERTY_IMAGE_SIZE, "حجم الصورة يتجاوز 5 ميجابايت"),
    )
    .min(1, "أضف صورة واحدة على الأقل")
    .max(10, "يمكنك إضافة 10 صور كحد أقصى"),
});
export type AddPropertyForm = z.infer<typeof addPropertyFormSchema>;

/** Existing images can be retained while optional new files are uploaded. */
export const editPropertyFormSchema = CreatePropertyRequestSchema.omit({ images: true }).extend({
  existingImageIds: z.array(z.string()),
  newImages: z.array(
    z
      .custom<File>(
        (value) =>
          typeof File !== "undefined" &&
          value instanceof File &&
          PROPERTY_IMAGE_TYPES.includes(value.type),
        "يُسمح فقط بصور JPG وJPEG وPNG وWEBP",
      )
      .refine((file) => file.size <= MAX_PROPERTY_IMAGE_SIZE, "حجم الصورة يتجاوز 5 ميجابايت"),
  ),
}).superRefine((value, context) => {
  const imageCount = value.existingImageIds.length + value.newImages.length;
  if (imageCount < 1) {
    context.addIssue({ code: "custom", path: ["newImages"], message: "أضف صورة واحدة على الأقل" });
  }
  if (imageCount > 10) {
    context.addIssue({ code: "custom", path: ["newImages"], message: "يمكنك إضافة 10 صور كحد أقصى" });
  }
});
export type EditPropertyForm = z.infer<typeof editPropertyFormSchema>;

/** Field groups per wizard step, used to validate incrementally (PRO-04). */
export const stepFields = {
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
} as const;
