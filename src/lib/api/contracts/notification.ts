import { z } from "zod";

/**
 * Mirrors the ERD's `NOTIFICATION`. Delivered in real time over Socket.io
 * (PRO-06): live admin queue slide-ins + user notification bell/toasts.
 * The bell must switch on `type`, never on free text (requirements.md §6).
 */

/** ERD enum — verbatim. */
export const NotificationTypeSchema = z.enum([
  "EKYC_APPROVED",
  "EKYC_RESUBMISSION_REQUIRED",
  "PROPERTY_APPROVED",
  "PROPERTY_REJECTED",
  "NEW_MATCH",
  "PAYMENT_SUCCESS",
  "NEW_REVIEW_SUBMITTED",
  "REVIEW_APPROVED",
  "REVIEW_REJECTED",
  "NEW_TENANT_REQUEST",
  "TENANT_REQUEST_APPROVED",
  "TENANT_REQUEST_REJECTED",
  "NEW_OFFER_RECEIVED",
  "NEW_MESSAGE",
  "CONTRACT_READY_FOR_REVIEW",
  "CONTRACT_APPROVED",
  "CONTRACT_REJECTED",
  "HIGH_MATCH_TENANT_REQUEST",
  "ACCOUNT_REACTIVATED",
  "ACCOUNT_REACTIVATION_REJECTED",
  "REACTIVATION_REQUEST",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  /** Deep link into the app. */
  link: z.string().nullable(),
  type: NotificationTypeSchema,
  isRead: z.boolean(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationsResponseSchema = z.object({
  items: z.array(NotificationSchema),
  unread: z.number().int(),
});
export type NotificationsResponse = z.infer<typeof NotificationsResponseSchema>;

/** Socket.io event names the client subscribes to (PRO-06). */
export const SOCKET_EVENTS = {
  /** A new NOTIFICATION for the authenticated user. */
  notification: "notification",
  /** A new item entered an admin moderation queue. */
  adminQueueItem: "admin:queue:item",
  message: "message",
  /** A match message was edited by its sender. */
  messageEdited: "message:edited",
  /** A match message was deleted by its sender. */
  messageDeleted: "message:deleted",
  /** A new support ticket was created (admins). */
  supportTicketCreated: "support:ticket:created",
  /** A new reply landed on a support ticket (customer or assigned agent). */
  supportMessageReceived: "support:message:received",
  /** This socket's account was just deleted (soft-delete) — drop the session instantly. */
  forceLogout: "force_logout",
  /** A soft-deleted user requested account reactivation (admins). */
  newReactivationRequest: "new_reactivation_request",
  /** Admin suspended this account → show a blocking notice + log out. */
  accountSuspended: "account:suspended",
  /** A persisted payment reached a terminal state for the authenticated user. */
  paymentUpdated: "payment:updated",
} as const;

/** Payload for the `new_reactivation_request` event (matches the NestJS gateway). */
export interface RealtimeReactivationRequest {
  requestId: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  createdAt: string;
}

/** Payload for the `account:suspended` event (matches the NestJS gateway). */
export interface AccountSuspendedPayload {
  message: string;
  reason: string | null;
  suspendedUntil: string | null;
}

/** Payload for the `support:message:received` event (matches the NestJS gateway). */
export interface RealtimeSupportMessage {
  ticketId: string;
  authorName: string;
  content: string;
  internal: boolean;
  at: string;
}

/** Payload for `support:ticket:created` delivered to connected admins. */
export interface RealtimeSupportTicket {
  ticketId: string;
  subject: string;
  userName: string;
  priority: string;
  createdAt: string;
}
