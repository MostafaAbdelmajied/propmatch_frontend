"use client";

import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { cn } from "@/src/utils/cn";

/**
 * Press to start recording a voice note, press again to stop. On stop, hands
 * back the recorded audio Blob + duration for upload. Uses the browser
 * MediaRecorder API (webm/opus); no external deps.
 */
export function VoiceRecorderButton({
  onRecorded,
  disabled,
}: {
  onRecorded: (blob: Blob, durationMs: number) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const durationMs = Date.now() - startedAtRef.current;
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (blob.size > 0) onRecorded(blob, durationMs);
      };
      startedAtRef.current = Date.now();
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={recording ? stop : start}
      aria-label={recording ? "إيقاف التسجيل" : "تسجيل رسالة صوتية"}
      title={recording ? "إيقاف التسجيل" : "تسجيل رسالة صوتية"}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
        recording
          ? "bg-error text-white animate-pulse"
          : "bg-background text-muted hover:bg-primary-tint hover:text-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {recording ? <Square className="size-4" aria-hidden /> : <Mic className="size-5" aria-hidden />}
    </button>
  );
}
