"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, Edit3, FileText, Paperclip, Send, Trash2, X } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/utils/cn";
import {
  useMatchConversations,
  useConfirmMatchAgreement,
  useMatchMessages,
  useSendMatchMessage,
  useUpdateMatchMessage,
  useDeleteMatchMessage,
} from "../hooks/useMessages";
import { useChatUpload } from "../hooks/useChatUpload";
import { ChatAttachmentView } from "./ChatAttachmentView";
import { VoiceRecorderButton } from "./VoiceRecorderButton";
import { ChatMediaLightbox, MediaItem } from "./ChatMediaLightbox";
import type { UploadedAttachment } from "@/src/lib/api/contracts/message";

export function formatMessageTimestamp(createdAtStr?: string | null): string {
  if (!createdAtStr) return "";
  const date = new Date(createdAtStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const dStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = nowStart.getTime() - dStart.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const time24 = `${hours}:${minutes}`;

  let dayStr = "";
  if (diffDays === 0) {
    dayStr = "اليوم";
  } else if (diffDays === 1) {
    dayStr = "أمس";
  } else {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    dayStr = `${day}${month} ${year}`;
  }

  return `${dayStr} ${time24}`;
}

function canEditOrDelete(createdAtStr: string): boolean {
  if (!createdAtStr) return false;
  const msgTime = new Date(createdAtStr).getTime();
  const now = new Date().getTime();
  const diffMinutes = (now - msgTime) / (1000 * 60);
  return diffMinutes <= 15;
}

export function ConversationView({ matchConnectionId }: { matchConnectionId: string }) {
  const pathname = usePathname();
  const role = pathname.startsWith("/landlord") ? "landlord" : "tenant";
  const conversations = useMatchConversations();
  const summary = conversations.data?.find(
    (conversation) => conversation.matchConnectionId === matchConnectionId,
  );
  const { data = [], isLoading } = useMatchMessages(matchConnectionId);
  const send = useSendMatchMessage(matchConnectionId);
  const updateMessage = useUpdateMatchMessage(matchConnectionId);
  const deleteMessage = useDeleteMatchMessage(matchConnectionId);
  const upload = useChatUpload();
  const confirmAgreement = useConfirmMatchAgreement(matchConnectionId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [body, setBody] = useState("");
  const [pending, setPending] = useState<(UploadedAttachment & { durationMs?: number }) | null>(
    null,
  );
  const [sendError, setSendError] = useState<string | null>(null);
  const [agreementConfirmOpen, setAgreementConfirmOpen] = useState(false);
  const [agreementAcknowledged, setAgreementAcknowledged] = useState(false);

  // Edit message inline state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  // Media Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const mediaItems: MediaItem[] = data
    .filter(
      (m) => m.attachmentUrl && (m.attachmentType === "IMAGE" || m.attachmentType === "VIDEO"),
    )
    .map((m) => ({
      id: m.id,
      url: m.attachmentUrl!,
      type: m.attachmentType as "IMAGE" | "VIDEO",
      name: m.attachmentName,
    }));

  const busy = send.isPending || upload.uploading;
  const valid = (Boolean(body.trim()) || Boolean(pending)) && body.length <= 1000;

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = await upload.upload(file, file.name);
    if (result) setPending(result);
  }

  async function onRecorded(blob: Blob, durationMs: number) {
    const result = await upload.upload(blob, `voice-${Date.now()}.webm`);
    if (result) setPending({ ...result, durationMs });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy) return;
    setSendError(null);
    send.mutate(
      {
        body: body.trim() || undefined,
        attachmentUrl: pending?.url,
        attachmentType: pending?.type,
        attachmentName: pending?.name,
        attachmentDurationMs: pending?.durationMs,
      },
      {
        onSuccess: () => {
          setBody("");
          setPending(null);
        },
        onError: () => setSendError("تعذر إرسال الرسالة. حاول مرة أخرى."),
      },
    );
  }

  function handleSaveEdit(messageId: string) {
    if (!editBody.trim()) return;
    updateMessage.mutate(
      { messageId, body: editBody.trim() },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditBody("");
        },
      },
    );
  }

  function handleDelete(messageId: string) {
    if (confirm("هل أنت تأكد من حذف هذه الرسالة؟")) {
      deleteMessage.mutate(messageId);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-3xl flex-col gap-4">
      <header className="flex items-center gap-3 rounded-card border border-hairline bg-surface p-4">
        <Link
          href={`/${role}/messages`}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-control text-primary hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="العودة إلى المحادثات"
        >
          <ArrowRight className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">
            {summary?.otherParticipantName ?? "المحادثة"}
          </p>
          {summary?.propertyTitle && (
            <p className="truncate text-small text-muted">{summary.propertyTitle}</p>
          )}
        </div>
        {summary && (
          <Link
            href={`/contracts/new?matchConnectionId=${matchConnectionId}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-hairline px-3 py-2 text-caption font-semibold text-primary hover:bg-primary-tint"
          >
            <FileText className="size-4" aria-hidden />
            إنشاء عقد إيجار
          </Link>
        )}
        {summary?.canConfirmAgreement ? (
          <Button size="sm" onClick={() => setAgreementConfirmOpen(true)}>
            <Check className="size-4" aria-hidden />
            تم التوصل إلى اتفاق
          </Button>
        ) : summary && !summary.agreementReachedAt ? (
          <span className="rounded-pill bg-pending-tint px-3 py-2 text-caption font-semibold text-pending">
            بانتظار تأكيد الطرف الآخر
          </span>
        ) : null}
      </header>

      {agreementConfirmOpen && (
        <section
          className="rounded-card border border-primary/30 bg-primary-tint p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agreement-confirm-title"
        >
          <h2 id="agreement-confirm-title" className="text-title font-bold text-ink">
            تأكيد التوصل إلى اتفاق نهائي
          </h2>
          <p className="mt-2 text-body text-body-text">
            استخدم هذا التأكيد فقط بعد اتفاق الطرفين على استئجار العقار. بعد التأكيد سيتم أرشفة
            العقار تلقائيًا ولن يظهر لباقي المستأجرين.
            {role === "tenant" && " كما سيتوقف طلبك الحالي عن الظهور لباقي الملاك."}
          </p>
          <label className="mt-4 flex items-start gap-2 text-small text-ink">
            <input
              type="checkbox"
              checked={agreementAcknowledged}
              onChange={(event) => setAgreementAcknowledged(event.target.checked)}
              className="mt-1"
            />
            {role === "tenant"
              ? "أؤكد أنني توصلت إلى اتفاق نهائي مع هذا المالك وأريد إغلاق طلب السكن الحالي."
              : "أؤكد أنني توصلت إلى اتفاق نهائي مع هذا المستأجر وأريد أرشفة العقار."}
          </label>
          {confirmAgreement.isError && (
            <p className="mt-3 text-small text-error" role="alert">
              تعذر تأكيد الاتفاق. ربما تم إغلاق الطلب من محادثة أخرى؛ حدّث الصفحة وحاول مرة أخرى.
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              disabled={confirmAgreement.isPending}
              onClick={() => {
                setAgreementConfirmOpen(false);
                setAgreementAcknowledged(false);
              }}
            >
              إلغاء
            </Button>
            <Button
              disabled={!agreementAcknowledged || confirmAgreement.isPending}
              loading={confirmAgreement.isPending}
              onClick={() =>
                confirmAgreement.mutate(undefined, {
                  onSuccess: () => {
                    setAgreementConfirmOpen(false);
                    setAgreementAcknowledged(false);
                  },
                })
              }
            >
              تأكيد الاتفاق وأرشفة العقار
            </Button>
          </div>
        </section>
      )}

      <section
        className="flex min-h-72 flex-1 flex-col gap-3 rounded-card border border-hairline bg-background p-4"
        aria-live="polite"
      >
        {isLoading ? (
          <p className="text-small text-muted">جارٍ تحميل الرسائل...</p>
        ) : data.length ? (
          data.map((message) => {
            const isEligibleForEdit = message.isMine && canEditOrDelete(message.createdAt);
            const mediaIndex = mediaItems.findIndex((m) => m.id === message.id);

            return (
              <div
                key={message.id}
                className={cn(
                  "relative group flex max-w-[85%] flex-col gap-1.5 rounded-card px-4 py-2.5 shadow-xs transition-all",
                  message.isMine
                    ? "self-end bg-primary text-white"
                    : "self-start bg-surface text-ink shadow-card border border-hairline",
                )}
              >
                {/* 15-Minute Edit & Delete Actions Toolbar for Sender */}
                {isEligibleForEdit && editingId !== message.id && (
                  <div
                    className={cn(
                      "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-surface border border-hairline rounded-pill px-1.5 py-0.5 shadow-sm z-10 text-ink",
                      message.isMine ? "-left-16" : "-right-16",
                    )}
                  >
                    {message.body && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(message.id);
                          setEditBody(message.body);
                        }}
                        className="p-1 text-muted hover:text-primary transition-colors"
                        title="تعديل الرسالة (متاح خلال 15 دقيقة)"
                      >
                        <Edit3 className="size-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(message.id)}
                      className="p-1 text-muted hover:text-error transition-colors"
                      title="حذف الرسالة (متاح خلال 15 دقيقة)"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}

                {/* Attachment View */}
                {message.attachmentUrl && message.attachmentType && (
                  <ChatAttachmentView
                    url={message.attachmentUrl}
                    type={message.attachmentType}
                    name={message.attachmentName}
                    durationMs={message.attachmentDurationMs}
                    onClickMedia={() => {
                      if (mediaIndex !== -1) {
                        setLightboxIndex(mediaIndex);
                        setLightboxOpen(true);
                      }
                    }}
                  />
                )}

                {/* Message Body / Inline Edit Mode */}
                {editingId === message.id ? (
                  <div className="flex items-center gap-1.5 my-1">
                    <input
                      type="text"
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="flex-1 rounded-control border border-hairline bg-surface text-ink px-2.5 py-1 text-small focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(message.id)}
                      disabled={updateMessage.isPending}
                      className="p-1 text-success hover:scale-110 transition-transform"
                      title="حفظ"
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 text-muted hover:text-ink transition-colors"
                      title="إلغاء"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  message.body && (
                    <p className="text-body leading-relaxed" dir="auto">
                      {message.body}
                    </p>
                  )
                )}

                {/* Message Timestamp (+ edited marker) */}
                <span
                  className={cn(
                    "text-[10px] font-medium self-end opacity-80 select-none mt-0.5",
                    message.isMine ? "text-white/80" : "text-muted",
                  )}
                >
                  {message.editedAt && <span title="تم التعديل">معدّل · </span>}
                  {formatMessageTimestamp(message.createdAt)}
                </span>
              </div>
            );
          })
        ) : (
          <p className="m-auto text-center text-small text-muted">
            ابدأ المحادثة برسالة قصيرة ومحترمة.
          </p>
        )}
      </section>

      <form onSubmit={submit} className="rounded-card border border-hairline bg-surface p-4">
        {pending && (
          <div className="mb-3 flex items-center gap-2 rounded-control border border-hairline bg-background p-2">
            <div className="min-w-0 flex-1">
              <ChatAttachmentView
                url={pending.url}
                type={pending.type}
                name={pending.name}
                durationMs={pending.durationMs}
              />
            </div>
            <button
              type="button"
              onClick={() => setPending(null)}
              aria-label="إزالة المرفق"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-error-tint hover:text-error"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}

        <label htmlFor="message-body" className="sr-only">
          اكتب رسالتك
        </label>
        <textarea
          id="message-body"
          value={body}
          maxLength={1000}
          rows={3}
          placeholder="اكتب رسالتك..."
          onChange={(event) => setBody(event.target.value)}
          className="w-full resize-y rounded-control border border-hairline bg-background px-3 py-2.5 text-body text-ink outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          disabled={send.isPending}
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={onPickFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              aria-label="إرفاق صورة أو فيديو"
              title="إرفاق صورة أو فيديو"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-muted transition-colors hover:bg-primary-tint hover:text-primary disabled:opacity-50"
            >
              <Paperclip className="size-5" aria-hidden />
            </button>
            <VoiceRecorderButton onRecorded={onRecorded} disabled={busy} />
            {upload.uploading && <span className="text-caption text-muted">جارٍ الرفع…</span>}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-caption text-muted">{body.length}/1000</span>
            <Button type="submit" disabled={!valid || busy} loading={send.isPending}>
              <Send className="size-4" aria-hidden />
              إرسال
            </Button>
          </div>
        </div>
        {(sendError || upload.error) && (
          <p className="mt-1 text-small text-error" role="alert">
            {sendError ?? upload.error}
          </p>
        )}
      </form>

      {/* Media Lightbox Viewer Modal */}
      {lightboxOpen && (
        <ChatMediaLightbox
          items={mediaItems}
          initialIndex={lightboxIndex}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
