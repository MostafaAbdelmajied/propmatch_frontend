import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SuspensionModal } from "../SuspensionModal";

const mockReplace = jest.fn();
const mockSetSuspension = jest.fn();
const mockSuspension = {
  message: "تم إيقاف الحساب لمخالفة شروط الاستخدام.",
  reason: "POLICY_VIOLATION",
  suspendedUntil: "2026-08-20T00:00:00.000Z",
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/src/lib/store/useSuspensionStore", () => ({
  useSuspensionStore: (selector: (state: unknown) => unknown) =>
    selector({ suspension: mockSuspension, setSuspension: mockSetSuspension }),
}));

describe("SuspensionModal", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSetSuspension.mockReset();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  it("takes the suspended user to the customer-support appeal flow", async () => {
    const user = userEvent.setup();
    render(<SuspensionModal />);

    await user.click(screen.getByRole("button", { name: "التواصل مع خدمة العملاء" }));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/login?suspensionAppeal=1"),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockSetSuspension).toHaveBeenCalledWith(null);
  });
});
