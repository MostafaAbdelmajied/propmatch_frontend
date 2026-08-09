import { api, authApi, downloadProtectedPdf, isApiClientError, streamPost } from "../browserClient";
import { reconnectSocket } from "@/src/lib/socket/socketClient";
import { TextDecoderStream as NodeTextDecoderStream } from "node:stream/web";

jest.mock("@/src/lib/socket/socketClient", () => ({
  reconnectSocket: jest.fn(),
}));

const mockedReconnectSocket = jest.mocked(reconnectSocket);
const fetchMock = jest.fn();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("browser API token refresh", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    mockedReconnectSocket.mockReset();
    global.fetch = fetchMock;
    Object.defineProperty(globalThis, "TextDecoderStream", {
      configurable: true,
      value: NodeTextDecoderStream,
    });
  });

  it("refreshes after a 401 and retries the original request once", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(json({ user: { id: "user-1" } }))
      .mockResolvedValueOnce(json({ items: ["property-1"] }));

    await expect(api.get<{ items: string[] }>("properties/mine")).resolves.toEqual({
      items: ["property-1"],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/backend/properties/mine",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/refresh",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/backend/properties/mine",
      expect.objectContaining({ method: "GET" }),
    );
    expect(mockedReconnectSocket).toHaveBeenCalledTimes(1);
  });

  it("does not retry indefinitely when refresh fails", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(json({ message: "Invalid refresh token" }, 401));

    const error = await api.get("properties/mine").catch((caught: unknown) => caught);

    expect(isApiClientError(error)).toBe(true);
    expect(error).toMatchObject({ statusCode: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockedReconnectSocket).not.toHaveBeenCalled();
  });

  it("shares one refresh across concurrent 401 responses", async () => {
    let refreshed = false;
    let refreshCalls = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/auth/refresh") {
        refreshCalls += 1;
        await Promise.resolve();
        refreshed = true;
        return json({ user: { id: "user-1" } });
      }
      return refreshed ? json({ ok: true }) : json({ message: "Unauthorized" }, 401);
    });

    await expect(Promise.all([api.get("notifications"), api.get("messages")])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);

    expect(refreshCalls).toBe(1);
    expect(mockedReconnectSocket).toHaveBeenCalledTimes(1);
  });

  it("never tries to refresh a failed auth mutation", async () => {
    fetchMock.mockResolvedValue(json({ message: "Invalid credentials" }, 401));

    await expect(authApi.login({ email: "x@example.com", password: "bad" })).rejects.toMatchObject({
      statusCode: 401,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes and retries protected PDF downloads", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(json({ user: { id: "user-1" } }))
      .mockResolvedValueOnce(
        new Response("pdf-content", {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="lease.pdf"',
          },
        }),
      );

    const result = await downloadProtectedPdf("lease-contracts/contract-1/pdf");

    expect(result.filename).toBe("lease.pdf");
    expect(await result.blob.text()).toBe("pdf-content");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("refreshes before consuming and retrying an SSE stream", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(json({ user: { id: "user-1" } }))
      .mockResolvedValueOnce(
        new Response(
          'data: {"type":"token","value":"hello"}\n\ndata: {"type":"done","id":"answer-1"}\n\n',
          { headers: { "Content-Type": "text/event-stream" } },
        ),
      );
    const onToken = jest.fn();

    await expect(streamPost("support/stream", {}, { onToken })).resolves.toEqual({
      type: "done",
      id: "answer-1",
    });
    expect(onToken).toHaveBeenCalledWith("hello");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
