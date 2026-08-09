import { z } from "zod";

/**
 * Legal Support Chatbot (PRO-17 / SRS 3.3). RAG over Egyptian tenancy law +
 * platform T&Cs, with a strict on-topic guardrail. Session-scoped.
 */

export const ChatRoleSchema = z.enum(["user", "assistant"]);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: ChatRoleSchema,
  content: z.string(),
  /** True when the assistant declined an off-topic question (SRS 3.3). */
  declined: z.boolean().optional(),
  /** Legal chat: an image/voice note the user attached to this turn. */
  attachmentUrl: z.string().nullable().optional(),
  attachmentType: z.enum(["IMAGE", "VIDEO", "AUDIO"]).nullable().optional(),
  attachmentName: z.string().nullable().optional(),
  suggestedGuide: z.array(z.string()).optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/* ----------------------------- support tickets ---------------------------- */
/* Aligned directly with backend Prisma schema (`SupportTicket` & `SupportMessage`) */

/** Lifecycle: NEW → ASSIGNED → IN_PROGRESS → WAITING → CLOSED (supports upper & lower). */
export const TicketStatusSchema = z.enum([
  "NEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING",
  "CLOSED",
  "new",
  "assigned",
  "in_progress",
  "waiting",
  "closed",
]);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const ticketStatusLabels: Record<string, string> = {
  NEW: "جديد",
  ASSIGNED: "معيّن",
  IN_PROGRESS: "قيد المعالجة",
  WAITING: "بانتظار العميل",
  CLOSED: "مغلق",
  new: "جديد",
  assigned: "معيّن",
  in_progress: "قيد المعالجة",
  waiting: "بانتظار العميل",
  closed: "مغلق",
};

/** Support Priority: LOW, NORMAL, HIGH, URGENT, CRITICAL (supports upper & lower). */
export const SupportPrioritySchema = z.enum([
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
  "CRITICAL",
  "low",
  "normal",
  "high",
  "urgent",
  "critical",
]);
export type SupportPriority = z.infer<typeof SupportPrioritySchema>;

export const priorityLabels: Record<string, string> = {
  LOW: "منخفضة",
  NORMAL: "عادية",
  HIGH: "مرتفعة",
  URGENT: "عاجلة",
  CRITICAL: "حرجة جداً",
  low: "منخفضة",
  normal: "عادية",
  high: "مرتفعة",
  urgent: "عاجلة",
  critical: "حرجة جداً",
};

/** Who authored a message: AI, USER, ADMIN (supports upper & lower). */
export const SupportAuthorSchema = z.enum(["AI", "USER", "ADMIN", "ai", "user", "admin"]);
export type SupportAuthor = z.infer<typeof SupportAuthorSchema>;

export const SupportMessageSchema = z.object({
  id: z.string(),
  authorType: SupportAuthorSchema.optional(),
  author: SupportAuthorSchema.optional(),
  authorName: z.string(),
  content: z.string(),
  internal: z.boolean().default(false),
  attachmentUrl: z.string().nullable().optional(),
  attachmentType: z.enum(["IMAGE", "VIDEO", "AUDIO"]).nullable().optional(),
  attachmentName: z.string().nullable().optional(),
  attachmentDurationMs: z.number().nullable().optional(),
  createdAt: z.string().optional(),
  at: z.string().optional(),
});
export type SupportMessage = z.infer<typeof SupportMessageSchema>;

export const TicketSummarySchema = z.object({
  id: z.string(),
  subject: z.string().optional().default("تذكرة دعم فني"),
  userName: z.string().optional(),
  status: TicketStatusSchema,
  assignedAdminName: z.string().nullable().optional(),
  priority: SupportPrioritySchema.optional(),
  commercialPriority: z.enum(["FREEMIUM", "OWNER_PLUS", "PREMIUM"]).optional(),
  escalationReason: z.string().nullable().optional(),
  lastMessageAt: z.string(),
  createdAt: z.string(),
});
export type TicketSummary = z.infer<typeof TicketSummarySchema>;

export const AdminTicketsResponseSchema = z.object({
  items: z.array(TicketSummarySchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type AdminTicketsResponse = z.infer<typeof AdminTicketsResponseSchema>;

export const TicketDetailSchema = TicketSummarySchema.extend({
  userId: z.string(),
  assignedAdminId: z.string().nullable().optional(),
  aiSummary: z.string().nullable().optional(),
  messages: z.array(SupportMessageSchema),
});
export type TicketDetail = z.infer<typeof TicketDetailSchema>;

export const AdminReplyRequestSchema = z.object({
  content: z.string().min(1),
  internal: z.boolean().default(false),
});
export type AdminReplyRequest = z.infer<typeof AdminReplyRequestSchema>;

export const TicketStatusUpdateSchema = z.object({ status: TicketStatusSchema });
export type TicketStatusUpdate = z.infer<typeof TicketStatusUpdateSchema>;
