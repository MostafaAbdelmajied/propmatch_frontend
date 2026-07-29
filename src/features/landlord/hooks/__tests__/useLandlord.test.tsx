import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { api } from "@/src/lib/api/browserClient";
import {
  createPropertyFormData,
  updatePropertyFormData,
  useCreateProperty,
  useDeleteProperty,
} from "../useLandlord";

jest.mock("@/src/lib/api/browserClient", () => {
  const actual = jest.requireActual("@/src/lib/api/browserClient");
  return {
    ...actual,
    api: { ...actual.api, postForm: jest.fn(), delete: jest.fn() },
  };
});

const mockedPostForm = jest.mocked(api.postForm);
const mockedDelete = jest.mocked(api.delete);

function apiError(code: string, statusCode = 403) {
  return Object.assign(new Error("رفض الخادم"), {
    name: "ApiClientError",
    statusCode,
    body: { code },
  });
}

describe("useCreateProperty", () => {
  beforeEach(() => mockedPostForm.mockReset());

  it("builds multipart data with image files in the selected order", () => {
    const first = new File(["first"], "first.jpg", { type: "image/jpeg" });
    const coverReplacement = new File(["second"], "second.webp", { type: "image/webp" });
    const append = jest.spyOn(FormData.prototype, "append");
    const formData = createPropertyFormData({
      title: "شقة للإيجار",
      description: "وصف تفصيلي مناسب للعقار المعروض للإيجار",
      governorate: "الدقهلية",
      city: "المنصورة",
      district: "حي الجامعة",
      manualAddress: "شارع الجمهورية",
      propertyType: "APARTMENT",
      propertyAroundServices: "جامعة ومواصلات",
      rentAmount: 3000,
      areaM2: 100,
      bedrooms: 2,
      bathrooms: 1,
      isFurnished: false,
      hasElevator: true,
      hasParking: false,
      images: [coverReplacement, first],
    });

    expect(formData.get("rentAmount")).toBe("3000");
    expect(formData.get("isFurnished")).toBe("false");
    expect(append.mock.calls.slice(-2)).toEqual([
      ["images", coverReplacement],
      ["images", first],
    ]);
    append.mockRestore();
  });

  it("builds edit multipart data with retained image ids and new files", () => {
    const newImage = new File(["new"], "new.png", { type: "image/png" });
    const append = jest.spyOn(FormData.prototype, "append");
    const formData = updatePropertyFormData({
      title: "شقة بعد التعديل",
      description: "وصف تفصيلي مناسب للعقار بعد تعديل بياناته",
      governorate: "الدقهلية",
      city: "المنصورة",
      district: "حي الجامعة",
      manualAddress: "شارع الجمهورية",
      propertyType: "APARTMENT",
      propertyAroundServices: "",
      rentAmount: 3500,
      areaM2: 100,
      bedrooms: 2,
      bathrooms: 1,
      isFurnished: false,
      hasElevator: true,
      hasParking: false,
      existingImageIds: ["image-2", "image-1"],
      newImages: [newImage],
    });

    expect(formData.get("existingImageIds")).toBe('["image-2","image-1"]');
    expect(append).toHaveBeenCalledWith("images", newImage);
    expect(formData.get("rentAmount")).toBe("3500");
    append.mockRestore();
  });

  it("waits for the exact canonical verification refetch after VERIFICATION_REQUIRED", async () => {
    mockedPostForm.mockRejectedValue(apiError("VERIFICATION_REQUIRED"));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const refetch = jest.spyOn(queryClient, "refetchQueries");
    let resolveRefetch: (() => void) | undefined;
    refetch.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRefetch = resolve;
        }),
    );
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateProperty(), { wrapper });

    const mutation = result.current.mutateAsync({ images: [] } as never).catch((error) => error);
    await waitFor(() =>
      expect(refetch).toHaveBeenCalledWith({ queryKey: ["verification"], exact: true }),
    );
    expect(mockedPostForm).toHaveBeenCalledTimes(1);
    resolveRefetch?.();
    await expect(mutation).resolves.toMatchObject({ code: "VERIFICATION_REQUIRED" });
    expect(mockedPostForm).toHaveBeenCalledTimes(1);
  });

  it("does not refetch verification for an unrelated 403", async () => {
    mockedPostForm.mockRejectedValue(apiError("CAPABILITY_REQUIRED"));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const refetch = jest.spyOn(queryClient, "refetchQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateProperty(), { wrapper });

    await expect(result.current.mutateAsync({ images: [] } as never)).rejects.toMatchObject({
      code: "CAPABILITY_REQUIRED",
    });
    expect(refetch).not.toHaveBeenCalled();
  });
});

describe("useDeleteProperty", () => {
  beforeEach(() => mockedDelete.mockReset());

  it("calls the owner delete endpoint", async () => {
    mockedDelete.mockResolvedValue({ ok: true, status: "ARCHIVED" });
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useDeleteProperty("property-1"), {
      wrapper,
    });

    await expect(result.current.mutateAsync()).resolves.toEqual({
      ok: true,
      status: "ARCHIVED",
    });
    expect(mockedDelete).toHaveBeenCalledWith(
      "landlord/properties/property-1",
    );
  });
});
