import { ContractUserReviewStatusSchema, CreateUserReviewSchema } from "../userReview";

describe("user review contracts", () => {
  it("accepts the four tenant-to-landlord ratings", () => {
    expect(
      CreateUserReviewSchema.parse({
        overallRating: 5,
        communicationRating: 4,
        responsivenessRating: 3,
        propertyAccuracyRating: 5,
      }),
    ).toEqual({
      overallRating: 5,
      communicationRating: 4,
      responsivenessRating: 3,
      propertyAccuracyRating: 5,
    });
  });

  it("rejects ratings outside one to five", () => {
    expect(
      CreateUserReviewSchema.safeParse({
        overallRating: 6,
        communicationRating: 4,
        responsivenessRating: 3,
        commitmentRating: 5,
      }).success,
    ).toBe(false);
  });

  it("parses an eligible landlord-to-tenant review status", () => {
    expect(
      ContractUserReviewStatusSchema.safeParse({
        eligible: true,
        submitted: false,
        direction: "LANDLORD_TO_TENANT",
        revieweeId: "tenant-1",
        revieweeName: "Tenant",
        review: null,
        receivedSummary: {
          total: 0,
          overallRating: null,
          communicationRating: null,
          responsivenessRating: null,
          propertyAccuracyRating: null,
          commitmentRating: null,
        },
      }).success,
    ).toBe(true);
  });
});
