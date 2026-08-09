"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SOCKET_EVENTS } from "@/src/lib/api/contracts/notification";
import type {
  AccountSuspendedPayload,
  Notification,
  NotificationsResponse,
  RealtimeSupportMessage,
  RealtimeSupportTicket,
  RealtimeReactivationRequest,
} from "@/src/lib/api/contracts/notification";
import { useSuspensionStore } from "@/src/lib/store/useSuspensionStore";
import { useToast } from "@/src/components/ui/Toast";
import { authApi } from "@/src/lib/api/browserClient";
import type { AdminQueuesResponse, QueueItem } from "@/src/lib/api/contracts/admin";
import type { MatchMessage, RealtimeMatchMessage } from "@/src/lib/api/contracts/message";
import type { PaymentStatus } from "@/src/lib/api/contracts/payment";
import { getSocket, reconnectSocket } from "./socketClient";

export { reconnectSocket } from "./socketClient";

let sharedAudioCtx: AudioContext | null = null;

// Keep the socket payload-to-cache mapping explicit. Socket events are
// runtime data, so an older backend or a malformed event must not be able to
// turn an unknown type into a property such as `undefinedQueue`.
const adminQueueKeyByType: Record<QueueItem["type"], keyof AdminQueuesResponse> = {
  kyc: "kycQueue",
  property: "propertyQueue",
  propertyEdit: "editedPropertyQueue",
  request: "requestQueue",
  review: "reviewQueue",
};

