import { CreateCheckoutRequestSchema, PaymentTypeSchema, paymentTypePrices } from "../payment";

describe("revised broker-free payment contract", () => {
  it("contains only the approved products and prices", () => {
    expect(PaymentTypeSchema.options).toEqual([
      "OWNER_PLUS_MONTHLY",
      "OWNER_PLUS_YEARLY",
      "PREMIUM_MONTHLY",
      "PREMIUM_YEARLY",
      "EXTRA_LISTING_60D",
      "OFFERS_10_60D",
      "BOOST_7D",
      "BOOST_14D",
      "BOOST_30D",
      "AI_USES_10_90D",
    ]);
    expect(paymentTypePrices).toEqual({
      OWNER_PLUS_MONTHLY: 299,
      OWNER_PLUS_YEARLY: 2990,
      PREMIUM_MONTHLY: 699,
      PREMIUM_YEARLY: 6990,
      EXTRA_LISTING_60D: 99,
      OFFERS_10_60D: 49,
      BOOST_7D: 79,
      BOOST_14D: 149,
      BOOST_30D: 249,
      AI_USES_10_90D: 39,
    });
  });

  it.each(["NEW_LISTING", "REFILL_MATCHES", "OFFER_PACK", "BROKER_SOLO"])(
    "rejects removed product %s",
    (product) => {
      expect(PaymentTypeSchema.safeParse(product).success).toBe(false);
    },
  );

  it("requires a valid Egyptian phone for wallet checkout", () => {
    expect(
      CreateCheckoutRequestSchema.safeParse({
        paymentType: "OFFERS_10_60D",
        method: "WALLET",
      }).success,
    ).toBe(false);
    expect(
      CreateCheckoutRequestSchema.safeParse({
        paymentType: "OFFERS_10_60D",
        method: "WALLET",
        walletPhone: "010-1234-5678",
      }).success,
    ).toBe(true);
  });

  it("does not require a wallet phone for card checkout", () => {
    expect(
      CreateCheckoutRequestSchema.safeParse({
        paymentType: "PREMIUM_MONTHLY",
        method: "CARD",
      }).success,
    ).toBe(true);
  });
});
