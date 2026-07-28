import { PaymentTypeSchema, paymentTypePrices } from "../payment";

describe("revised broker-free payment contract", () => {
  it("contains only the approved products and prices", () => {
    expect(PaymentTypeSchema.options).toEqual([
      "PREMIUM_OWNER",
      "OWNER_PLUS",
      "BOOST_LISTING",
      "AI_ADDON",
      "DOCS_PACK",
    ]);
    expect(paymentTypePrices).toEqual({
      PREMIUM_OWNER: 999,
      OWNER_PLUS: 499,
      BOOST_LISTING: 349,
      AI_ADDON: 199,
      DOCS_PACK: 299,
    });
  });

  it.each(["NEW_LISTING", "REFILL_MATCHES", "OFFER_PACK", "BROKER_SOLO"])(
    "rejects removed product %s",
    (product) => {
      expect(PaymentTypeSchema.safeParse(product).success).toBe(false);
    },
  );
});
