import { api } from "@/src/lib/api/browserClient";
import type { PaymentUpdatedPayload } from "@/src/lib/socket/useRealtime";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PAYMENT_SUCCESS_MESSAGE, PaymentSheet } from "../PaymentSheet";

const mockToast = jest.fn();
let mockPaymentListener: ((payment: PaymentUpdatedPayload) => void) | undefined;

jest.mock("@/src/components/ui/Toast", () => ({
  useToast: () => mockToast,
}));

jest.mock("@/src/features/landlord/hooks/useLandlord", () => ({
  useQuota: () => ({ data: { planType: "FREE" } }),
}));

jest.mock("../useCommercialCatalog", () => ({
  useCommercialCatalog: () => ({ data: undefined }),
}));

jest.mock("@/src/lib/socket/useRealtime", () => ({
  subscribeToPaymentUpdates: (listener: (payment: PaymentUpdatedPayload) => void) => {
    mockPaymentListener = listener;
    return jest.fn();
  },
}));

jest.mock("@/src/lib/api/browserClient", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  isApiClientError: jest.fn(() => false),
}));

describe("PaymentSheet successful checkout", () => {
  beforeEach(() => {
    mockToast.mockReset();
    mockPaymentListener = undefined;
    jest.mocked(api.post).mockResolvedValue({
      providerOrderId: "order-123",
      checkoutUrl: "https://checkout.example.test/pay",
      amount: 39,
      currency: "EGP",
      paymentType: "AI_USES_10_90D",
    });

    const popup = {
      closed: false,
      close: jest.fn(),
      document: { write: jest.fn() },
      location: { href: "about:blank" },
    };
    jest.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows one success message for duplicate provider confirmations", async () => {
    const onActivated = jest.fn();
    render(
      <PaymentSheet
        open
        onClose={jest.fn()}
        paymentType="AI_USES_10_90D"
        onActivated={onActivated}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /التالي: اختر طريقة الدفع/ }));
    fireEvent.click(screen.getByRole("button", { name: /تأكيد ودفع/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockPaymentListener).toBeDefined());

    const payment: PaymentUpdatedPayload = {
      providerOrderId: "order-123",
      status: "SUCCESS",
      providerTransactionId: "transaction-123",
      paidAt: new Date().toISOString(),
    };
    act(() => {
      mockPaymentListener?.(payment);
      mockPaymentListener?.(payment);
    });

    expect(await screen.findByText("تم الدفع بنجاح")).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith("success", PAYMENT_SUCCESS_MESSAGE);
    expect(onActivated).toHaveBeenCalledTimes(1);
  });
});
