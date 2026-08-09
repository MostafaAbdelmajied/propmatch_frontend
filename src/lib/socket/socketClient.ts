"use client";

import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

let socket: Socket | null = null;

async function getSocketTicket(): Promise<string | undefined> {
  try {
    const response = await fetch("/api/auth/socket-ticket", { method: "POST", cache: "no-store" });
    if (!response.ok) return undefined;
    const body = (await response.json()) as { token?: unknown };
    return typeof body.token === "string" ? body.token : undefined;
  } catch {
    return undefined;
  }
}

/** Return the tab-wide Socket.IO connection, creating it on first use. */
export function getSocket(): Socket | null {
  if (!SOCKET_URL || typeof window === "undefined") return null;
  socket ??= io(SOCKET_URL, {
    withCredentials: true,
    autoConnect: false,
    auth: (callback) => {
      void getSocketTicket().then((token) => callback(token ? { token } : {}));
    },
    // Keep retrying: the singleton may first connect before the auth cookie
    // exists (e.g. a deep link -> login -> back), and must recover afterwards.
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  if (!socket.connected) socket.connect();
  return socket;
}

/** Re-run the socket handshake after the session cookie changes. */
export function reconnectSocket(): void {
  const currentSocket = getSocket();
  if (!currentSocket) return;
  currentSocket.disconnect();
  currentSocket.connect();
}
