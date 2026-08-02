import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { api } from "@/src/lib/api/browserClient";
import { useKycReview, useReviewKyc } from "../useAdmin";

jest.mock("@/src/lib/api/browserClient", () => {
  const actual = jest.requireActual("@/src/lib/api/browserClient");
  return { ...actual, api: { ...actual.api, get: jest.fn(), post: jest.fn() } };
});

const mockedGet = jest.mocked(api.get);
const mockedPost = jest.mocked(api.post);

const kycDetails = {
  userId: "user-1",
  userName: "Test User",
  nationalId: null,
  nationalIdFrontUrl: "http://localhost:3001/api/storage/private/11111111-1111-4111-8111-111111111111",
  nationalIdBackUrl: "https://api.example.com/api/storage/private/22222222-2222-4222-8222-222222222222",
  selfieUrl: "https://api.example.com/api/storage/private/33333333-3333-4333-8333-333333333333",
  submittedAt: "2026-07-20T12:00:00.000Z",
};

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateQueries = jest.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, invalidateQueries, wrapper };
}

describe("admin KYC hooks", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("requests and returns the KYC detail for the selected user", async () => {
    mockedGet.mockResolvedValue(kycDetails);
    const { wrapper } = setup();
    const { result } = renderHook(() => useKycReview("user-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGet).toHaveBeenCalledWith("admin/kyc/user-1");
    expect(result.current.data).toEqual(kycDetails);
  });

  it("uses a distinct query identity when switching users", async () => {
    mockedGet.mockImplementation(async (path) => ({
      ...kycDetails,
      userId: path.endsWith("user-2") ? "user-2" : "user-1",
      userName: path.endsWith("user-2") ? "Second User" : "Test User",
    }));
    const { wrapper } = setup();
    const { result, rerender } = renderHook(({ userId }) => useKycReview(userId), {
      initialProps: { userId: "user-1" },
      wrapper,
    });

    await waitFor(() => expect(result.current.data?.userId).toBe("user-1"));
    rerender({ userId: "user-2" });

    await waitFor(() => expect(result.current.data?.userId).toBe("user-2"));
    expect(mockedGet).toHaveBeenCalledWith("admin/kyc/user-1");
    expect(mockedGet).toHaveBeenCalledWith("admin/kyc/user-2");
    expect(result.current.data?.userName).toBe("Second User");
  });

  it("refetches KYC details when the same user remounts", async () => {
    mockedGet.mockResolvedValue(kycDetails);
    const { wrapper } = setup();
    const first = renderHook(() => useKycReview("user-1"), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();

    const second = renderHook(() => useKycReview("user-1"), { wrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
  });

  it("does not poll KYC details in the background", async () => {
    jest.useFakeTimers();
    mockedGet.mockResolvedValue(kycDetails);
    const { wrapper } = setup();
    const { result } = renderHook(() => useKycReview("user-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("submits the current approve decision and invalidates the admin queue", async () => {
    mockedPost.mockResolvedValue({ ok: true });
    const { wrapper, invalidateQueries } = setup();
    const { result } = renderHook(() => useReviewKyc("user-1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ decision: { decision: "approve", reason: undefined } });
    });

    expect(mockedPost).toHaveBeenCalledWith("admin/kyc/user-1/review", {
      decision: "approve",
      reason: undefined,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin", "queues"] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["admin", "kyc", "user-1"] });
  });

  it("submits the current reject decision and fake reason", async () => {
    mockedPost.mockResolvedValue({ ok: true });
    const { wrapper } = setup();
    const { result } = renderHook(() => useReviewKyc("user-1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ decision: { decision: "reject", reason: "الوثيقة غير واضحة" } });
    });

    expect(mockedPost).toHaveBeenCalledWith("admin/kyc/user-1/review", {
      decision: "reject",
      reason: "الوثيقة غير واضحة",
    });
  });

  it("exposes a failed review and does not invalidate KYC details", async () => {
    mockedPost.mockRejectedValue(Object.assign(new Error("رفض الخادم"), { name: "ApiClientError", statusCode: 500 }));
    const { wrapper, invalidateQueries } = setup();
    const { result } = renderHook(() => useReviewKyc("user-1"), { wrapper });

    await expect(result.current.mutateAsync({ decision: { decision: "approve", reason: undefined } })).rejects.toEqual({
      conflict: false,
      message: "رفض الخادم",
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin", "queues"] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["admin", "kyc", "user-1"] });
  });
});
