import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TenantRequestForm } from "../TenantRequestForm";
import { useVerificationState } from "@/src/features/ekyc/hooks/useKyc";
import { useCreateTenantRequest, useExtractTenantRequest } from "../../hooks/useTenantRequests";

jest.mock("@/src/features/ekyc/hooks/useKyc", () => ({ useVerificationState: jest.fn() }));
jest.mock("../../hooks/useTenantRequests", () => ({
  useCreateTenantRequest: jest.fn(),
  useExtractTenantRequest: jest.fn(),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/src/components/ui/Toast", () => ({ useToast: () => jest.fn() }));

const mockedVerification = jest.mocked(useVerificationState);
const mockedCreate = jest.mocked(useCreateTenantRequest);
const mockedExtract = jest.mocked(useExtractTenantRequest);

describe("TenantRequestForm verification integration", () => {
  beforeEach(() => {
    mockedCreate.mockReturnValue({ mutate: jest.fn(), isPending: false } as ReturnType<
      typeof useCreateTenantRequest
    >);
    mockedExtract.mockReturnValue({ mutateAsync: jest.fn(), isPending: false } as ReturnType<
      typeof useExtractTenantRequest
    >);
  });

  it("does not render or invoke the protected tenant-request mutation while verification is unapproved", () => {
    mockedVerification.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        status: "NOT_SUBMITTED",
        rejectionReason: null,
        submittedAt: null,
        reviewedAt: null,
        canSubmit: true,
      },
      refetch: jest.fn(),
    } as ReturnType<typeof useVerificationState>);

    render(<TenantRequestForm />);

    expect(screen.getByRole("link", { name: "ابدأ توثيق الهوية" })).toHaveAttribute(
      "href",
      "/verify",
    );
    expect(screen.queryByRole("button", { name: "إرسال الطلب للمراجعة" })).not.toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("renders the tenant request workflow when verification is approved", () => {
    mockedVerification.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        status: "APPROVED",
        rejectionReason: null,
        submittedAt: "2026-07-20T12:00:00.000Z",
        reviewedAt: null,
        canSubmit: false,
      },
      refetch: jest.fn(),
    } as ReturnType<typeof useVerificationState>);

    render(<TenantRequestForm />);

    expect(screen.getByRole("button", { name: "إرسال الطلب للمراجعة" })).toBeInTheDocument();
  });

  it("sends trimmed natural-language text to extraction without creating a request", async () => {
    mockedVerification.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        status: "APPROVED",
        rejectionReason: null,
        submittedAt: "2026-07-20T12:00:00.000Z",
        reviewedAt: null,
        canSubmit: false,
      },
      refetch: jest.fn(),
    } as ReturnType<typeof useVerificationState>);
    const extract = jest.fn().mockResolvedValue({
      originalText: "شقة قريبة من الجامعة",
      suggestions: {
        minBudget: 7000,
        maxBudget: 9000,
        preferredLocations: "حي الجامعة",
        propertyType: "APARTMENT",
        requiredBedrooms: 2,
        needsFurnished: true,
        flexibilityScore: 5,
        lifestyleRequirements: "مكان هادئ",
      },
      missingFields: [],
    });
    mockedExtract.mockReturnValue({ mutateAsync: extract, isPending: false } as ReturnType<
      typeof useExtractTenantRequest
    >);
    const user = userEvent.setup();

    render(<TenantRequestForm />);
    await user.type(screen.getByLabelText("اوصف العقار اللي محتاجه"), "  شقة قريبة من الجامعة  ");
    await user.click(screen.getByRole("button", { name: "ساعدني أملأ الطلب" }));

    expect(extract).toHaveBeenCalledWith({ text: "شقة قريبة من الجامعة" });
    expect(mockedCreate.mock.results[0]?.value.mutate).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("7000")).toBeInTheDocument();
    expect(
      screen.getByText("ضفنا الاقتراحات. راجع كل البيانات وعدّل أي حاجة قبل إرسال الطلب."),
    ).toBeInTheDocument();
  });

  it("keeps a manual field edit made while extraction is pending", async () => {
    mockedVerification.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        status: "APPROVED",
        rejectionReason: null,
        submittedAt: "2026-07-20T12:00:00.000Z",
        reviewedAt: null,
        canSubmit: false,
      },
      refetch: jest.fn(),
    } as ReturnType<typeof useVerificationState>);
    let resolveExtraction: ((value: unknown) => void) | undefined;
    const extract = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveExtraction = resolve;
      }),
    );
    mockedExtract.mockReturnValue({ mutateAsync: extract, isPending: false } as ReturnType<
      typeof useExtractTenantRequest
    >);
    const user = userEvent.setup();

    render(<TenantRequestForm />);
    await user.type(screen.getByLabelText("اوصف العقار اللي محتاجه"), "شقة");
    await user.click(screen.getByRole("button", { name: "ساعدني أملأ الطلب" }));
    const minBudget = screen.getByRole("spinbutton", { name: /أقل ميزانية/ });
    await user.clear(minBudget);
    await user.type(minBudget, "6100");
    resolveExtraction?.({
      originalText: "شقة",
      suggestions: {
        minBudget: 7000,
        maxBudget: null,
        preferredLocations: null,
        propertyType: null,
        requiredBedrooms: null,
        needsFurnished: null,
        flexibilityScore: null,
        lifestyleRequirements: null,
      },
      missingFields: ["maxBudget"],
    });

    expect(
      await screen.findByText("ضفنا الاقتراحات. راجع كل البيانات وعدّل أي حاجة قبل إرسال الطلب."),
    ).toBeInTheDocument();
    expect(minBudget).toHaveValue(6100);
    expect(screen.getByText("الحد الأقصى للميزانية")).toBeInTheDocument();
  });
});
