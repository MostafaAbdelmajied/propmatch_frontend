import { NextRequest } from "next/server";
import { backendFetch, BackendApiError } from "@/src/lib/api/client";
import { proxy } from "./proxy";

jest.mock("@/src/lib/api/client", () => {
  const actual = jest.requireActual("@/src/lib/api/client");
  return { ...actual, backendFetch: jest.fn() };
});

const mockedBackendFetch = jest.mocked(backendFetch);
const backendUser = {
  id: "user-1",
  fullName: "Sarah Ahmed",
  email: "sara@example.com",
  phoneNumber: "01012345678",
  role: "tenant",
  isActive: true,
  lastLoginAt: null,
  createdAt: "2026-07-20T10:22:39.215Z",
  updatedAt: "2026-07-20T10:22:39.215Z",
  verificationStatus: "NOT_SUBMITTED",
};

function token(exp: number): string {
  return `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`;
}

function request(path: string, cookies: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: { cookie: cookies },
  });
}

describe("protected route proxy refresh", () => {
  beforeEach(() => mockedBackendFetch.mockReset());

  it("allows protected navigation with an unexpired access token", async () => {
    const response = await proxy(
      request("/profile", `propmatch_access_token=${token(Math.floor(Date.now() / 1000) + 60)}`),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(mockedBackendFetch).not.toHaveBeenCalled();
  });

  it("refreshes an expired session and reloads the same protected URL", async () => {
    mockedBackendFetch.mockResolvedValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      user: backendUser,
    });

    const response = await proxy(
      request(
        "/tenant/offers?tab=received",
        `propmatch_access_token=${token(1)}; propmatch_refresh_token=old-refresh-token`,
      ),
    );

    expect(mockedBackendFetch).toHaveBeenCalledWith("/auth/refresh", {
      method: "POST",
      body: { refreshToken: "old-refresh-token" },
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/tenant/offers?tab=received");
    const cookies = response.headers.get("set-cookie") ?? "";
    expect(cookies).toContain("propmatch_access_token=new-access-token");
    expect(cookies).toContain("propmatch_refresh_token=new-refresh-token");
  });

  it("redirects to login when no refresh token exists", async () => {
    const response = await proxy(request("/profile?section=security", ""));

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?redirectTo=%2Fprofile%3Fsection%3Dsecurity",
    );
    expect(mockedBackendFetch).not.toHaveBeenCalled();
  });

  it("clears cookies and redirects when refresh is rejected", async () => {
    mockedBackendFetch.mockRejectedValue(new BackendApiError(401, "Invalid refresh token"));

    const response = await proxy(
      request("/profile", "propmatch_refresh_token=invalid-refresh-token"),
    );

    expect(response.headers.get("location")).toBe("http://localhost/login?redirectTo=%2Fprofile");
    const cookies = response.headers.get("set-cookie") ?? "";
    expect(cookies).toContain("propmatch_access_token=");
    expect(cookies).toContain("propmatch_refresh_token=");
  });
});
