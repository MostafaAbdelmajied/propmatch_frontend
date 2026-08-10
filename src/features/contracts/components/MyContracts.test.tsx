import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MyContracts } from "./MyContracts";
import { api } from "@/src/lib/api/browserClient";

jest.mock("@/src/lib/api/browserClient", () => ({ api: { get: jest.fn() } }));

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MyContracts />
    </QueryClientProvider>,
  );

describe("MyContracts", () => {
  it("loads contracts through the collection endpoint and links with the real contract id", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      items: [
        {
          id: "contract-real-id",
          matchConnectionId: "match",
          status: "drafting",
          ownerName: "Owner",
          tenantName: "Tenant",
          propertyAddress: "Address",
          propertyTitle: "Apartment",
          propertyId: "property",
          rentAmount: 12000,
          startDate: "2026-08-01",
          endDate: "2027-07-31",
          customClauses: [],
          createdAt: "2026-07-01",
          updatedAt: "2026-07-02",
          disclaimer: {
            isDraft: true,
            isElectronicSignature: false,
            isLegallyAuthenticated: false,
            message: "draft",
          },
          tenantReviewStatus: "PENDING_REVIEW",
          draftRevision: 1,
          tenantReviewedRevision: null,
          tenantChangeRequest: null,
          tenantChangeRequestedAt: null,
          tenantReviewConfirmedAt: null,
          canEdit: true,
          canRequestChanges: false,
          canConfirmReview: false,
          canDownloadPdf: true,
          hasSubmittedUserReview: false,
        },
      ],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Apartment")).toBeTruthy());
    expect(api.get).toHaveBeenCalledWith("contracts");
    expect(screen.getByRole("link").getAttribute("href")).toBe("/contracts/contract-real-id");
    expect(screen.queryByText("drafting")).toBeNull();
  });

  it("shows the empty state without a mock fallback", async () => {
    (api.get as jest.Mock).mockResolvedValue({ items: [] });
    renderPage();
    await waitFor(() => expect(screen.queryByText("Apartment")).toBeNull());
  });

  it("renders every review-state label from backend results", async () => {
    const base = {
      matchConnectionId: "match",
      status: "drafting",
      ownerName: "Owner",
      tenantName: "Tenant",
      propertyAddress: "Address",
      propertyTitle: "Apartment",
      propertyId: "property",
      rentAmount: 12000,
      startDate: "2026-08-01",
      endDate: "2027-07-31",
      customClauses: [],
      createdAt: "2026-07-01",
      updatedAt: "2026-07-02",
      disclaimer: {
        isDraft: true,
        isElectronicSignature: false,
        isLegallyAuthenticated: false,
        message: "draft",
      },
      draftRevision: 1,
      tenantReviewedRevision: null,
      tenantChangeRequest: null,
      tenantChangeRequestedAt: null,
      tenantReviewConfirmedAt: null,
      canEdit: false,
      canRequestChanges: false,
      canConfirmReview: false,
      canDownloadPdf: true,
      hasSubmittedUserReview: false,
    };
    (api.get as jest.Mock).mockResolvedValue({
      items: ["PENDING_REVIEW", "CHANGES_REQUESTED", "REVIEW_CONFIRMED"].map(
        (tenantReviewStatus, index) => ({
          ...base,
          id: `contract-${index}`,
          tenantReviewStatus,
          propertyTitle: `Apartment ${index}`,
        }),
      ),
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Apartment 2")).toBeTruthy());
    expect(screen.getByText(/في انتظار مراجعة المستأجر/)).toBeTruthy();
    expect(screen.getByText(/مطلوب تعديلات/)).toBeTruthy();
    expect(screen.getByText(/تم تأكيد مراجعة المسودة/)).toBeTruthy();
  });

  it("shows a review call to action for a completed contract", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      items: [
        {
          id: "completed-contract",
          matchConnectionId: "match",
          status: "generated",
          ownerName: "Owner",
          tenantName: "Tenant",
          propertyAddress: "Address",
          propertyTitle: "Completed Apartment",
          propertyId: "property",
          rentAmount: 12000,
          startDate: "2026-08-01",
          endDate: "2027-07-31",
          customClauses: [],
          createdAt: "2026-07-01",
          updatedAt: "2026-07-02",
          disclaimer: {
            isDraft: false,
            isElectronicSignature: false,
            isLegallyAuthenticated: false,
            message: "contract",
          },
          tenantReviewStatus: "REVIEW_CONFIRMED",
          draftRevision: 1,
          tenantReviewedRevision: 1,
          tenantChangeRequest: null,
          tenantChangeRequestedAt: null,
          tenantReviewConfirmedAt: "2026-07-02",
          canEdit: false,
          canRequestChanges: false,
          canConfirmReview: false,
          canDownloadPdf: true,
          hasSubmittedUserReview: false,
        },
      ],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Completed Apartment")).toBeTruthy());
    expect(screen.getByText("مكتمل")).toBeTruthy();
    expect(screen.getByText("افتح العقد لتقييم الطرف الآخر")).toBeTruthy();
  });

  it("shows a recoverable error and no results after API failure", async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error("offline"));
    renderPage();
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});
