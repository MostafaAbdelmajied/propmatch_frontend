"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@/src/lib/api/contracts/notification";
import type { AccountSuspendedPayload, Notification, NotificationsResponse, RealtimeSupportMessage } from "@/src/lib/api/contracts/notification";
import { useSuspensionStore } from "@/src/lib/store/useSuspensionStore";
import { useToast } from "@/src/components/ui/Toast";
import type { AdminQueuesResponse, QueueItem } from "@/src/lib/api/contracts/admin";
import type { MatchMessage, RealtimeMatchMessage } from "@/src/lib/api/contracts/message";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

let socket: Socket | null = null;
let sharedAudioCtx: AudioContext | null = null;

/** Ensure AudioContext is instantiated and unlocked after first user interaction */
function initAndUnlockAudio(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    sharedAudioCtx ??= new AudioCtx();
    if (sharedAudioCtx.state === "suspended") {
      void sharedAudioCtx.resume();
    }
  } catch {
    // Ignore audio initialization errors
  }
}

/** Plays a dual-tone notification chime across all browsers */
function playNotificationChime(): void {
  if (typeof window === "undefined") return;
  try {
    initAndUnlockAudio();
    if (!sharedAudioCtx) return;

    const ctx = sharedAudioCtx;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Pleasant high-pitch bell sound (D5 to A5 to D6)
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.04);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn("Notification chime error:", e);
  }
}

