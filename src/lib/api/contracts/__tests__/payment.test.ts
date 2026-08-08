import { CreateCheckoutRequestSchema, PaymentTypeSchema, paymentTypePrices } from "../payment";

describe("revised broker-free payment contract", () => {
  it("contains only the approved products and prices", () => {
    expect(PaymentTypeSchema.options).toEqual([
      "PREMIUM_OWNER",
      "OWNER_PLUS",
      "SINGLE_LISTING",
      "SINGLE_OFFER",
      "BOOST_LISTING",
      "AI_ADDON",
    ]);
    expect(paymentTypePrices).toEqual({
      PREMIUM_OWNER: 999,
      OWNER_PLUS: 499,
      SINGLE_LISTING: 149,
      SINGLE_OFFER: 99,
      BOOST_LISTING: 349,
      AI_ADDON: 199,
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
        paymentType: "SINGLE_OFFER",
        method: "WALLET",
      }).success,
    ).toBe(false);
    expect(
      CreateCheckoutRequestSchema.safeParse({
        paymentType: "SINGLE_OFFER",
        method: "WALLET",
        walletPhone: "010-1234-5678",
      }).success,
    ).toBe(true);
  });

  it("does not require a wallet phone for card checkout", () => {
    expect(
      CreateCheckoutRequestSchema.safeParse({
        paymentType: "PREMIUM_OWNER",
        method: "CARD",
      }).success,
    ).toBe(true);
  });
});
