import { render, screen } from "@testing-library/react";
import { VerificationGate } from "../VerificationGate";
import { useVerificationState } from "../../hooks/useKyc";

jest.mock("../../hooks/useKyc", () => ({ useVerificationState: jest.fn() }));

const mockedUseVerificationState = jest.mocked(useVerificationState);
const refetch = jest.fn();

function state(status: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" | "RESUBMISSION_REQUIRED") {
  return {
    isLoading: false,
    isError: false,
    data: { status, rejectionReason: "الصورة غير واضحة", submittedAt: null, reviewedAt: null, canSubmit: status !== "PENDING" },
    refetch,
  };
}

describe("VerificationGate", () => {
  beforeEach(() => refetch.mockReset());

  it("fails closed while loading", () => {
    mockedUseVerificationState.mockReturnValue({ isLoading: true } as ReturnType<typeof useVerificationState>);
    render(<VerificationGate verificationPath="/verify"><button>إرسال</button></VerificationGate>);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "إرسال" })).not.toBeInTheDocument();
  });

  it("fails closed while an approved verification is being reconciled", () => {
    mockedUseVerificationState.mockReturnValue({
      ...state("APPROVED"),
      isFetching: true,
    } as ReturnType<typeof useVerificationState>);
    render(<VerificationGate verificationPath="/verify"><button>إرسال</button></VerificationGate>);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "إرسال" })).not.toBeInTheDocument();
  });

  it("blocks on a query error and retries only when requested", () => {
    mockedUseVerificationState.mockReturnValue({ isLoading: false, isError: true, data: undefined, refetch } as ReturnType<typeof useVerificationState>);
    render(<VerificationGate verificationPath="/verify"><button>إرسال</button></VerificationGate>);
    expect(screen.getByRole("alert")).toHaveTextContent("تعذّر تحميل حالة توثيق الهوية");
    screen.getByRole("button", { name: "إعادة المحاولة" }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["NOT_SUBMITTED", "ابدأ توثيق الهوية", "/verify"],
    ["PENDING", "عرض حالة التوثيق", "/landlord/verify"],
    ["RESUBMISSION_REQUIRED", "إرسال مستندات جديدة", "/verify"],
  ] as const)("blocks %s and uses the supplied verification route", (status, label, href) => {
    mockedUseVerificationState.mockReturnValue(state(status) as ReturnType<typeof useVerificationState>);
    render(<VerificationGate verificationPath={href}><button>إرسال</button></VerificationGate>);
    expect(screen.queryByRole("button", { name: "إرسال" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
  });

  it("renders protected children only after approval", () => {
    mockedUseVerificationState.mockReturnValue(state("APPROVED") as ReturnType<typeof useVerificationState>);
    render(<VerificationGate verificationPath="/verify"><button>إرسال</button></VerificationGate>);
    expect(screen.getByRole("button", { name: "إرسال" })).toBeInTheDocument();
  });

  it("blocks a rejected verification and shows its safe reason without resubmission", () => {
    mockedUseVerificationState.mockReturnValue(state("REJECTED") as ReturnType<typeof useVerificationState>);
    render(<VerificationGate verificationPath="/verify"><button>إرسال</button></VerificationGate>);
    expect(screen.getByText("الصورة غير واضحة")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "إرسال مستندات جديدة" })).not.toBeInTheDocument();
  });
});
