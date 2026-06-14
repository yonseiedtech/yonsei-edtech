"use client";

/**
 * FloatingReadingTimer — 드래그 가능한 학습 부엉이 (사이클 120·122·123·125·126)
 * 상시 동반(로그인 한정). 사용자가 끌어 위치 이동(자동 순간이동 없음). 네이비 원형 배경.
 * - 평소(idle): 격려 + 메뉴(읽기/쓰기 타이머 켜기 · 읽은 논문 기록 · 숨김)
 * - 읽는/쓰는 중: 부엉이 뒤 빨간 집중 불꽃 + 말풍선 경과 시간 + 계속/멈춤/그만
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useStudyTimerStore } from "./study-timer-store";
import { useCreateSession } from "./useStudySessions";
import { useAuthStore } from "@/features/auth/auth-store";
import ReadingMascot from "./ReadingMascot";
import ReadingLogModal from "./ReadingLogModal";
import type { PaperReadingSource } from "@/types/paper-reading";

const LS_OFF = "omcReadingOwlOff";
const LS_HIDE = "omcReadingOwlHideUntil";
const LS_POS = "omcReadingOwlPos";
const OWL_SIZE = 56;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export default function FloatingReadingTimer() {
  const { active, elapsed, isPaused } = useStudyTimerStore(
    useShallow((s) => ({ active: s.active, elapsed: s.elapsed, isPaused: s.isPaused })),
  );
  const start = useStudyTimerStore((s) => s.start);
  const pause = useStudyTimerStore((s) => s.pause);
  const resume = useStudyTimerStore((s) => s.resume);
  const stop = useStudyTimerStore((s) => s.stop);
  const { mutateAsync: createSession } = useCreateSession();
  const { user } = useAuthStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [idleLogOpen, setIdleLogOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [readingDone, setReadingDone] = useState<{
    title: string;
    durationMin: number;
    source: PaperReadingSource;
    refId?: string;
  } | null>(null);

  const dragging = useRef(false);
  const moved = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  useEffect(() => {
    const off = localStorage.getItem(LS_OFF) === "true";
    const hideUntil = localStorage.getItem(LS_HIDE);
    const today = new Date().toISOString().slice(0, 10);
    setHidden(off || hideUntil === today);
    try {
      const raw = localStorage.getItem(LS_POS);
      if (raw) {
        const p = JSON.parse(raw);
        setPos({
          x: clamp(p.x, 0, window.innerWidth - OWL_SIZE),
          y: clamp(p.y, 0, window.innerHeight - OWL_SIZE),
        });
      }
    } catch {
      /* noop */
    }
  }, []);

  const timerType = active?.type;
  const isReading = timerType === "reading";
  const isWriting = timerType === "writing";
  const isActiveTimer = isReading || isWriting;
  const focusing = isActiveTimer && !isPaused;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragStart.current = { x: e.clientX, y: e.clientY, px: rect.left, py: rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
    setPos({
      x: clamp(dragStart.current.px + dx, 0, window.innerWidth - OWL_SIZE),
      y: clamp(dragStart.current.py + dy, 0, window.innerHeight - OWL_SIZE),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    if (moved.current && pos) {
      try {
        localStorage.setItem(LS_POS, JSON.stringify(pos));
      } catch {
        /* noop */
      }
    }
  }, [pos]);

  const onOwlClick = useCallback(() => {
    if (!moved.current) setMenuOpen((v) => !v);
  }, []);

  if (hidden || !user) return null;

  async function startTimerOf(type: "reading" | "writing") {
    if (active) {
      toast.error("이미 진행 중인 세션이 있습니다");
      return;
    }
    const title = type === "reading" ? "집중 읽기" : "집중 쓰기";
    try {
      const session = await createSession({ type, targetTitle: title });
      start({
        id: session.id,
        type,
        targetTitle: title,
        startTime: Date.now(),
        ...(type === "reading" ? { readingSource: "external" as PaperReadingSource } : {}),
      });
      setMenuOpen(false);
      toast.success(`${title} 타이머 시작 🔥`);
    } catch {
      toast.error("타이머 시작에 실패했습니다");
    }
  }

  function handleStop() {
    if (!active) return;
    const min = Math.max(1, Math.round(elapsed / 60));
    if (active.type === "reading") {
      setReadingDone({
        title: active.targetTitle,
        durationMin: min,
        source: active.readingSource ?? "external",
        refId: active.readingRefId ?? active.paperId,
      });
    } else {
      toast.success(`「${active.targetTitle}」 글쓰기 ${min}분 기록됨 ✍️`);
    }
    stop();
    setMenuOpen(false);
  }

  function hideToday() {
    localStorage.setItem(LS_HIDE, new Date().toISOString().slice(0, 10));
    setHidden(true);
    setMenuOpen(false);
  }
  function turnOff() {
    localStorage.setItem(LS_OFF, "true");
    setHidden(true);
    setMenuOpen(false);
  }

  const posStyle: React.CSSProperties = pos ? { left: pos.x, top: pos.y } : { right: 24, bottom: 96 };
  const actLabel = isReading ? "읽는 중" : "쓰는 중";

  return (
    <>
      <div className="fixed z-40 print:hidden" style={posStyle}>
        <div className="relative flex flex-col items-center">
          {/* 말풍선 */}
          <div className="relative mb-1 max-w-[190px] rounded-2xl border bg-card px-3 py-1.5 pr-7 text-center shadow-lg">
            {isActiveTimer && active ? (
              <>
                <p className="truncate text-[11px] text-muted-foreground">
                  <span className="mr-1 font-medium">{actLabel}</span>
                  {active.targetTitle}
                </p>
                <p className={`font-mono text-sm font-bold tabular-nums ${isPaused ? "text-muted-foreground" : "text-indigo-700"}`}>
                  {fmt(elapsed)}
                  {isPaused && <span className="ml-1 text-[10px] font-normal">잠시 멈춤</span>}
                </p>
              </>
            ) : (
              <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200">오늘도 함께 공부해요 🦉</p>
            )}
            <button type="button" onClick={hideToday} className="absolute right-1.5 top-1.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted" aria-label="오늘 하루 숨기기" title="오늘 하루 숨기기">
              <X size={13} />
            </button>
            <span className="absolute -bottom-[6px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r bg-card" />
          </div>

          {/* 부엉이 + 집중 불꽃 */}
          <div className="relative">
            {focusing && (
              <span aria-hidden className="owl-flame pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
            )}
            <button
              type="button"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onClick={onOwlClick}
              className="relative flex h-14 w-14 touch-none cursor-grab items-center justify-center rounded-full text-white shadow-xl ring-2 ring-white/70 transition-transform hover:scale-105 active:scale-95 active:cursor-grabbing"
              style={{ background: "linear-gradient(135deg,#1e3a8a,#0f172a)" }}
              aria-label="학습 부엉이 — 끌어서 이동, 눌러서 메뉴"
            >
              <ReadingMascot isPaused={isActiveTimer && isPaused} size={38} />
            </button>
          </div>

          {/* 메뉴 */}
          {menuOpen && (
            <div className="absolute top-full mt-2 w-44 rounded-2xl border bg-card p-2 shadow-2xl">
              {isActiveTimer ? (
                <>
                  <p className="px-2 pb-1.5 pt-0.5 text-center text-[11px] font-medium text-muted-foreground">지금 {isReading ? "읽기를" : "쓰기를"}…</p>
                  {isPaused ? (
                    <button type="button" onClick={() => { resume(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">▶️ 계속하기</button>
                  ) : (
                    <button type="button" onClick={() => { pause(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">⏸️ 잠시 멈춤</button>
                  )}
                  <button type="button" onClick={handleStop} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">⏹️ {isReading ? "그만 읽기" : "그만 쓰기"}</button>
                </>
              ) : (
                <>
                  <p className="px-2 pb-1.5 pt-0.5 text-center text-[11px] font-medium text-muted-foreground">무엇을 할까요?</p>
                  <button type="button" onClick={() => startTimerOf("reading")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">🔥 읽기 타이머 시작</button>
                  <button type="button" onClick={() => startTimerOf("writing")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">✍️ 쓰기 타이머 시작</button>
                  <button type="button" onClick={() => { setIdleLogOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">📖 읽은 논문 기록</button>
                </>
              )}
              <div className="my-1 border-t" />
              <p className="px-2 pb-1 pt-0.5 text-center text-[10px] text-muted-foreground">끌어서 위치를 옮길 수 있어요</p>
              <button type="button" onClick={hideToday} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">🙈 오늘 하루 안 보기</button>
              <button type="button" onClick={turnOff} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">🔕 끄기 (설정에서 다시 켜기)</button>
            </div>
          )}
        </div>
      </div>

      {readingDone && (
        <ReadingLogModal open onClose={() => setReadingDone(null)} source={readingDone.source} refId={readingDone.refId} defaultTitle={readingDone.title} durationMin={readingDone.durationMin} />
      )}
      {idleLogOpen && <ReadingLogModal open onClose={() => setIdleLogOpen(false)} source="external" />}

      <style jsx>{`
        .owl-flame {
          background: radial-gradient(circle, rgba(251, 146, 60, 0.85) 0%, rgba(239, 68, 68, 0.6) 45%, transparent 72%);
          filter: blur(6px);
          animation: owl-flame-flicker 0.9s ease-in-out infinite;
        }
        @keyframes owl-flame-flicker {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.85; }
          50% { transform: translate(-50%, -52%) scale(1.12); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .owl-flame { animation: none; }
        }
      `}</style>
    </>
  );
}
