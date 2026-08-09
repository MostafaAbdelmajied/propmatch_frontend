import { fireEvent, render, screen, within } from "@testing-library/react";
import { AdminActivity } from "../AdminActivity";
import { useAuditLog, useLoginHistory } from "../../hooks/useTeam";

jest.mock("../../hooks/useTeam", () => ({
  useAuditLog: jest.fn(),
  useLoginHistory: jest.fn(),
}));

const getAuditLog = useAuditLog as jest.MockedFunction<typeof useAuditLog>;
const getLoginHistory = useLoginHistory as jest.MockedFunction<typeof useLoginHistory>;

describe("AdminActivity", () => {
  beforeEach(() => {
    getAuditLog.mockImplementation(
      (query) =>
        ({
          data: {
            items: [
              {
                id: `audit-${query?.page ?? 1}`,
                actorName: "Admin User",
                action: `audit-page-${query?.page ?? 1}`,
                subjectId: "user-1",
                at: "2026-08-10T12:00:00.000Z",
              },
            ],
            total: 45,
            page: query?.page ?? 1,
            pageSize: 20,
          },
          isLoading: false,
          isFetching: false,
          isError: false,
          refetch: jest.fn(),
        }) as unknown as ReturnType<typeof useAuditLog>,
    );
    getLoginHistory.mockImplementation(
      (query) =>
        ({
          data: {
            items: [
              {
                id: `login-${query?.page ?? 1}`,
                adminName: "Admin User",
                ip: "127.0.0.1",
                at: "2026-08-10T12:00:00.000Z",
                success: true,
              },
            ],
            total: 25,
            page: query?.page ?? 1,
            pageSize: 20,
          },
          isLoading: false,
          isFetching: false,
          isError: false,
          refetch: jest.fn(),
        }) as unknown as ReturnType<typeof useLoginHistory>,
    );
  });

  it("requests independent server pages for audit entries and login history", () => {
    render(<AdminActivity />);

    const auditSection = screen.getByRole("heading", { name: "سجل الإجراءات" }).closest("section");
    const loginSection = screen.getByRole("heading", { name: "سجل الدخول" }).closest("section");
    expect(auditSection).not.toBeNull();
    expect(loginSection).not.toBeNull();

    fireEvent.click(within(auditSection!).getByRole("button", { name: "التالي" }));
    expect(getAuditLog).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 });
    expect(getLoginHistory).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 });
    expect(within(auditSection!).getByText("صفحة 2 من 3")).toBeInTheDocument();

    fireEvent.click(within(loginSection!).getByRole("button", { name: "التالي" }));
    expect(getLoginHistory).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 });
    expect(within(loginSection!).getByText("صفحة 2 من 2")).toBeInTheDocument();
  });
});
