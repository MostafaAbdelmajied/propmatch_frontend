import { fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider } from "@/src/components/ui/Toast";
import { AdminUsersTable } from "../AdminUsersTable";
import {
  useAdminUsers,
  useDeleteUser,
  useAdminSession,
  useSuspendUser,
  useUnsuspendUser,
} from "../../hooks/useTeam";

jest.mock("../../hooks/useTeam", () => ({
  useAdminUsers: jest.fn(),
  useDeleteUser: jest.fn(),
  useAdminSession: jest.fn(),
  useSuspendUser: jest.fn(),
  useUnsuspendUser: jest.fn(),
}));

const getUsers = useAdminUsers as jest.MockedFunction<typeof useAdminUsers>;
const deleteUserHook = useDeleteUser as jest.MockedFunction<typeof useDeleteUser>;
const getSession = useAdminSession as jest.MockedFunction<typeof useAdminSession>;
const suspendUserHook = useSuspendUser as jest.MockedFunction<typeof useSuspendUser>;
const unsuspendUserHook = useUnsuspendUser as jest.MockedFunction<typeof useUnsuspendUser>;

const users = [
  {
    id: "user-1",
    fullName: "مستأجر تجريبي",
    email: "tenant@test.local",
    role: "TENANT" as const,
    isActive: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    deletedAt: null,
    suspended: false,
    suspendedUntil: null,
    suspensionReasonLabel: null,
  },
  {
    id: "user-2",
    fullName: "مالك تجريبي",
    email: "landlord@test.local",
    role: "LANDLORD" as const,
    isActive: true,
    createdAt: "2026-07-02T00:00:00.000Z",
    deletedAt: null,
    suspended: false,
    suspendedUntil: null,
    suspensionReasonLabel: null,
  },
];

const suspendedUsers = [
  {
    id: "user-4",
    fullName: "مستخدم موقوف",
    email: "suspended@test.local",
    role: "TENANT" as const,
    isActive: true,
    createdAt: "2026-06-15T00:00:00.000Z",
    deletedAt: null,
    suspended: true,
    suspendedUntil: "2026-08-01T00:00:00.000Z",
    suspensionReasonLabel: "احتيال أو نصب",
  },
];

