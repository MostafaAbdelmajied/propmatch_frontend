"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/src/utils/cn";

/**
 * Compact WhatsApp-style voice-note player for chat bubbles. Uses `currentColor`
 * so it reads correctly on both own (teal) and incoming (light) bubbles. Works
 * around the webm/MediaRecorder `duration === Infinity` quirk.
 */
export function VoiceNotePlayer({
  src,
  durationMs,
  className,
}: {
  src: string;
  durationMs?: number | null;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationMs ? durationMs / 1000 : 0);
  const fixingRef = useRef(false);

  function onLoadedMetadata() {
    const a = audioRef.current;
    if (!a) return;
    if (!Number.isFinite(a.duration)) {
      // Force the browser to compute a real duration for streamed webm blobs.
      fixingRef.current = true;
      a.currentTime = 1e101;
    } else {
      setDuration(a.duration);
    }
  }

  function onTimeUpdate() {
    const a = audioRef.current;
    if (!a) return;
    if (fixingRef.current && Number.isFinite(a.duration)) {
      fixingRef.current = false;
      setDuration(a.duration);
      a.currentTime = 0;
      return;
    }
    setCurrent(a.currentTime);
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  }

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const shown = current > 0 ? current : duration;

  const [speed, setSpeed] = useState(1);
  const SPEEDS = [1, 1.25, 1.5, 2, 0.5];

  function toggleSpeed() {
    const nextIndex = (SPEEDS.indexOf(speed) + 1) % SPEEDS.length;
    const nextSpeed = SPEEDS[nextIndex];
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  }

  return (
    <div className={cn("flex min-w-[200px] max-w-[260px] items-center gap-2.5", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "إيقاف" : "تشغيل"}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-current/15 transition-colors hover:bg-current/25"
      >
        {playing ? (
          <Pause className="size-4" aria-hidden />
        ) : (
          <Play className="size-4 rtl:-scale-x-100" aria-hidden />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="h-1 overflow-hidden rounded-full bg-current/25">
          <div className="h-full rounded-full bg-current" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-caption tabular-nums opacity-80">{formatTime(shown)}</div>
      </div>

      {/* Speed Control Button */}
      <button
        type="button"
        onClick={toggleSpeed}
        className="shrink-0 rounded-control bg-current/15 px-1.5 py-0.5 text-[11px] font-bold opacity-90 hover:bg-current/25 transition-colors"
        title="تغيير سرعة التشغيل"
      >
        {speed}x
      </button>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
      />
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
