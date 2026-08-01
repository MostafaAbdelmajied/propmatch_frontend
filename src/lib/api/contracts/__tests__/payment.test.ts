import { PaymentTypeSchema, paymentTypePrices } from "../payment";

describe("revised broker-free payment contract", () => {
  it("contains only the approved products and prices", () => {
    expect(PaymentTypeSchema.options).toEqual([
      "PREMIUM_OWNER",
      "BOOST_LISTING",
      "AI_ADDON",
    ]);
    expect(paymentTypePrices).toEqual({
      PREMIUM_OWNER: 999,
      BOOST_LISTING: 349,
      AI_ADDON: 199,
    });
  });

  it.each(["OWNER_PLUS", "NEW_LISTING", "REFILL_MATCHES", "OFFER_PACK", "BROKER_SOLO"])(
    "rejects removed product %s",
    (product) => {
      expect(PaymentTypeSchema.safeParse(product).success).toBe(false);
    },
  );
});
