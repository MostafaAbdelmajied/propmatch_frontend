import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { SOCKET_EVENTS } from "@/src/lib/api/contracts/notification";
import { ACCESS_TOKEN_COOKIE } from "@/src/lib/api/cookies";
import { findUserByToken } from "./db";
import { setMockEventListener, type MockEvent } from "./events";

/**
 * PRO-06 realtime gateway — the mock stand-in for the NestJS Socket.io gateway.
 *
 * ## Why the handshake authenticates by cookie
 *
 * The access token is httpOnly and deliberately never reaches client JS
 * (`cookies.ts`), so the browser *cannot* pass it as `auth: { token }` the way
 * Socket.io examples usually do. Instead the client connects with
 * `withCredentials: true` and the browser attaches the cookie itself. Cookies
 * ignore ports, so a cookie set on localhost:3000 is sent to the mock gateway
 * on localhost:3001 — no token ever touches JS.
 *
 * The real NestJS gateway must therefore read the JWT from the handshake
 * cookie too (or the team must issue short-lived socket tickets from the BFF).
 * See ASSUMPTIONS.md #28 — this is the one contract the backend must match.
 *
 * ## Rooms
 * - `user:<id>` — that user's own NOTIFICATIONs.
 * - `admins`    — moderation-queue arrivals.
 *
 * Delivery only. Every event is already persisted, so a client that was
 * offline catches up on its next GET; the socket never carries state the REST
 * API can't also produce.
 */

function cookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

let io: Server | null = null;

export function attachMockSocket(httpServer: HttpServer) {
  if (io) return io;

  io = new Server(httpServer, {
    path: "/socket.io",
    // The app origin differs from the gateway origin (3000 vs 3001), so the
    // handshake is cross-origin and must be allowed to carry the cookie.
    cors: {
      origin: (origin, cb) => cb(null, origin ?? true),
      credentials: true,
    },
  });

  // Authenticate on connect: no valid session → no socket. An unauthenticated
  // client must never be able to sit in a room and receive another user's PII.
  io.use((socket: Socket, next) => {
    const token = cookieValue(socket.handshake.headers.cookie, ACCESS_TOKEN_COOKIE);
    const user = findUserByToken(token ? `Bearer ${token}` : null);
    if (!user) return next(new Error("UNAUTHORIZED"));
    socket.data.userId = user.id;
    socket.data.role = user.role;
    next();
  });

  io.on("connection", (socket: Socket) => {
    socket.join(`user:${socket.data.userId}`);
    if (socket.data.role === "admin") socket.join("admins");
  });

  setMockEventListener((event: MockEvent) => {
    if (!io) return;
    if (event.kind === "notification") {
      // Room-scoped: a NOTIFICATION only ever reaches its own recipient.
      io.to(`user:${event.userId}`).emit(SOCKET_EVENTS.notification, event.payload);
    } else {
      io.to("admins").emit(SOCKET_EVENTS.adminQueueItem, event.payload);
    }
  });

  return io;
}
