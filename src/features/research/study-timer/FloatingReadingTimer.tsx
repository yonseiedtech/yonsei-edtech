"use client";

/**
 * FloatingReadingTimer — 떠다니는 학습 부엉이 (사용자 비전, 사이클 120·122·123)
 * 사이트 접속 동안 화면 가장자리를 천천히 돌아다니는 상시 동반 위젯(로그인 한정).
 * - 평소(idle): 격려 말풍선 + 클릭 시 바로 읽기 기록 / 숨김
 * - 읽는 중(reading): 경과 시간 + 계속/잠시 멈춤/그만 → 읽음 기록 모달
 * - 쓰는 중(writing): 경과 시간 + 계속/잠시 멈춤/그만 → 작성 시간 기록(toast)
 * 교대원 '주경야독' — 밤에 읽고 쓰는 부엉이가 곁을 지킨다.
 * 거슬리면 X(오늘 하루 숨김) 또는 끄기(영구, 마이페이지에서 재활성).
 */

import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useStudyTimerStore } from "./study-timer-store";
import { useAuthStore } from "@/features/auth/auth-store";
import ReadingMascot from "./ReadingMascot";
import ReadingLogModal from "./ReadingLogModal";
import type { PaperReadingSource } from "@/types/paper-reading";

const SPOTS: Array<React.CSSProperties> = [
  { left: 20, top: 96 },
  { right: 20, top: 130 },
  { right: 28, bottom: 150 },
  { left: 24, bottom: 130 },
  { left: 20, top: "45%" },
  { right: 20, top: "55%" },
];

const LS_OFF = "omcReadingOwlOff";
const LS_HIDE = "omcReadingOwlHideUntil";

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

const IDLE_BUBBLES = [
  "오늘도 한 편 읽거나 써볼까요? 📖",
  "주경야독, 함께 가요 🦉",
  "논문 읽기·쓰기, 곁에서 잴게요 ✍️",
];

export default function FloatingReadingTimer() {
  const { active, elapsed, isPaused } = useStudyTimerStore(
    useShallow((s) => ({ active: s.active, elapsed: s.elapsed, isPaused: s.isPaused })),
  );
  const pause = useStudyTimerStore((s) => s.pause);
  const resume = useStudyTimerStore((s) => s.resume);
  const stop = useStudyTimerStore((s) => s.stop);
  const { user } = useAuthStore();

  const [spotIdx, setSpotIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [idleLogOpen, setIdleLogOpen] = useState(false);
  const [readingDone, setReadingDone] = useState<{
    title: string;
    durationMin: number;
    source: PaperReadingSource;
    refId?: string;
  } | null>(null);

  useEffect(() => {
    const off = localStorage.getItem(LS_OFF) === "true";
    const hideUntil = localStorage.getItem(LS_HIDE);
    const today = new Date().toISOString().slice(0, 10);
    setHidden(off || hideUntil === today);
  }, []);

  const timerType = active?.type; // "reading" | "writing" | undefined
  const isReading = timerType === "reading";
  const isWriting = timerType === "writing";
  const isActiveTimer = isReading || isWriting;

  // 천천히 자리 이동 (멈춤·메뉴·숨김·모달 중에는 정지)
  useEffect(() => {
    if (hidden || menuOpen || idleLogOpen || (isActiveTimer && isPaused)) return;
    const id = setInterval(() => setSpotIdx((i) => (i + 1) % SPOTS.length), 16000);
    return () => clearInterval(id);
  }, [hidden, menuOpen, idleLogOpen, isActiveTimer, isPaused]);

  if (hidden || !user) return null;

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

  const idleBubble = IDLE_BUBBLES[spotIdx % IDLE_BUBBLES.length];
  const actLabel = isReading ? "읽는 중" : "쓰는 중";
  const actAccent = isReading ? "text-teal-700" : "text-blue-700";

  return (
    <>
      <div
        className="fixed z-40 print:hidden"
        style={{
          ...SPOTS[spotIdx],
          transition:
            "left 1.8s ease-in-out, right 1.8s ease-in-out, top 1.8s ease-in-out, bottom 1.8s ease-in-out",
        }}
      >
        <div className="relative flex flex-col items-center">
          {/* 말풍선 — 읽기/쓰기 중이면 제목+시간, 평소엔 격려 */}
          <div className="relative mb-1 max-w-[190px] rounded-2xl border bg-card px-3 py-1.5 pr-7 text-center shadow-lg">
            {isActiveTimer && active ? (
              <>
                <p className="truncate text-[11px] text-muted-foreground">
                  <span className="mr-1 font-medium">{actLabel}</span>
                  {active.targetTitle}
                </p>
                <p
                  className={`font-mono text-sm font-bold tabular-nums ${
                    isPaused ? "text-muted-foreground" : actAccent
                  }`}
                >
                  {fmt(elapsed)}
                  {isPaused && <span className="ml-1 text-[10px] font-normal">잠시 멈춤</span>}
                </p>
              </>
            ) : (
              <p className="text-xs font-medium text-teal-800 dark:text-teal-200">{idleBubble}</p>
            )}
            <button
              type="button"
              onClick={hideToday}
              className="absolute right-1.5 top-1.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
              aria-label="오늘 하루 숨기기"
              title="오늘 하루 숨기기"
            >
              <X size={13} />
            </button>
            <span className="absolute -bottom-[6px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r bg-card" />
          </div>

          {/* 부엉이 */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl ring-2 ring-white transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: isWriting ? "#1e40af" : "var(--primary, #0f766e)" }}
            aria-label="학습 부엉이 — 메뉴 열기"
          >
            <ReadingMascot isPaused={isActiveTimer && isPaused} size={38} />
          </button>

          {/* 메뉴 — 읽기/쓰기 중 / 평소 분기 */}
          {menuOpen && (
            <div className="absolute top-full mt-2 w-44 rounded-2xl border bg-card p-2 shadow-2xl">
              {isActiveTimer ? (
                <>
                  <p className="px-2 pb-1.5 pt-0.5 text-center text-[11px] font-medium text-muted-foreground">
                    지금 {isReading ? "읽기를" : "쓰기를"}…
                  </p>
                  {isPaused ? (
                    <button type="button" onClick={() => { resume(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">
                      ▶️ 계속하기
                    </button>
                  ) : (
                    <button type="button" onClick={() => { pause(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">
                      ⏸️ 잠시 멈춤
                    </button>
                  )}
                  <button type="button" onClick={handleStop} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
                    ⏹️ {isReading ? "그만 읽기" : "그만 쓰기"}
                  </button>
                </>
              ) : (
                <>
                  <p className="px-2 pb-1.5 pt-0.5 text-center text-[11px] font-medium text-muted-foreground">
                    무엇을 할까요?
                  </p>
                  <button type="button" onClick={() => { setIdleLogOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">
                    📖 읽은 논문 기록
                  </button>
                </>
              )}
              <div className="my-1 border-t" />
              <button type="button" onClick={hideToday} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
                🙈 오늘 하루 안 보기
              </button>
              <button type="button" onClick={turnOff} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
                🔕 끄기 (설정에서 다시 켜기)
              </button>
            </div>
          )}
        </div>
      </div>

      {readingDone && (
        <ReadingLogModal
          open
          onClose={() => setReadingDone(null)}
          source={readingDone.source}
          refId={readingDone.refId}
          defaultTitle={readingDone.title}
          durationMin={readingDone.durationMin}
        />
      )}
      {idleLogOpen && (
        <ReadingLogModal open onClose={() => setIdleLogOpen(false)} source="external" />
      )}
    </>
  );
}