/** Ensure AudioContext is instantiated and unlocked after first user interaction */
function initAndUnlockAudio(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

export interface PaymentUpdatedPayload {
  providerOrderId: string;
  status: Extract<PaymentStatus, "SUCCESS" | "FAILED">;
  providerTransactionId: string | null;
  paidAt: string | null;
}

export function subscribeToPaymentUpdates(
  listener: (payment: PaymentUpdatedPayload) => void,
): () => void {
  const currentSocket = getSocket();
  if (!currentSocket) return () => {};
  currentSocket.on(SOCKET_EVENTS.paymentUpdated, listener);
  return () => {
    currentSocket.off(SOCKET_EVENTS.paymentUpdated, listener);
  };
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
  const router = useRouter();
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
      else if (n.type === "NEW_OFFER_RECEIVED" || n.type === "NEW_MATCH") {
        // Offer updates and accepted offers both change data owned by the
        // other participant. Refetch only the affected inboxes and the match
        // list; React Query only requests active observers, so this remains
        // event-driven rather than becoming background polling.
        void qc.invalidateQueries({ queryKey: ["tenant", "offers"] });
        void qc.invalidateQueries({ queryKey: ["landlord", "offers"] });
        void qc.invalidateQueries({ queryKey: ["tenant", "listing-offers"] });
        void qc.invalidateQueries({ queryKey: ["landlord", "listing-offers"] });
        void qc.invalidateQueries({ queryKey: ["matches"] });
        toast("info", n.message);
      }
    };

    const onQueueItem = (item: QueueItem) => {
      qc.setQueryData<AdminQueuesResponse>(["admin", "queues"], (prev) => {
        if (!prev) return prev;
        const key = adminQueueKeyByType[item.type];
        // Be defensive at the boundary: the server payload may come from a
        // newer/older deployment than this frontend and contain an unknown
        // queue type. Ignore it and let the normal query refresh reconcile
        // the authoritative queue data instead of crashing the event handler.
        if (!key) return prev;
        const existing = prev[key];
        if (!Array.isArray(existing)) return { ...prev, [key]: [item] };
        if (existing.some((q) => q.id === item.id)) return prev;
        return { ...prev, [key]: [item, ...existing] };
      });
      playNotificationChime();
    };

    const onMessage = (message: RealtimeMatchMessage) => {
      qc.setQueryData<MatchMessage[]>(
        ["matches", message.matchConnectionId, "messages"],
        (prev) => {
          if (!prev || prev.some((item) => item.id === message.id)) return prev;
          return [
            ...prev,
            {
              id: message.id,
              senderId: message.senderId,
              body: message.body,
              createdAt: message.createdAt,
              editedAt: message.editedAt,
              attachmentUrl: message.attachmentUrl,
              attachmentType: message.attachmentType,
              attachmentName: message.attachmentName,
              attachmentDurationMs: message.attachmentDurationMs,
              isMine: false,
            },
          ];
        },
      );
      // The socket is deliberately a delivery signal, while HTTP remains the
      // source of truth. This also fills any fields a newer backend may add.
      void qc.invalidateQueries({
        queryKey: ["matches", message.matchConnectionId, "messages"],
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

    const onSupportTicketCreated = (payload: RealtimeSupportTicket) => {
      toast("info", `تذكرة دعم جديدة من ${payload.userName}: ${payload.subject}`);
      qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
      playNotificationChime();
    };

    // Active invalidation: an admin just soft-deleted this exact session's
    // account. Passive invalidation (401 on next request) would leave an
    // already-open tab working until it happens to hit the network again —
    // this drops it immediately instead. authApi.logout() clears the httpOnly
    // cookie server-side (the socket payload can't do that itself); the qc
    // reset + redirect mirror useLogout()'s onSuccess. Distinct from
    // onAccountSuspended below — a delete is a "ghost" account with its own
    // reactivation flow, a suspension is a temporary/permanent block with its
    // own end date/reason, surfaced via the blocking SuspensionModal instead.
    const onForceLogout = () => {
      toast("error", "تم حذف حسابك من قبل أحد المشرفين");
      void authApi.logout().finally(() => {
        qc.setQueryData(["session"], null);
        qc.clear();
        reconnectSocket();
        router.push("/login");
      });
    };

    // Dedicated alert for a new reactivation request — separate from the
    // generic admin:queue:item stream because no queue widget renders
    // type:'reactivation' yet; this toasts immediately and refetches both
    // the admin reactivations table AND the notification bell (the backend
    // also persists a REACTIVATION_REQUEST row per admin, so the bell's own
    // GET /notifications has it — this just makes the badge update live
    // instead of waiting for the bell's own poll/next open).
    const onReactivationRequested = (payload: RealtimeReactivationRequest) => {
      toast("info", `طلب إعادة تفعيل حساب جديد من ${payload.userEmail}`);
      qc.invalidateQueries({ queryKey: ["admin", "reactivations"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      playNotificationChime();
    };

    // Admin suspended this account → surface a blocking modal (RealtimeProvider)
    // and log the user out. This is what makes suspension feel real-time.
    const onAccountSuspended = (payload: AccountSuspendedPayload) => {
      useSuspensionStore.getState().setSuspension(payload);
      playNotificationChime();
    };

    const onPaymentUpdated = (payment: PaymentUpdatedPayload) => {
      if (payment.status === "SUCCESS") {
        void qc.invalidateQueries({ queryKey: ["quota"] });
      }
    };

    s.on(SOCKET_EVENTS.notification, onNotification);
    s.on(SOCKET_EVENTS.adminQueueItem, onQueueItem);
    s.on(SOCKET_EVENTS.message, onMessage);
    s.on(SOCKET_EVENTS.messageEdited, onMessageEdited);
    s.on(SOCKET_EVENTS.messageDeleted, onMessageDeleted);
    s.on(SOCKET_EVENTS.supportMessageReceived, onSupportMessage);
    s.on(SOCKET_EVENTS.supportTicketCreated, onSupportTicketCreated);
    s.on(SOCKET_EVENTS.forceLogout, onForceLogout);
    s.on(SOCKET_EVENTS.newReactivationRequest, onReactivationRequested);
    s.on(SOCKET_EVENTS.accountSuspended, onAccountSuspended);
    s.on(SOCKET_EVENTS.paymentUpdated, onPaymentUpdated);
    return () => {
      s.off(SOCKET_EVENTS.notification, onNotification);
      s.off(SOCKET_EVENTS.adminQueueItem, onQueueItem);
      s.off(SOCKET_EVENTS.message, onMessage);
      s.off(SOCKET_EVENTS.messageEdited, onMessageEdited);
      s.off(SOCKET_EVENTS.messageDeleted, onMessageDeleted);
      s.off(SOCKET_EVENTS.supportMessageReceived, onSupportMessage);
      s.off(SOCKET_EVENTS.supportTicketCreated, onSupportTicketCreated);
      s.off(SOCKET_EVENTS.forceLogout, onForceLogout);
      s.off(SOCKET_EVENTS.newReactivationRequest, onReactivationRequested);
      s.off(SOCKET_EVENTS.accountSuspended, onAccountSuspended);
      s.off(SOCKET_EVENTS.paymentUpdated, onPaymentUpdated);
    };
  }, [qc, toast, router]);

  return { connected };
}
