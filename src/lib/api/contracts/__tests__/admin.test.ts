import { AdminQueuesResponseSchema, KycReviewDetailSchema } from "../admin";

const validKycDetails = {
  userId: "user-1",
  userName: "Test User",
  nationalId: null,
  nationalIdFrontUrl: "http://localhost:3001/api/storage/private/11111111-1111-4111-8111-111111111111",
  nationalIdBackUrl: "https://api.example.com/api/storage/private/22222222-2222-4222-8222-222222222222",
  selfieUrl: "https://api.example.com/api/storage/private/33333333-3333-4333-8333-333333333333",
  submittedAt: "2026-07-20T12:00:00.000Z",
};

describe("KycReviewDetailSchema", () => {
  it("accepts public HTTP/HTTPS document URLs and a nullable National ID", () => {
    expect(KycReviewDetailSchema.safeParse(validKycDetails).success).toBe(true);
    expect(KycReviewDetailSchema.safeParse({ ...validKycDetails, nationalId: "masked-id" }).success).toBe(true);
  });

  it.each([
    "private-local://read/token",
    "file:///document.jpg",
    "/api/storage/private/token",
    "development/identity/object.jpg",
    "C:\\private\\document.jpg",
    "",
    "not a url",
  ])("rejects a non-browser document URL: %s", (url) => {
    expect(KycReviewDetailSchema.safeParse({ ...validKycDetails, nationalIdFrontUrl: url }).success).toBe(false);
  });

  it.each(["nationalIdFrontUrl", "nationalIdBackUrl", "selfieUrl", "userId", "submittedAt"])(
    "rejects a missing required field: %s",
    (field) => {
      const value = { ...validKycDetails } as Record<string, unknown>;
      delete value[field];
      expect(KycReviewDetailSchema.safeParse(value).success).toBe(false);
    },
  );

  it("strips extra internal fields from accepted output", () => {
    const result = KycReviewDetailSchema.parse({ ...validKycDetails, internalObjectKey: "not-returned" });
    expect(result).not.toHaveProperty("internalObjectKey");
  });
});

describe("AdminQueuesResponseSchema", () => {
  it("accepts the dedicated edited-property queue", () => {
    const edited = {
      id: "q_prop_edit_property-1",
      type: "propertyEdit",
      subjectId: "property-1",
      title: "شقة معدلة",
      subtitle: "تم تعديل الإعلان",
      submittedAt: "2026-07-29T12:00:00.000Z",
    };
    expect(
      AdminQueuesResponseSchema.safeParse({
        kycQueue: [],
        propertyQueue: [],
        editedPropertyQueue: [edited],
        requestQueue: [],
        reviewQueue: [],
      }).success,
    ).toBe(true);
  });
});
