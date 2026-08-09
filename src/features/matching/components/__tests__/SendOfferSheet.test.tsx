import { render, screen } from "@testing-library/react";
import { SendOfferSheet } from "../SendOfferSheet";
import { useMyProperties, useQuota } from "@/src/features/landlord/hooks/useLandlord";
import { useSendOffer, usePropertyScoresForRequest } from "../../hooks/useOffers";
import type { BrowsableTenantRequest } from "@/src/lib/api/contracts/tenantRequest";
import type { PropertySummary } from "@/src/lib/api/contracts/property";

jest.mock("@/src/components/ui/Toast", () => ({ useToast: () => jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/src/features/payments/PaymentSheet", () => ({ PaymentSheet: () => null }));

jest.mock("@/src/features/landlord/hooks/useLandlord", () => ({
  useMyProperties: jest.fn(),
  useQuota: jest.fn(),
}));

jest.mock("../../hooks/useOffers", () => ({
  useSendOffer: jest.fn(),
  usePropertyScoresForRequest: jest.fn(),
}));

const mockedMyProperties = jest.mocked(useMyProperties);
const mockedQuota = jest.mocked(useQuota);
const mockedSendOffer = jest.mocked(useSendOffer);
const mockedPropertyScores = jest.mocked(usePropertyScoresForRequest);

const request: BrowsableTenantRequest = {
  id: "request-1",
  minBudget: 2000,
  maxBudget: 5000,
  preferredLocations: "الاستاد",
  propertyType: "APARTMENT",
  requiredBedrooms: 2,
  needsFurnished: false,
  flexibilityScore: 5,
  lifestyleRequirements: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  matchScore: 74,
  matchReasons: [],
  alreadyOffered: false,
  bestMatchingProperty: { id: "property-1", title: "شقة في الاستاد" },
};

const property: PropertySummary = {
  id: "property-1",
  title: "شقة في الاستاد",
  governorate: "الدقهلية",
  city: "المنصورة",
  district: "الاستاد",
  propertyType: "APARTMENT",
  rentAmount: 5000,
  areaM2: 100,
  bedrooms: 2,
  bathrooms: 1,
  isFurnished: true,
  isBoosted: false,
  status: "APPROVED",
  coverImage: null,
  ownerVerified: true,
};

describe("SendOfferSheet — property score source of truth", () => {
  beforeEach(() => {
    mockedMyProperties.mockReset();
    mockedQuota.mockReset();
    mockedSendOffer.mockReset();
    mockedPropertyScores.mockReset();

    mockedMyProperties.mockReturnValue({
      data: { items: [property] },
      isLoading: false,
    } as unknown as ReturnType<typeof useMyProperties>);
    mockedQuota.mockReturnValue({
      data: { freeOffersLeft: 3 },
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useQuota>);
    mockedSendOffer.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSendOffer>);
  });

  it("shows the server's per-property score (matching the request list card), never a client-side recomputation", () => {
    mockedPropertyScores.mockReturnValue({
      data: { items: [{ propertyId: "property-1", score: 74 }] },
    } as unknown as ReturnType<typeof usePropertyScoresForRequest>);

    render(<SendOfferSheet request={request} onClose={jest.fn()} />);

    // The request card outside this sheet also shows 74% for this exact
    // property — this option must read the same server value, not
    // reimplement the formula and land on a different number (86% was the
    // bug: a client-side reimplementation missing the semantic-embedding
    // and lifestyle-keyword terms the server applies).
    expect(
      screen.getByRole("option", { name: /شقة في الاستاد.*\(74%\)/ }),
    ).toBeInTheDocument();
  });

  it("omits the percentage rather than showing a fabricated one while scores are still loading", () => {
    mockedPropertyScores.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof usePropertyScoresForRequest>);

    render(<SendOfferSheet request={request} onClose={jest.fn()} />);

    expect(screen.getByRole("option", { name: "شقة في الاستاد · 5,000 ج.م" })).toBeInTheDocument();
  });

  it("requests scores scoped to the open request's id", () => {
    mockedPropertyScores.mockReturnValue({
      data: { items: [] },
    } as unknown as ReturnType<typeof usePropertyScoresForRequest>);

    render(<SendOfferSheet request={request} onClose={jest.fn()} />);

    expect(mockedPropertyScores).toHaveBeenCalledWith("request-1");
  });
});