const deletedUsers = [
  {
    id: "user-3",
    fullName: "مستخدم محذوف",
    email: "deleted@test.local",
    role: "TENANT" as const,
    isActive: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    deletedAt: "2026-07-10T00:00:00.000Z",
    suspended: false,
    suspendedUntil: null,
    suspensionReasonLabel: null,
  },
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
  const suspendMutate = jest.fn();
  const unsuspendMutate = jest.fn();

  beforeEach(() => {
    getUsers.mockReset();
    deleteUserHook.mockReset();
    getSession.mockReset();
    suspendUserHook.mockReset();
    unsuspendUserHook.mockReset();
    mutate.mockReset();
    suspendMutate.mockReset();
    unsuspendMutate.mockReset();
    getUsers.mockReturnValue({
      data: { items: users, total: 2, page: 1, pageSize: 20 },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useAdminUsers>);
    deleteUserHook.mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useDeleteUser>);
    suspendUserHook.mockReturnValue({
      mutate: suspendMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useSuspendUser>);
    unsuspendUserHook.mockReturnValue({
      mutate: unsuspendMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUnsuspendUser>);
    getSession.mockReturnValue({
      data: {
        id: "admin-1",
        fullName: "Admin",
        role: "super-admin",
        roleName: "SUPER_ADMIN",
        capabilities: ["user:delete", "user:suspend"],
      },
    } as unknown as ReturnType<typeof useAdminSession>);
  });

  it("blocks the whole section for an admin with neither user:suspend nor user:delete", () => {
    getSession.mockReturnValue({
      data: { id: "admin-2", fullName: "Admin", role: "read-only", roleName: "READ_ONLY", capabilities: [] },
    } as unknown as ReturnType<typeof useAdminSession>);
    renderTable();

    expect(screen.getByText("لا تملك صلاحية إدارة المستخدمين")).toBeInTheDocument();
    expect(screen.queryByText("مستأجر تجريبي")).not.toBeInTheDocument();
  });

  it("lists every user with their role and status", () => {
    renderTable();

    expect(screen.getByText("مستأجر تجريبي")).toBeInTheDocument();
    expect(screen.getByText("مالك تجريبي")).toBeInTheDocument();
    expect(screen.getAllByText("نشط")).toHaveLength(2);
  });

  it("only shows the delete action when missing user:suspend", () => {
    getSession.mockReturnValue({
      data: {
        id: "admin-3",
        fullName: "Admin",
        role: "listings-manager",
        roleName: "LISTINGS_MANAGER",
        capabilities: ["user:delete"],
      },
    } as unknown as ReturnType<typeof useAdminSession>);
    renderTable();

    expect(screen.getAllByTitle("حذف المستخدم")).toHaveLength(2);
    expect(screen.queryByTitle("إيقاف المستخدم")).not.toBeInTheDocument();
  });

  it("only shows the suspend action when missing user:delete", () => {
    getSession.mockReturnValue({
      data: {
        id: "admin-4",
        fullName: "Admin",
        role: "listings-manager",
        roleName: "LISTINGS_MANAGER",
        capabilities: ["user:suspend"],
      },
    } as unknown as ReturnType<typeof useAdminSession>);
    renderTable();

    expect(screen.getAllByTitle("إيقاف المستخدم")).toHaveLength(2);
    expect(screen.queryByTitle("حذف المستخدم")).not.toBeInTheDocument();
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

  it("opens the suspend modal and submits with the selected reason/duration", () => {
    renderTable();

    fireEvent.click(screen.getAllByTitle("إيقاف المستخدم")[0]);
    expect(screen.getByText("إيقاف حساب")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "تأكيد الإيقاف" }));

    expect(suspendMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1", reason: "SPAM" }),
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("switches to the deleted tab and shows the deletedAt column, with no row actions", () => {
    getUsers.mockImplementation((query) =>
      ({
        data: {
          items: query?.status === "deleted" ? deletedUsers : users,
          total: query?.status === "deleted" ? 1 : 2,
          page: 1,
          pageSize: 20,
        },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      }) as unknown as ReturnType<typeof useAdminUsers>,
    );
    renderTable();

    expect(screen.getByText("مستأجر تجريبي")).toBeInTheDocument();
    expect(screen.queryByText("مستخدم محذوف")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "معلّق / محذوف" }));

    expect(screen.getByText("مستخدم محذوف")).toBeInTheDocument();
    expect(screen.queryByText("مستأجر تجريبي")).not.toBeInTheDocument();
    expect(screen.getByText("تاريخ الحذف")).toBeInTheDocument();
    // No delete/suspend actions for an already-deleted account.
    expect(screen.queryByTitle("حذف المستخدم")).not.toBeInTheDocument();
    expect(screen.queryByTitle("إيقاف المستخدم")).not.toBeInTheDocument();
  });

  it("switches to the suspended tab, filters client-side, and shows suspension columns", () => {
    getUsers.mockImplementation(
      () =>
        ({
          data: { items: [...users, ...suspendedUsers], total: 3, page: 1, pageSize: 20 },
          isLoading: false,
          isError: false,
          refetch: jest.fn(),
        }) as unknown as ReturnType<typeof useAdminUsers>,
    );
    renderTable();

    fireEvent.click(screen.getByRole("tab", { name: "موقوف" }));

    expect(screen.getByText("مستخدم موقوف")).toBeInTheDocument();
    expect(screen.queryByText("مستأجر تجريبي")).not.toBeInTheDocument();
    expect(screen.getByText("ينتهي الإيقاف")).toBeInTheDocument();
    expect(screen.getByText("احتيال أو نصب")).toBeInTheDocument();
    // A suspended user gets an "unsuspend" action instead of "suspend".
    expect(screen.getByTitle("إلغاء إيقاف المستخدم")).toBeInTheDocument();
  });

  it("calls the unsuspend mutation directly (no confirm dialog)", () => {
    getUsers.mockImplementation(
      () =>
        ({
          data: { items: suspendedUsers, total: 1, page: 1, pageSize: 20 },
          isLoading: false,
          isError: false,
          refetch: jest.fn(),
        }) as unknown as ReturnType<typeof useAdminUsers>,
    );
    renderTable();

    fireEvent.click(screen.getByRole("tab", { name: "موقوف" }));
    fireEvent.click(screen.getByTitle("إلغاء إيقاف المستخدم"));

    expect(unsuspendMutate).toHaveBeenCalledWith(
      "user-4",
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });
});
