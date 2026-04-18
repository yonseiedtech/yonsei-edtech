"use client";

import { useEffect, useRef } from "react";
import { useStudyTimerStore } from "./study-timer-store";
import { BookOpen, Pencil, Pause, Play, Square, Focus } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function StudyTimerBar() {
  const { active, elapsed, isPaused, pause, resume, requestStop, tick, restore } =
    useStudyTimerStore();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    restore();
  }, [restore]);

  useEffect(() => {
    if (!active || isPaused) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, isPaused, tick]);

  if (!active) return null;

  const isReading = active.type === "reading";

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 px-4 py-2.5 text-white shadow-lg print:hidden",
        "animate-in slide-in-from-bottom duration-300",
        isReading ? "bg-primary" : "bg-blue-800",
      )}
    >
      {isReading ? <BookOpen size={16} className="shrink-0" /> : <Pencil size={16} className="shrink-0" />}
      <span className="hidden text-[11px] font-semibold uppercase tracking-wider opacity-80 sm:inline">
        {isReading ? "읽기" : "작성"}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {active.targetTitle}
      </span>

      <span className={cn("shrink-0 font-mono text-sm tabular-nums", isPaused && "animate-pulse opacity-60")}>
        {fmt(elapsed)}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        {isPaused ? (
          <button
            type="button"
            onClick={resume}
            className="rounded-md p-1.5 hover:bg-white/20"
            title="계속하기"
          >
            <Play size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={pause}
            className="rounded-md p-1.5 hover:bg-white/20"
            title="일시정지"
          >
            <Pause size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={requestStop}
          className="rounded-md bg-white/20 p-1.5 hover:bg-white/30"
          title="종료"
        >
          <Square size={14} />
        </button>
      </div>
    </div>
  );
}
