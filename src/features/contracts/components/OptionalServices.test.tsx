import { fireEvent, render, screen } from "@testing-library/react";
import { OptionalServices } from "./OptionalServices";

const mutate = jest.fn();
const toast = jest.fn();
jest.mock("@/src/components/ui/Toast", () => ({ useToast: () => toast }));
jest.mock("../hooks/usePartnerLead", () => ({
  useCreatePartnerLead: () => ({ mutate, isPending: false }),
}));

describe("OptionalServices", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(["tenant", "landlord"] as const)("shows both optional services for %s", (role) => {
    render(<OptionalServices role={role} />);
    expect(screen.getByText("مساعدة في نقل الأثاث")).toBeTruthy();
    expect(screen.getByText("تأمين الإيجار")).toBeTruthy();
  });

  it("does not render consumer actions for an admin", () => {
    render(<OptionalServices role="admin" />);
    expect(screen.queryByText("طلب مساعدة في النقل")).toBeNull();
  });

  it("opens a moving consent dialog with unchecked, disabled submit", () => {
    render(<OptionalServices role="tenant" />);
    fireEvent.click(screen.getByRole("button", { name: "طلب مساعدة في النقل" }));
    expect(screen.getByRole("dialog", { name: "تأكيد طلب مساعدة النقل" })).toBeTruthy();
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    expect(
      (screen.getByRole("button", { name: "إرسال طلب النقل" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("opens the insurance consent dialog", () => {
    render(<OptionalServices role="landlord" />);
    fireEvent.click(screen.getByRole("button", { name: "طلب معلومات عن التأمين" }));
    expect(screen.getByRole("dialog", { name: "تأكيد طلب معلومات التأمين" })).toBeTruthy();
  });

  it("submits exactly the moving consent payload and leaves insurance available", () => {
    render(<OptionalServices role="tenant" />);
    fireEvent.click(screen.getByRole("button", { name: "طلب مساعدة في النقل" }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "إرسال طلب النقل" }));
    expect(mutate).toHaveBeenCalledWith(
      { serviceType: "MOVING", consent: true },
      expect.any(Object),
    );
    expect(
      (screen.getByRole("button", { name: "طلب معلومات عن التأمين" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
