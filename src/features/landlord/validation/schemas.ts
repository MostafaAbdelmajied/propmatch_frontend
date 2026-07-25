import { z } from "zod";
import { CreatePropertyRequestSchema } from "@/src/lib/api/contracts/property";

const PROPERTY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Reuses the wire contract fields while keeping browser-selected files in form state. */
export const addPropertyFormSchema = CreatePropertyRequestSchema.omit({ images: true }).extend({
  images: z
    .array(
      z.custom<File>(
        (value) =>
          typeof File !== "undefined" &&
          value instanceof File &&
          PROPERTY_IMAGE_TYPES.includes(value.type),
        "يُسمح فقط بصور JPG وJPEG وPNG وWEBP",
      ),
    )
    .min(1, "أضف صورة واحدة على الأقل")
    .max(10, "يمكنك إضافة 10 صور كحد أقصى"),
});
export type AddPropertyForm = z.infer<typeof addPropertyFormSchema>;

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
