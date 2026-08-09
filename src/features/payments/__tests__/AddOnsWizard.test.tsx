import { fireEvent, render, screen } from "@testing-library/react";
import { AddOnsWizard } from "../AddOnsWizard";
import { useMyProperties } from "@/src/features/landlord/hooks/useLandlord";

const mockToast = jest.fn();

jest.mock("@/src/components/ui/Toast", () => ({
  useToast: () => mockToast,
}));

jest.mock("@/src/features/landlord/hooks/useLandlord", () => ({
  useMyProperties: jest.fn(),
}));

jest.mock("../useCommercialCatalog", () => ({
  useCommercialCatalog: () => ({ data: undefined }),
}));

const paymentSheetProps: unknown[] = [];
jest.mock("../PaymentSheet", () => ({
  PaymentSheet: (props: unknown) => {
    paymentSheetProps.push(props);
    return <div data-testid="payment-sheet" />;
  },
}));

const mockedUseMyProperties = jest.mocked(useMyProperties);

function renderWizard(onClose = jest.fn()) {
  return render(<AddOnsWizard open onClose={onClose} />);
}

describe("AddOnsWizard", () => {
  beforeEach(() => {
    mockToast.mockReset();
    paymentSheetProps.length = 0;
    mockedUseMyProperties.mockReturnValue({
      data: {
        items: [
          { id: "prop-1", title: "شقة المعادي", status: "APPROVED" },
          { id: "prop-2", title: "شقة مسودة", status: "PENDING" },
        ],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useMyProperties>);
  });

  it("lists all 6 add-on SKUs", () => {
    renderWizard();

    expect(screen.getByText("عقار نشط إضافي")).toBeInTheDocument();
    expect(screen.getByText("10 عروض مطابقة")).toBeInTheDocument();
    expect(screen.getByText("Boost — 7 أيام")).toBeInTheDocument();
    expect(screen.getByText("Boost — 14 يومًا")).toBeInTheDocument();
    expect(screen.getByText("Boost — 30 يومًا")).toBeInTheDocument();
    expect(screen.getByText("10 استخدامات ذكاء اصطناعي")).toBeInTheDocument();
  });

  it("disables the purchase button until a SKU is selected", () => {
    renderWizard();

    expect(screen.getByRole("button", { name: "اختر إضافة للمتابعة" })).toBeDisabled();
    expect(screen.queryByTestId("payment-sheet")).not.toBeInTheDocument();
  });

  it("opens PaymentSheet with the selected non-boost SKU, no property required", () => {
    renderWizard();

    fireEvent.click(screen.getByText("عقار نشط إضافي"));
    fireEvent.click(screen.getByRole("button", { name: /شراء عقار نشط إضافي/ }));

    expect(screen.getByTestId("payment-sheet")).toBeInTheDocument();
    expect(paymentSheetProps[0]).toEqual(
      expect.objectContaining({
        paymentType: "EXTRA_LISTING_60D",
        propertyId: undefined,
        initialStep: 2,
      }),
    );
  });

  it("requires a property before purchasing a Boost SKU, and only offers APPROVED properties", () => {
    renderWizard();

    fireEvent.click(screen.getByText("Boost — 7 أيام"));
    expect(screen.getByText("اختر العقار المراد ترقيته")).toBeInTheDocument();
    expect(screen.getByText("شقة المعادي")).toBeInTheDocument();
    expect(screen.queryByText("شقة مسودة")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: /شراء Boost/ })).toBeDisabled();
    expect(screen.queryByTestId("payment-sheet")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "prop-1" } });
    fireEvent.click(screen.getByRole("button", { name: /شراء Boost/ }));

    expect(screen.getByTestId("payment-sheet")).toBeInTheDocument();
    expect(paymentSheetProps[0]).toEqual(
      expect.objectContaining({
        paymentType: "BOOST_7D",
        propertyId: "prop-1",
        initialStep: 2,
      }),
    );
  });
});
