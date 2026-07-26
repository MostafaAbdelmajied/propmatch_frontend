import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { api } from "@/src/lib/api/browserClient";
import { useSemanticPropertySearch } from "../useProperties";

jest.mock("@/src/lib/api/browserClient", () => ({
  api: { get: jest.fn() },
}));

const semanticResponse = {
  items: [
    {
      id: "property-1",
      title: "شقة مفروشة",
      governorate: "الدقهلية",
      city: "المنصورة",
      district: "حي الجامعة",
      propertyType: "APARTMENT",
      rentAmount: 5000,
      areaM2: 90,
      bedrooms: 2,
      bathrooms: 1,
      isFurnished: true,
      isBoosted: false,
      status: "APPROVED",
      coverImage: null,
      ownerVerified: true,
      semanticSimilarity: 0.42,
      matchReasons: [
        { code: "MATCHES_SEARCH_INTENT", text: "يتوافق مع تفاصيل البحث والتفضيلات المكتوبة" },
      ],
    },
  ],
  total: 1,
  resultCount: 1,
  page: 1,
  pageSize: 10,
};

describe("useSemanticPropertySearch", () => {
  afterEach(() => jest.clearAllMocks());

  it("uses the BFF semantic-search contract with a trimmed bounded query", async () => {
    (api.get as jest.Mock).mockResolvedValue(semanticResponse);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useSemanticPropertySearch({ query: "  شقة مفروشة  ", limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.get).toHaveBeenCalledWith(
      "properties/search/semantic?query=%D8%B4%D9%82%D8%A9+%D9%85%D9%81%D8%B1%D9%88%D8%B4%D8%A9&limit=10",
    );
  });

  it("does not submit a one-character query", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSemanticPropertySearch({ query: "ش", limit: 10 }), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(api.get).not.toHaveBeenCalled();
  });
});
