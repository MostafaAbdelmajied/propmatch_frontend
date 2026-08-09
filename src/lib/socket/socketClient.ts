"use client";

import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

let socket: Socket | null = null;

/** Return the tab-wide Socket.IO connection, creating it on first use. */
export function getSocket(): Socket | null {
  if (!SOCKET_URL || typeof window === "undefined") return null;
  socket ??= io(SOCKET_URL, {
    withCredentials: true,
    // Keep retrying: the singleton may first connect before the auth cookie
    // exists (e.g. a deep link -> login -> back), and must recover afterwards.
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

/** Re-run the socket handshake after the session cookie changes. */
export function reconnectSocket(): void {
  const currentSocket = getSocket();
  if (!currentSocket) return;
  currentSocket.disconnect();
  currentSocket.connect();
}
