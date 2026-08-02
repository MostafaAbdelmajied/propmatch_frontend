import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KycWizard } from "../KycWizard";
import { validateVerificationFile } from "../../hooks/useKyc";
import { getMyVerification, submitVerification } from "@/src/lib/api/verification";
import type { VerificationResponse } from "@/src/lib/api/contracts/verification";

jest.mock("@/src/lib/api/verification", () => ({
  getMyVerification: jest.fn(),
  submitVerification: jest.fn(),
}));
jest.mock("@/src/features/auth/hooks/useSession", () => ({ useSession: () => ({ data: { role: "tenant" } }) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const getVerification = getMyVerification as jest.MockedFunction<typeof getMyVerification>;
const submit = submitVerification as jest.MockedFunction<typeof submitVerification>;

const response = (status: VerificationResponse["status"]): VerificationResponse => ({
  status,
  rejectionReason: status === "REJECTED" || status === "RESUBMISSION_REQUIRED" ? "صورة غير واضحة" : null,
  submittedAt: status === "NOT_SUBMITTED" ? null : "2026-07-20T12:00:00.000Z",
  reviewedAt: null,
  canSubmit: status === "NOT_SUBMITTED" || status === "RESUBMISSION_REQUIRED",
});

function renderWizard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><KycWizard /></QueryClientProvider>);
}

describe("KycWizard", () => {
  beforeEach(() => {
    getVerification.mockReset();
    submit.mockReset();
  });

  it("waits for GET before showing a wizard and retries a failed load", async () => {
    getVerification.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response("NOT_SUBMITTED"));
    renderWizard();
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(0);
    expect(await screen.findByText("تعذر تحميل حالة التحقق. حاول مرة أخرى.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /إعادة المحاولة/i }));
    expect(await screen.findByText("إرسال للمراجعة")).toBeInTheDocument();
  });

  it.each([
    ["PENDING", "طلب التوثيق قيد المراجعة"],
    ["APPROVED", "تم توثيق هويتك بنجاح"],
    ["REJECTED", "تم رفض طلب التوثيق"],
  ] as const)("renders the backend %s state without an upload form", async (status, title) => {
    getVerification.mockResolvedValue(response(status));
    renderWizard();
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(0);
  });

  it("allows a fresh RESUBMISSION_REQUIRED submission with exact file mapping and optional ID", async () => {
    getVerification.mockResolvedValue(response("RESUBMISSION_REQUIRED"));
    submit.mockResolvedValue(response("PENDING"));
    const { container } = renderWizard();
    expect(await screen.findByText("مطلوب إعادة تقديم المستندات")).toBeInTheDocument();
    expect(screen.getByText(/سبب طلب إعادة التقديم/)).toBeInTheDocument();

    const [front, back, selfie] = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'));
    fireEvent.change(front, { target: { files: [new File(["front"], "front.jpg", { type: "image/jpeg" })] } });
    fireEvent.change(back, { target: { files: [new File(["back"], "back.png", { type: "image/png" })] } });
    fireEvent.change(selfie, { target: { files: [new File(["selfie"], "selfie.webp", { type: "image/webp" })] } });
    fireEvent.click(screen.getByRole("button", { name: "إعادة تقديم المستندات" }));

    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      nationalId: undefined,
      nationalIdFront: expect.any(File),
      nationalIdBack: expect.any(File),
      selfie: expect.any(File),
    })));
    expect(await screen.findByText("طلب التوثيق قيد المراجعة")).toBeInTheDocument();
  });

  it("blocks invalid files and reconciles a 409 with the backend", async () => {
    getVerification.mockResolvedValueOnce(response("NOT_SUBMITTED")).mockResolvedValueOnce(response("PENDING"));
    submit.mockRejectedValue(Object.assign(new Error("طلب التحقق قيد المراجعة بالفعل."), { name: "ApiClientError", statusCode: 409 }));
    const { container } = renderWizard();
    await screen.findByText("إرسال للمراجعة");
    const [front, back, selfie] = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'));
    expect(validateVerificationFile({ type: "image/gif", size: 1 } as File)).toBe("الملف يجب أن يكون بصيغة JPEG أو PNG أو WebP.");
    fireEvent.click(screen.getByRole("button", { name: "إرسال للمراجعة" }));
    expect(submit).not.toHaveBeenCalled();

    fireEvent.change(front, { target: { files: [new File(["front"], "front.jpg", { type: "image/jpeg" })] } });
    fireEvent.change(back, { target: { files: [new File(["back"], "back.jpg", { type: "image/jpeg" })] } });
    fireEvent.change(selfie, { target: { files: [new File(["selfie"], "selfie.jpg", { type: "image/jpeg" })] } });
    fireEvent.click(screen.getByRole("button", { name: "إرسال للمراجعة" }));
    expect(await screen.findByText("طلب التوثيق قيد المراجعة")).toBeInTheDocument();
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
