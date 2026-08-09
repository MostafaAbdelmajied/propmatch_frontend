import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddPropertyWizard } from "../AddPropertyWizard";

const mockCreateMutate = jest.fn();
const mockOptimizeRun = jest.fn();
const mockToast = jest.fn();
const mockRouterPush = jest.fn();
const mockQuotaRefetch = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock("@/src/components/ui/Toast", () => ({
  useToast: () => mockToast,
}));

jest.mock("@/src/features/ekyc/components/VerificationGate", () => ({
  VerificationGate: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/src/features/payments/PaymentSheet", () => ({
  PaymentSheet: () => null,
}));

jest.mock("@/src/features/admin/hooks/useRegions", () => ({
  useActiveRegions: () => ({ data: [], isLoading: false }),
}));

jest.mock("../../hooks/useLandlord", () => ({
  useCreateProperty: () => ({ mutate: mockCreateMutate, isPending: false }),
  useQuota: () => ({
    data: {
      optimizerUsesLeft: 5,
      maxActiveListings: 3,
      activeUnitCount: 0,
    },
    refetch: mockQuotaRefetch,
  }),
  useStreamOptimizeDescription: () => ({
    run: mockOptimizeRun,
    isStreaming: false,
  }),
}));

const draftValues = {
  governorate: "الدقهلية",
  city: "المنصورة",
  district: "حي الجامعة",
  manualAddress: "شارع الجمهورية",
  title: "شقة مميزة للإيجار",
  propertyType: "APARTMENT",
  rentAmount: 5000,
  areaM2: 120,
  bedrooms: 3,
  bathrooms: 2,
  isFurnished: false,
  hasElevator: true,
  hasParking: true,
  description: "وصف تفصيلي مناسب للعقار المعروض للإيجار في موقع مميز.",
  propertyAroundServices: "جامعة، مواصلات، صيدلية",
};

function restoreMediaStep() {
  window.localStorage.setItem(
    "propmatch:add-property-draft",
    JSON.stringify({ step: 1, values: draftValues, optimizerUsesLeft: 5 }),
  );
}

async function reachReviewStep({ waitUntilArmed = true } = {}) {
  restoreMediaStep();
  const user = userEvent.setup();
  const view = render(<AddPropertyWizard />);
  const imageInput = await waitFor(() => {
    const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    return input!;
  });
  const image = new File(["image"], "property.jpg", { type: "image/jpeg" });
  await user.upload(imageInput, image);
  await user.click(screen.getByRole("button", { name: "التالي" }));
  const reviewButton = await screen.findByRole("button", { name: "إرسال للمراجعة" });
  if (waitUntilArmed) await waitFor(() => expect(reviewButton).toBeEnabled());
  return { ...view, image, user };
}

describe("AddPropertyWizard submission intent", () => {
  beforeAll(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:property.jpg"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: jest.fn(),
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
    mockCreateMutate.mockReset();
    mockOptimizeRun.mockReset();
    mockToast.mockReset();
    mockRouterPush.mockReset();
    mockQuotaRefetch.mockReset();
    mockOptimizeRun.mockImplementation(async (_description, _context, onToken) => {
      onToken("وصف محسّن للعقار دون إرسال الإعلان إلى المراجعة.");
    });
  });

  it("optimizes the description without creating a property", async () => {
    const { user } = await reachReviewStep();

    await user.click(
      screen.getByRole("button", { name: "تحسين الوصف بالذكاء الاصطناعي" }),
    );

    await waitFor(() => expect(mockOptimizeRun).toHaveBeenCalledTimes(1));
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it("ignores native or implicit form submission", async () => {
    const { container } = await reachReviewStep();
    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    fireEvent.submit(form!);

    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it("blocks a carry-over click immediately after advancing to the review step", async () => {
    await reachReviewStep({ waitUntilArmed: false });
    const reviewButton = screen.getByRole("button", { name: "إرسال للمراجعة" });

    expect(reviewButton).toBeDisabled();
    fireEvent.click(reviewButton);
    expect(mockCreateMutate).not.toHaveBeenCalled();

    await waitFor(() => expect(reviewButton).toBeEnabled());
  });

  it("keeps review submission disabled until optimization finishes", async () => {
    let finishOptimization: (() => void) | undefined;
    mockOptimizeRun.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishOptimization = resolve;
        }),
    );
    const { user } = await reachReviewStep();

    await user.click(
      screen.getByRole("button", { name: "تحسين الوصف بالذكاء الاصطناعي" }),
    );

    expect(
      screen.getByRole("button", { name: "جارٍ تحسين الوصف..." }),
    ).toBeDisabled();
    expect(mockCreateMutate).not.toHaveBeenCalled();

    finishOptimization?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "إرسال للمراجعة" })).toBeEnabled(),
    );
  });

  it("asks for confirmation and creates only after the user confirms", async () => {
    const { image, user } = await reachReviewStep();

    await user.click(screen.getByRole("button", { name: "إرسال للمراجعة" }));

    expect(
      screen.getByRole("dialog", { name: "إرسال العقار للمراجعة" }),
    ).toBeInTheDocument();
    expect(mockCreateMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "نعم، إرسال للمراجعة" }));

    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalledTimes(1));
    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: draftValues.title,
        images: [image],
      }),
      expect.any(Object),
    );
  });

  it("returns to editing when the confirmation is cancelled", async () => {
    const { user } = await reachReviewStep();

    await user.click(screen.getByRole("button", { name: "إرسال للمراجعة" }));
    await user.click(screen.getByRole("button", { name: "العودة للتعديل" }));

    expect(
      screen.queryByRole("dialog", { name: "إرسال العقار للمراجعة" }),
    ).not.toBeInTheDocument();
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });
});
