import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { api } from "@/src/lib/api/browserClient";
import { useCreateTenantRequest, useExtractTenantRequest } from "../useTenantRequests";

jest.mock("@/src/lib/api/browserClient", () => {
  const actual = jest.requireActual("@/src/lib/api/browserClient");
  return { ...actual, api: { ...actual.api, post: jest.fn() } };
});

const mockedPost = jest.mocked(api.post);
const request = {
  minBudget: 2000,
  maxBudget: 5000,
  preferredLocations: "المنصورة",
  propertyType: "APARTMENT" as const,
  requiredBedrooms: 2,
  needsFurnished: false,
  flexibilityScore: 5,
  lifestyleRequirements: "قريب من الجامعة",
};

function apiError(code: string, statusCode = 403) {
  return Object.assign(new Error("رفض الخادم"), {
    name: "ApiClientError",
    statusCode,
    body: { code },
  });
}

describe("useCreateTenantRequest", () => {
  beforeEach(() => mockedPost.mockReset());

  function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const refetch = jest.spyOn(queryClient, "refetchQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, refetch, wrapper };
  }

  it("submits once and waits for canonical verification reconciliation after VERIFICATION_REQUIRED", async () => {
    mockedPost.mockRejectedValue(apiError("VERIFICATION_REQUIRED"));
    const { wrapper, refetch } = setup();
    let resolveRefetch: (() => void) | undefined;
    refetch.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRefetch = resolve;
        }),
    );
    const { result } = renderHook(() => useCreateTenantRequest(), { wrapper });

    let settled = false;
    const mutation = result.current.mutateAsync(request).catch((error) => {
      settled = true;
      return error;
    });
    await waitFor(() =>
      expect(refetch).toHaveBeenCalledWith({ queryKey: ["verification"], exact: true }),
    );
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);
    resolveRefetch?.();
    await expect(mutation).resolves.toMatchObject({ code: "VERIFICATION_REQUIRED" });
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("does not treat an unrelated 403 as a verification state", async () => {
    mockedPost.mockRejectedValue(apiError("CAPABILITY_REQUIRED"));
    const { wrapper, refetch } = setup();
    const { result } = renderHook(() => useCreateTenantRequest(), { wrapper });

    await expect(result.current.mutateAsync(request)).rejects.toMatchObject({
      code: "CAPABILITY_REQUIRED",
    });
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });

  it.each([400, 500])(
    "does not refetch verification for %i + VERIFICATION_REQUIRED",
    async (statusCode) => {
      mockedPost.mockRejectedValue(apiError("VERIFICATION_REQUIRED", statusCode));
      const { wrapper, refetch } = setup();
      const { result } = renderHook(() => useCreateTenantRequest(), { wrapper });

      await expect(result.current.mutateAsync(request)).rejects.toMatchObject({
        statusCode,
        code: "VERIFICATION_REQUIRED",
      });
      expect(refetch).not.toHaveBeenCalled();
    },
  );
});

describe("useExtractTenantRequest", () => {
  beforeEach(() => mockedPost.mockReset());

  function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { wrapper };
  }

  it("uses the generic authenticated BFF route and validates the extraction response", async () => {
    mockedPost.mockResolvedValue({
      originalText: "شقة مفروشة",
      suggestions: {
        minBudget: 7000,
        maxBudget: null,
        preferredLocations: "حي الجامعة",
        propertyType: "APARTMENT",
        requiredBedrooms: 2,
        needsFurnished: true,
        flexibilityScore: 6,
        lifestyleRequirements: "هادئة",
      },
      missingFields: ["maxBudget"],
    });
    const { wrapper } = setup();
    const { result } = renderHook(() => useExtractTenantRequest(), { wrapper });

    await expect(result.current.mutateAsync({ text: "  شقة مفروشة  " })).resolves.toMatchObject({
      suggestions: { minBudget: 7000, needsFurnished: true },
      missingFields: ["maxBudget"],
    });
    expect(mockedPost).toHaveBeenCalledWith("tenant/requests/extract", { text: "شقة مفروشة" });
  });

  it("does not send blank text to the backend", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useExtractTenantRequest(), { wrapper });

    await expect(result.current.mutateAsync({ text: "   " })).rejects.toBeDefined();
    expect(mockedPost).not.toHaveBeenCalled();
  });
});
