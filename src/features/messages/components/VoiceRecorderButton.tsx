"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Send, Trash2 } from "lucide-react";
import { cn } from "@/src/utils/cn";

type Phase = "idle" | "recording" | "paused";

/**
 * WhatsApp-style voice-note recorder: tap the mic to start, then pause/resume,
 * cancel (discard), or send (stop → hand the recorded blob to `onRecorded`).
 * A live timer shows elapsed recording time. Uses the browser MediaRecorder API.
 */
export function VoiceRecorderButton({
  onRecorded,
  disabled,
}: {
  onRecorded: (blob: Blob, durationMs: number) => void;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastResumeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const cancelledRef = useRef<boolean>(false);

  // Drive the live timer while recording (not while paused).
  useEffect(() => {
    if (phase === "recording") {
      lastResumeRef.current = Date.now();
      tickRef.current = setInterval(() => {
        setElapsedMs(accumulatedRef.current + (Date.now() - lastResumeRef.current));
      }, 200);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase]);

  function cleanup() {
    if (tickRef.current) clearInterval(tickRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    accumulatedRef.current = 0;
    setElapsedMs(0);
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelledRef.current = false;
      accumulatedRef.current = 0;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const duration = accumulatedRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const wasCancelled = cancelledRef.current;
        cleanup();
        setPhase("idle");
        if (!wasCancelled && blob.size > 0) onRecorded(blob, duration);
      };

      recorder.start();
      setPhase("recording");
    } catch {
      cleanup();
      setPhase("idle");
    }
  }

  function pause() {
    const r = recorderRef.current;
    if (!r || r.state !== "recording") return;
    r.pause();
    accumulatedRef.current += Date.now() - lastResumeRef.current;
    if (tickRef.current) clearInterval(tickRef.current);
    setPhase("paused");
  }

  function resume() {
    const r = recorderRef.current;
    if (!r || r.state !== "paused") return;
    r.resume();
    setPhase("recording");
  }

  function finalize(cancelled: boolean) {
    const r = recorderRef.current;
    if (!r) return;
    cancelledRef.current = cancelled;
    // Capture accumulated time if stopping mid-recording.
    if (r.state === "recording") {
      accumulatedRef.current += Date.now() - lastResumeRef.current;
    }
    r.stop(); // triggers onstop
  }

  if (phase === "idle") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={start}
        aria-label="تسجيل رسالة صوتية"
        title="تسجيل رسالة صوتية"
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-muted transition-colors",
          "hover:bg-primary-tint hover:text-primary disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <Mic className="size-5" aria-hidden />
      </button>
    );
  }

  return (
    <div className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-surface px-2 py-1 shadow-sm">
      <button
        type="button"
        onClick={() => finalize(true)}
        aria-label="إلغاء التسجيل"
        title="إلغاء"
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-error hover:bg-error-tint"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>

      <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap tabular-nums text-small text-ink">
        <span
          className={cn(
            "size-2 rounded-full bg-error",
            phase === "recording" && "animate-pulse",
          )}
          aria-hidden
        />
        {formatDuration(elapsedMs)}
      </span>

      {phase === "recording" ? (
        <button
          type="button"
          onClick={pause}
          aria-label="إيقاف مؤقت"
          title="إيقاف مؤقت"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-background"
        >
          <Pause className="size-4" aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={resume}
          aria-label="استئناف"
          title="استئناف"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary-tint"
        >
          <Play className="size-4" aria-hidden />
        </button>
      )}

      <button
        type="button"
        onClick={() => finalize(false)}
        aria-label="إرسال التسجيل"
        title="إرسال"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark"
      >
        <Send className="size-4 rtl:-scale-x-100" aria-hidden />
      </button>
    </div>
  );
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
