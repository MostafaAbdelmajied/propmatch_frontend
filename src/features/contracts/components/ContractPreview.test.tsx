import { render, screen } from "@testing-library/react";
import { ContractPreview } from "./ContractPreview";

const downloadMutate = jest.fn();
const mockSession = jest.fn(() => ({ data: { role: "tenant" } }));
jest.mock("../hooks/useLeaseContract", () => ({
  useDownloadContractPdf: () => ({ mutate: downloadMutate, isPending: false }),
  useRequestContractChanges: () => ({ mutate: jest.fn(), isPending: false, isError: false }),
  useConfirmContractReview: () => ({ mutate: jest.fn(), isPending: false, isError: false }),
}));
jest.mock("@/src/features/auth/hooks/useSession", () => ({ useSession: () => mockSession() }));
jest.mock("@/src/components/ui/Toast", () => ({ useToast: () => jest.fn() }));

const contract = (overrides: Record<string, unknown> = {}) => ({
  id: "contract-id",
  matchConnectionId: "match-id",
  status: "drafting",
  ownerName: "Owner",
  tenantName: "Tenant",
  propertyAddress: "Address",
  rentAmount: 12000,
  startDate: "2026-08-01",
  endDate: "2027-07-31",
  customClauses: [],
  createdAt: "2026-07-01",
  changeRequestNote: null,
  witness1Name: null,
  witness2Name: null,
  pdfUrl: null,
  tenantReviewStatus: "PENDING_REVIEW",
  draftRevision: 2,
  tenantReviewedRevision: null,
  tenantChangeRequest: null,
  tenantChangeRequestedAt: null,
  tenantReviewConfirmedAt: null,
  canEdit: false,
  canRequestChanges: false,
  canConfirmReview: false,
  canDownloadPdf: true,
  ...overrides,
});

describe("ContractPreview review permissions", () => {
  it("shows tenant pending-review actions while keeping the saved contract read-only", () => {
    render(
      <ContractPreview
        contract={contract({ canRequestChanges: true, canConfirmReview: true }) as any}
      />,
    );
    expect(screen.getByText("طلب تعديل")).toBeTruthy();
    expect(screen.getByText("تأكيد مراجعة المسودة")).toBeTruthy();
    expect(screen.queryByText("تعديل المسودة")).toBeNull();
    expect(screen.getByText("تحميل نسخة PDF")).toBeTruthy();
  });

  it("shows tenant waiting/confirmed messages without review actions", () => {
    const { rerender } = render(
      <ContractPreview contract={contract({ tenantReviewStatus: "CHANGES_REQUESTED" }) as any} />,
    );
    expect(screen.getByText(/طلب التعديل اتبعت للمالك/)).toBeTruthy();
    expect(screen.queryByText("طلب تعديل")).toBeNull();
    rerender(
      <ContractPreview
        contract={contract({ tenantReviewStatus: "REVIEW_CONFIRMED", canEdit: false }) as any}
      />,
    );
    expect(screen.getByText(/تم تأكيد مراجعتك/)).toBeTruthy();
    expect(screen.queryByText("تأكيد مراجعة المسودة")).toBeNull();
    expect(screen.getByText("تحميل نسخة PDF")).toBeTruthy();
  });

  it("keeps a landlord editable after requested changes and locks after confirmation", () => {
    mockSession.mockReturnValue({ data: { role: "landlord" } });
    const { rerender } = render(
      <ContractPreview
        contract={
          contract({
            tenantReviewStatus: "CHANGES_REQUESTED",
            tenantChangeRequest: "Change date",
            canEdit: true,
          }) as any
        }
      />,
    );
    expect(screen.getByText(/التعديل المطلوب/)).toBeTruthy();
    expect(screen.getByText("تعديل المسودة")).toBeTruthy();
    rerender(
      <ContractPreview
        contract={contract({ tenantReviewStatus: "REVIEW_CONFIRMED", canEdit: false }) as any}
      />,
    );
    expect(screen.getByText(/المسودة مقفولة ضد التعديل/)).toBeTruthy();
    expect(screen.queryByText("تعديل المسودة")).toBeNull();
    expect(screen.queryByText("فتح المسودة")).toBeNull();
    mockSession.mockReturnValue({ data: { role: "tenant" } });
  });
});
