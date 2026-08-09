import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "../LoginForm";
import { useLogin, useRequestReactivation } from "../../hooks/useSession";

jest.mock("../../hooks/useSession", () => ({
  useLogin: jest.fn(),
  useRequestReactivation: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/src/components/ui/Toast", () => ({ useToast: () => jest.fn() }));

const mockedLogin = jest.mocked(useLogin);
const mockedRequestReactivation = jest.mocked(useRequestReactivation);

function makeApiClientError(statusCode: number, message: string, body: unknown) {
  const err = new Error(message) as Error & { name: string; statusCode: number; body: unknown };
  err.name = "ApiClientError";
  err.statusCode = statusCode;
  err.body = body;
  return err;
}

function renderForm() {
  return render(<LoginForm />);
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("البريد الإلكتروني"), "user@example.com");
  await user.type(screen.getByLabelText("كلمة المرور"), "Password123!");
  await user.click(screen.getByRole("button", { name: "تسجيل الدخول" }));
}

describe("LoginForm — account-state error handling", () => {
  const requestReactivationMutate = jest.fn();

  beforeEach(() => {
    mockedLogin.mockReset();
    mockedRequestReactivation.mockReset();
    requestReactivationMutate.mockReset();
    mockedRequestReactivation.mockReturnValue({
      mutate: requestReactivationMutate,
      isPending: false,
      isSuccess: false,
    } as unknown as ReturnType<typeof useRequestReactivation>);
  });

  it("shows the reactivation button for ACCOUNT_DELETED, not the suspension notice", async () => {
    mockedLogin.mockReturnValue({
      mutateAsync: jest
        .fn()
        .mockRejectedValue(
          makeApiClientError(403, "هذا الحساب مجدول للحذف. يمكنك طلب إعادة التفعيل.", {
            statusCode: 403,
            code: "ACCOUNT_DELETED",
          }),
        ),
    } as unknown as ReturnType<typeof useLogin>);
    renderForm();

    await fillAndSubmit();

    await waitFor(() => expect(screen.getByText("هذا الحساب مجدول للحذف")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "طلب إعادة التفعيل" })).toBeInTheDocument();
    expect(screen.queryByText("حسابك موقوف مؤقتًا")).not.toBeInTheDocument();
  });

  it("calls requestReactivation with the submitted credentials when the account is deleted", async () => {
    mockedLogin.mockReturnValue({
      mutateAsync: jest
        .fn()
        .mockRejectedValue(
          makeApiClientError(403, "deleted", { statusCode: 403, code: "ACCOUNT_DELETED" }),
        ),
    } as unknown as ReturnType<typeof useLogin>);
    renderForm();
    await fillAndSubmit();
    await waitFor(() => screen.getByRole("button", { name: "طلب إعادة التفعيل" }));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "طلب إعادة التفعيل" }));

    expect(requestReactivationMutate).toHaveBeenCalledWith(
      { email: "user@example.com", password: "Password123!" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("shows a suspension notice (not the reactivation button) for ACCOUNT_SUSPENDED, and never calls requestReactivation", async () => {
    mockedLogin.mockReturnValue({
      mutateAsync: jest
        .fn()
        .mockRejectedValue(
          makeApiClientError(403, "تم إيقاف حسابك حتى 2026-08-20. السبب: احتيال أو نصب.", {
            statusCode: 403,
            code: "ACCOUNT_SUSPENDED",
          }),
        ),
    } as unknown as ReturnType<typeof useLogin>);
    renderForm();

    await fillAndSubmit();

    await waitFor(() => expect(screen.getByText("حسابك موقوف مؤقتًا")).toBeInTheDocument());
    expect(
      screen.getByText("تم إيقاف حسابك حتى 2026-08-20. السبب: احتيال أو نصب."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "طلب إعادة التفعيل" })).not.toBeInTheDocument();
    expect(requestReactivationMutate).not.toHaveBeenCalled();
  });

  it("falls back to the generic error message for a plain 401 (wrong password)", async () => {
    mockedLogin.mockReturnValue({
      mutateAsync: jest
        .fn()
        .mockRejectedValue(makeApiClientError(401, "البريد الإلكتروني أو كلمة المرور غير صحيحة", null)),
    } as unknown as ReturnType<typeof useLogin>);
    renderForm();

    await fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByText("البريد الإلكتروني أو كلمة المرور غير صحيحة")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: "طلب إعادة التفعيل" })).not.toBeInTheDocument();
    expect(screen.queryByText("حسابك موقوف مؤقتًا")).not.toBeInTheDocument();
  });
});