/** One shared connection per tab, regardless of how many components subscribe. */
function getSocket(): Socket | null {
  if (!SOCKET_URL || typeof window === "undefined") return null;
  socket ??= io(SOCKET_URL, {
    withCredentials: true,
    // Keep retrying: the singleton may first connect before the auth cookie
    // exists (e.g. a deep link → login → back), and must recover afterwards
    // instead of giving up permanently.
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

/**
 * Force the shared socket to re-run its handshake so it authenticates with the
 * CURRENT auth cookie. Call this after login/logout: the singleton may have
 * connected anonymously (e.g. on the /login page before the cookie existed) or
 * as a previous account, and must re-auth as the new user. Reuses the same
 * socket instance, so all `.on(...)` listeners stay bound.
 */
export function reconnectSocket(): void {
  const s = getSocket();
  if (!s) return;
  s.disconnect();
  s.connect();
}

function subscribeToStatus(onChange: () => void): () => void {
  const s = getSocket();
  if (!s) return () => {};
  s.on("connect", onChange);
  s.on("disconnect", onChange);
  s.on("connect_error", onChange);
  return () => {
    s.off("connect", onChange);
    s.off("disconnect", onChange);
    s.off("connect_error", onChange);
  };
}

const getStatus = () => getSocket()?.connected ?? false;
const getServerStatus = () => false;

export interface RealtimeState {
  connected: boolean;
}

export function useRealtime(): RealtimeState {
  const qc = useQueryClient();
  const toast = useToast();
  const connected = useSyncExternalStore(subscribeToStatus, getStatus, getServerStatus);

  // Attach global user interaction listeners to unlock Web Audio API on first click/keypress
  useEffect(() => {
    const handleUserInteraction = () => {
      initAndUnlockAudio();
    };

    window.addEventListener("pointerdown", handleUserInteraction, { passive: true });
    window.addEventListener("keydown", handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const onNotification = (n: Notification) => {
      qc.setQueryData<NotificationsResponse>(["notifications"], (prev) => {
        if (!prev) return { items: [n], unread: 1 };
        if (prev.items.some((x) => x.id === n.id)) return prev;
        return { items: [n, ...prev.items].slice(0, 20), unread: prev.unread + 1 };
      });
      playNotificationChime();

      // Contract review events double as a live toast, since either party is
      // often on another screen when a draft changes state.
      if (n.type === "NEW_REVIEW_SUBMITTED") toast("info", n.message);
      else if (n.type === "REVIEW_APPROVED") toast("success", n.message);
    };

    const onQueueItem = (item: QueueItem) => {
      qc.setQueryData<AdminQueuesResponse>(["admin", "queues"], (prev) => {
        if (!prev) return prev;
        const key: keyof AdminQueuesResponse =
          item.type === "propertyEdit" ? "editedPropertyQueue" : `${item.type}Queue`;
        const existing = prev[key];
        if (existing.some((q) => q.id === item.id)) return prev;
        return { ...prev, [key]: [item, ...existing] };
      });
      playNotificationChime();
    };

    const onMessage = (message: RealtimeMatchMessage) => {
      qc.setQueryData<MatchMessage[]>(["matches", message.matchConnectionId, "messages"], (prev) => {
        if (!prev || prev.some((item) => item.id === message.id)) return prev;
        return [
          ...prev,
          {
            id: message.id,
            senderId: message.senderId,
            body: message.body,
            createdAt: message.createdAt,
            isMine: false,
          },
        ];
      });
      qc.invalidateQueries({ queryKey: ["matches"] });
      playNotificationChime();
    };

    const onMessageEdited = (payload: { id: string; matchConnectionId: string; body: string; editedAt?: string | null }) => {
      qc.setQueryData<MatchMessage[]>(["matches", payload.matchConnectionId, "messages"], (prev) =>
        prev?.map((item) =>
          item.id === payload.id ? { ...item, body: payload.body, editedAt: payload.editedAt ?? new Date().toISOString() } : item,
        ) ?? prev,
      );
      qc.invalidateQueries({ queryKey: ["matches"] });
    };

    const onMessageDeleted = (payload: { id: string; matchConnectionId: string }) => {
      qc.setQueryData<MatchMessage[]>(["matches", payload.matchConnectionId, "messages"], (prev) =>
        prev?.filter((item) => item.id !== payload.id) ?? prev,
      );
      qc.invalidateQueries({ queryKey: ["matches"] });
    };

    // Live support-ticket chat. The payload lacks the full message shape, so we
    // invalidate the affected ticket + list queries and let react-query refetch
    // the authoritative TicketDetail. Both the customer and the assigned agent
    // caches are refreshed (only the one this session owns is actually present).
    const onSupportMessage = (payload: RealtimeSupportMessage) => {
      qc.invalidateQueries({ queryKey: ["user", "support", "ticket", payload.ticketId] });
      qc.invalidateQueries({ queryKey: ["user", "support", "tickets"] });
      qc.invalidateQueries({ queryKey: ["admin", "ticket", payload.ticketId] });
      qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
      playNotificationChime();
    };

    // Admin suspended this account → surface a blocking modal (RealtimeProvider)
    // and log the user out. This is what makes suspension feel real-time.
    const onAccountSuspended = (payload: AccountSuspendedPayload) => {
      useSuspensionStore.getState().setSuspension(payload);
      playNotificationChime();
    };

    s.on(SOCKET_EVENTS.notification, onNotification);
    s.on(SOCKET_EVENTS.adminQueueItem, onQueueItem);
    s.on(SOCKET_EVENTS.message, onMessage);
    s.on(SOCKET_EVENTS.messageEdited, onMessageEdited);
    s.on(SOCKET_EVENTS.messageDeleted, onMessageDeleted);
    s.on(SOCKET_EVENTS.supportMessageReceived, onSupportMessage);
    s.on(SOCKET_EVENTS.accountSuspended, onAccountSuspended);
    return () => {
      s.off(SOCKET_EVENTS.notification, onNotification);
      s.off(SOCKET_EVENTS.adminQueueItem, onQueueItem);
      s.off(SOCKET_EVENTS.message, onMessage);
      s.off(SOCKET_EVENTS.messageEdited, onMessageEdited);
      s.off(SOCKET_EVENTS.messageDeleted, onMessageDeleted);
      s.off(SOCKET_EVENTS.supportMessageReceived, onSupportMessage);
      s.off(SOCKET_EVENTS.accountSuspended, onAccountSuspended);
    };
  }, [qc, toast]);

  return { connected };
}
