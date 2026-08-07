import { fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider } from "@/src/components/ui/Toast";
import { AdminUsersTable } from "../AdminUsersTable";
import { useAdminUsers, useDeleteUser, useAdminSession } from "../../hooks/useTeam";

jest.mock("../../hooks/useTeam", () => ({
  useAdminUsers: jest.fn(),
  useDeleteUser: jest.fn(),
  useAdminSession: jest.fn(),
}));

const getUsers = useAdminUsers as jest.MockedFunction<typeof useAdminUsers>;
const deleteUserHook = useDeleteUser as jest.MockedFunction<typeof useDeleteUser>;
const getSession = useAdminSession as jest.MockedFunction<typeof useAdminSession>;

const users = [
  { id: "user-1", fullName: "مستأجر تجريبي", email: "tenant@test.local", role: "TENANT" as const, isActive: true, createdAt: "2026-07-01T00:00:00.000Z" },
  { id: "user-2", fullName: "مالك تجريبي", email: "landlord@test.local", role: "LANDLORD" as const, isActive: true, createdAt: "2026-07-02T00:00:00.000Z" },
];

function renderTable() {
  return render(
    <ToastProvider>
      <AdminUsersTable />
    </ToastProvider>,
  );
}

describe("AdminUsersTable", () => {
  const mutate = jest.fn();

  beforeEach(() => {
    getUsers.mockReset();
    deleteUserHook.mockReset();
    getSession.mockReset();
    mutate.mockReset();
    getUsers.mockReturnValue({
      data: { items: users },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useAdminUsers>);
    deleteUserHook.mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useDeleteUser>);
    getSession.mockReturnValue({
      data: { id: "admin-1", fullName: "Admin", role: "super-admin", roleName: "SUPER_ADMIN", capabilities: ["user:delete"] },
    } as unknown as ReturnType<typeof useAdminSession>);
  });

  it("blocks the whole section for an admin without user:delete", () => {
    getSession.mockReturnValue({
      data: { id: "admin-2", fullName: "Admin", role: "read-only", roleName: "READ_ONLY", capabilities: [] },
    } as unknown as ReturnType<typeof useAdminSession>);
    renderTable();

    expect(screen.getByText("لا تملك صلاحية حذف المستخدمين")).toBeInTheDocument();
    expect(screen.queryByText("مستأجر تجريبي")).not.toBeInTheDocument();
  });

  it("lists every user with their role and status", () => {
    renderTable();

    expect(screen.getByText("مستأجر تجريبي")).toBeInTheDocument();
    expect(screen.getByText("مالك تجريبي")).toBeInTheDocument();
    expect(screen.getAllByText("نشط")).toHaveLength(2);
  });

  it("opens a confirm dialog before deleting, and does not mutate on cancel", () => {
    renderTable();

    fireEvent.click(screen.getAllByTitle("حذف المستخدم")[0]);
    expect(screen.getByText(/هل أنت متأكد من حذف حساب/)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "إلغاء" }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it("calls the delete mutation only after confirming", () => {
    renderTable();

    fireEvent.click(screen.getAllByTitle("حذف المستخدم")[0]);
    fireEvent.click(screen.getByRole("button", { name: "حذف" }));

    expect(mutate).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });
});
