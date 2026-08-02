import type { Notification } from "@/src/lib/api/contracts/notification";
import type { QueueItem } from "@/src/lib/api/contracts/admin";

/**
 * Decoupling seam for PRO-06 realtime.
 *
 * `db.ts` and `router.ts` are framework-agnostic — Jest imports them with no
 * socket server anywhere. So they *emit* here rather than importing Socket.io;
 * `standalone.ts` registers the broadcaster when it boots. With no listener
 * registered (i.e. under Jest) emitting is a no-op.
 */

export type MockEvent =
  | { kind: "notification"; userId: string; payload: Notification }
  | { kind: "adminQueueItem"; payload: QueueItem };

type Listener = (event: MockEvent) => void;

let listener: Listener | null = null;

export function setMockEventListener(fn: Listener | null) {
  listener = fn;
}

export function emitMockEvent(event: MockEvent) {
  listener?.(event);
}
