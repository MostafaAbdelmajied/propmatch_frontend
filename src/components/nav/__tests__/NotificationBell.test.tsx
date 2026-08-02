import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationBell } from "../NotificationBell";
import { NotificationTypeSchema, type Notification } from "@/src/lib/api/contracts/notification";

/**
 * The bell shipped reading `n.kind`/`n.at`, which the API never sends — the
 * icon lookup returned undefined and React threw "Element type is invalid".
 * Since the bell lives in the nav, that took down every page for any user who
 * had a notification. These tests pin it to the real ERD contract.
 */

jest.mock("@/src/lib/socket/RealtimeProvider", () => ({
  usePollWhileOffline: () => false as const,
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
const originalNotificationsEnabled = process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED;
jest.mock("@/src/lib/api/browserClient", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "ntf_1",
    title: "تم قبول عرضك",
    message: "قبل المستأجر عرضك.",
    link: null,
    type: "NEW_MATCH",
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderBell() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NotificationBell />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED = "true";
  mockGet.mockReset();
  mockPost.mockReset().mockResolvedValue({ ok: true });
});

afterEach(() => {
  if (originalNotificationsEnabled === undefined) {
    delete process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED = originalNotificationsEnabled;
  }
});

describe("NotificationBell", () => {
  it("does not poll or show an unread count when real-backend notifications are disabled", async () => {
    process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED = "false";
    renderBell();
    await userEvent.click(screen.getByRole("button", { name: "الإشعارات" }));
    expect(mockGet).not.toHaveBeenCalled();
    expect(screen.queryByText(/غير مقروء/)).not.toBeInTheDocument();
    expect(screen.getByText("لا توجد إشعارات جديدة")).toBeInTheDocument();
  });

  it("renders every NOTIFICATION.type in the ERD enum without crashing", async () => {
    // The regression: one unmapped type = an undefined icon = a thrown render.
    const items = NotificationTypeSchema.options.map((type, i) =>
      makeNotification({ id: `ntf_${i}`, type, title: `إشعار ${type}` }),
    );
    mockGet.mockResolvedValue({ items, unread: items.length });

    renderBell();
    await userEvent.click(await screen.findByRole("button", { name: /الإشعارات/ }));

    for (const type of NotificationTypeSchema.options) {
      expect(screen.getByText(`إشعار ${type}`)).toBeInTheDocument();
    }
  });

  it("shows the unread count from the server", async () => {
    mockGet.mockResolvedValue({ items: [makeNotification()], unread: 3 });
    renderBell();
    expect(await screen.findByRole("button", { name: /3 غير مقروء/ })).toBeInTheDocument();
  });

  it("renders the empty state without an unread badge", async () => {
    mockGet.mockResolvedValue({ items: [], unread: 0 });
    renderBell();
    await userEvent.click(await screen.findByRole("button", { name: "الإشعارات" }));
    expect(screen.getByText("لا توجد إشعارات جديدة")).toBeInTheDocument();
  });

  it("marks all read on the server, not just locally", async () => {
    // The old build flipped local state, so the badge returned on refetch.
    mockGet.mockResolvedValue({ items: [makeNotification()], unread: 1 });
    renderBell();
    await userEvent.click(await screen.findByRole("button", { name: /الإشعارات/ }));
    await userEvent.click(screen.getByText("تعليم الكل كمقروء"));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("notifications/read-all"));
  });

  it("marks a single notification read when opened", async () => {
    mockGet.mockResolvedValue({ items: [makeNotification({ id: "ntf_9" })], unread: 1 });
    renderBell();
    await userEvent.click(await screen.findByRole("button", { name: /الإشعارات/ }));
    await userEvent.click(screen.getByText("تم قبول عرضك"));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("notifications/ntf_9/read"));
  });

  it("follows a notification's deep link", async () => {
    mockGet.mockResolvedValue({
      items: [makeNotification({ link: "/tenant/offers" })],
      unread: 1,
    });
    renderBell();
    await userEvent.click(await screen.findByRole("button", { name: /الإشعارات/ }));

    expect(screen.getByRole("link", { name: /تم قبول عرضك/ })).toHaveAttribute("href", "/tenant/offers");
  });
});
