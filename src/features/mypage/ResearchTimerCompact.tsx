"use client";

/**
 * ResearchTimerCompact — 연구활동 대시보드 헤더용 compact 타이머 (사이클 123)
 *
 * 전역 useStudyTimerStore(읽기·정지) + useStudySessions(오늘 누적)을 재사용한다.
 *  - 활성 세션이 있으면: 대상 제목 + 경과 시간(분:초) + 일시정지/재개 + 정지.
 *  - 없으면: 오늘 누적 시간 + "논문에서 타이머 시작" 안내.
 *
 * 타이머 시작은 대상(논문/작성물) 선택이 필요하므로 여기서는 시작하지 않고
 * 기존 흐름(논문 화면·FAB)을 그대로 사용한다 — 중복 lifecycle 방지.
 */

import { useEffect, useMemo } from "react";
import { Clock, Pause, Play, Square, Timer } from "lucide-react";
import { useStudyTimerStore } from "@/features/research/study-timer/study-timer-store";
import { useStudySessions } from "@/features/research/study-timer/useStudySessions";
import { todayYmdLocal } from "@/lib/dday";
import { cn } from "@/lib/utils";

function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtMinutes(min: number): string {
  if (min < 1) return "0분";
  if (min < 60) return `${Math.round(min)}분`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

export default function ResearchTimerCompact() {
  const active = useStudyTimerStore((s) => s.active);
  const elapsed = useStudyTimerStore((s) => s.elapsed);
  const isPaused = useStudyTimerStore((s) => s.isPaused);
  const tick = useStudyTimerStore((s) => s.tick);
  const pause = useStudyTimerStore((s) => s.pause);
  const resume = useStudyTimerStore((s) => s.resume);
  const stop = useStudyTimerStore((s) => s.stop);

  const { sessions } = useStudySessions();

  // 활성 세션이 있을 때만 tick (전역 store — 다른 위젯과 중복돼도 idempotent)
  useEffect(() => {
    if (!active || isPaused) return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [active, isPaused, tick]);

  const todayMinutes = useMemo(() => {
    const today = todayYmdLocal();
    let sum = 0;
    for (const s of sessions) {
      if (!s.endTime || !s.startTime) continue;
      if (todayYmdLocal(new Date(s.startTime)) !== today) continue;
      sum += s.durationMinutes || 0;
    }
    return sum;
  }, [sessions]);

  if (active) {
    const typeLabel = active.type === "writing" ? "작성" : "읽기";
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
        <span
          className={cn(
            "inline-flex h-2 w-2 rounded-full",
            isPaused ? "bg-amber-500" : "animate-pulse bg-emerald-500",
          )}
          aria-hidden
        />
        <div className="flex flex-col leading-tight">
          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Timer size={10} />
            진행 중 · {typeLabel}
          </span>
          <span className="max-w-[160px] truncate text-[11px] font-semibold text-foreground">
            {active.targetTitle || "(제목 없음)"}
          </span>
        </div>
        <span className="ml-1 font-mono text-base font-bold tabular-nums text-primary">
          {fmtClock(elapsed)}
        </span>
        <div className="flex items-center gap-1">
          {isPaused ? (
            <button
              type="button"
              onClick={resume}
              title="재개"
              className="rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Play size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={pause}
              title="일시정지"
              className="rounded-md p-1.5 text-amber-600 transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <Pause size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={stop}
            title="세션 종료"
            className="rounded-md p-1.5 text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Square size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
      <Clock size={15} className="text-muted-foreground" aria-hidden />
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium text-muted-foreground">오늘 연구 시간</span>
        <span className="text-sm font-bold tabular-nums text-foreground">
          {fmtMinutes(todayMinutes)}
        </span>
      </div>
    </div>
  );
}
