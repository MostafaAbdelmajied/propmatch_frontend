import { fireEvent, render, screen, within } from "@testing-library/react";
import { ToastProvider } from "@/src/components/ui/Toast";
import { AdminUserReview } from "../AdminUserReview";
import { useKycReview, useReviewKyc } from "../../hooks/useAdmin";

jest.mock("../../hooks/useAdmin", () => ({
  useKycReview: jest.fn(),
  useReviewKyc: jest.fn(),
}));

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const getKycReview = useKycReview as jest.MockedFunction<typeof useKycReview>;
const reviewKyc = useReviewKyc as jest.MockedFunction<typeof useReviewKyc>;

const kycDetails = {
  userId: "user-1",
  userName: "Test User",
  nationalId: null,
  nationalIdFrontUrl: "http://localhost:3001/api/storage/private/11111111-1111-4111-8111-111111111111",
  nationalIdBackUrl: "https://api.example.com/api/storage/private/22222222-2222-4222-8222-222222222222",
  selfieUrl: "https://api.example.com/api/storage/private/33333333-3333-4333-8333-333333333333",
  submittedAt: "2026-07-20T12:00:00.000Z",
};

const labels = [
  "صورة البطاقة — الوجه الأمامي",
  "صورة البطاقة — الوجه الخلفي",
  "الصورة الشخصية",
] as const;

function renderReview() {
  return render(
    <ToastProvider>
      <AdminUserReview userId="user-1" />
    </ToastProvider>,
  );
}

function imageSection(label: string) {
  return screen.getByAltText(label).closest("figure") as HTMLElement;
}

describe("AdminUserReview", () => {
  const mutate = jest.fn();

  beforeEach(() => {
    getKycReview.mockReset();
    reviewKyc.mockReset();
    mutate.mockReset();
    getKycReview.mockReturnValue({ data: kycDetails, isLoading: false } as ReturnType<typeof useKycReview>);
    reviewKyc.mockReturnValue({ mutate, isPending: false } as ReturnType<typeof useReviewKyc>);
  });

  it("renders the existing loading fallback while KYC details load", () => {
    getKycReview.mockReturnValue({ data: undefined, isLoading: true } as ReturnType<typeof useKycReview>);
    const { container } = renderReview();

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders KYC details, nullable National ID, and three protected document images", () => {
    renderReview();

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("null")).not.toBeInTheDocument();
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();

    labels.forEach((label) => expect(screen.getAllByText(label).length).toBeGreaterThan(0));
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(3);
    expect(images[0]).toHaveAttribute("src", kycDetails.nationalIdFrontUrl);
    expect(images[1]).toHaveAttribute("src", kycDetails.nationalIdBackUrl);
    expect(images[2]).toHaveAttribute("src", kycDetails.selfieUrl);

    images.forEach((image, index) => {
      expect(image).toHaveAttribute("alt", labels[index]);
      expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
      expect(image).toHaveClass("object-contain");
    });
  });

  it("keeps every document placeholder independent until its own image loads", () => {
    renderReview();
    const [front, back, selfie] = labels.map(imageSection);
    const frontImage = within(front).getByRole("img");
    const backImage = within(back).getByRole("img");
    const selfieImage = within(selfie).getByRole("img");

    [front, back, selfie].forEach((section) => {
      expect(within(section).getByText("جارٍ تحميل الصورة")).toBeInTheDocument();
    });

    fireEvent.load(frontImage);
    expect(within(front).queryByText("جارٍ تحميل الصورة")).not.toBeInTheDocument();
    expect(within(back).getByText("جارٍ تحميل الصورة")).toBeInTheDocument();
    expect(within(selfie).getByText("جارٍ تحميل الصورة")).toBeInTheDocument();

    fireEvent.load(backImage);
    expect(within(back).queryByText("جارٍ تحميل الصورة")).not.toBeInTheDocument();
    expect(within(selfie).getByText("جارٍ تحميل الصورة")).toBeInTheDocument();

    fireEvent.load(selfieImage);
    expect(within(selfie).queryByText("جارٍ تحميل الصورة")).not.toBeInTheDocument();
  });

  it.each([
    ["صورة البطاقة — الوجه الأمامي", ["صورة البطاقة — الوجه الخلفي", "الصورة الشخصية"]],
    ["صورة البطاقة — الوجه الخلفي", ["صورة البطاقة — الوجه الأمامي", "الصورة الشخصية"]],
    ["الصورة الشخصية", ["صورة البطاقة — الوجه الأمامي", "صورة البطاقة — الوجه الخلفي"]],
  ] as const)("keeps the other images visible when %s fails", (failedLabel, visibleLabels) => {
    renderReview();
    const failedSection = imageSection(failedLabel);
    fireEvent.error(within(failedSection).getByRole("img"));

    expect(within(failedSection).getByText("تعذر تحميل الصورة")).toBeInTheDocument();
    expect(within(failedSection).queryByRole("img")).not.toBeInTheDocument();
    visibleLabels.forEach((label) => expect(screen.getByAltText(label)).toBeInTheDocument());
  });

  it("uses the existing safe loading fallback for a failed detail request without exposing error internals", () => {
    getKycReview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("backend detail failure"),
    } as ReturnType<typeof useKycReview>);
    const { container } = renderReview();

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("backend detail failure")).not.toBeInTheDocument();
  });

  it("submits the component's approve payload through the review mutation", () => {
    renderReview();

    fireEvent.click(screen.getByRole("button", { name: "موافقة" }));

    expect(mutate).toHaveBeenCalledWith(
      { decision: { decision: "approve", reason: undefined } },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("requires a reject reason before submitting and submits a valid reason", () => {
    renderReview();
    const reason = screen.getByLabelText(/سبب الرفض/);
    expect(reason).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "رفض" }));
    expect(mutate).not.toHaveBeenCalled();

    fireEvent.change(reason, { target: { value: "سبب" } });
    fireEvent.click(screen.getByRole("button", { name: "رفض" }));

    expect(mutate).toHaveBeenCalledWith(
      { decision: { decision: "reject", reason: "سبب" } },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });
});
