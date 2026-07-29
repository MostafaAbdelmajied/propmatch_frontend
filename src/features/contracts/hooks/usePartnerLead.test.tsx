import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { api } from "@/src/lib/api/browserClient";
import { useCreatePartnerLead } from "./usePartnerLead";

jest.mock("@/src/lib/api/browserClient", () => ({ api: { post: jest.fn() } }));

describe("useCreatePartnerLead", () => {
  it("posts the narrow consent payload to the generic BFF path", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      id: "lead",
      serviceType: "INSURANCE",
      status: "PENDING",
      consentedAt: "2026-07-29T00:00:00.000Z",
      createdAt: "2026-07-29T00:00:00.000Z",
    });
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreatePartnerLead(), { wrapper });
    result.current.mutate({ serviceType: "INSURANCE", consent: true });
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("partner-leads", {
        serviceType: "INSURANCE",
        consent: true,
      }),
    );
  });
});
