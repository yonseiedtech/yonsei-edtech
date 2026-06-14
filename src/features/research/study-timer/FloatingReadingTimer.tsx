"use client";

/**
 * FloatingReadingTimer — 떠다니는 읽기 타이머 부엉이 (사용자 비전, 사이클 120)
 * 읽기 세션 동안 화면 여러 위치를 천천히 돌아다니며 말풍선에 경과 시간을 보여준다.
 * 부엉이를 누르면 계속/잠시 멈춤/그만 + 오늘 하루 안 보기/완전 끄기를 고를 수 있다.
 * 교대원 '주경야독' — 밤에 공부하는 부엉이가 곁에서 시간을 재 준다.
 * 거슬리는 사용자를 위해 X(오늘 숨김)·끄기(영구) 제공. 끄기는 마이페이지 설정에서 재활성.
 */

import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { X } from "lucide-react";
import { useStudyTimerStore } from "./study-timer-store";
import ReadingMascot from "./ReadingMascot";
import ReadingLogModal from "./ReadingLogModal";
import { todayYmdLocal } from "@/lib/dday";
import type { PaperReadingSource } from "@/types/paper-reading";

/** 부엉이가 머무는 자리들 — 본문 가림을 피해 가장자리 위주로 순회 */
const SPOTS: Array<React.CSSProperties> = [
  { left: 20, top: 96 },
  { right: 20, top: 130 },
  { right: 28, bottom: 150 },
  { left: 24, bottom: 130 },
  { left: 20, top: "45%" },
  { right: 20, top: "55%" },
];

const LS_OFF = "omcReadingOwlOff"; // 영구 끔
const LS_HIDE = "omcReadingOwlHideUntil"; // 오늘 하루 숨김(날짜 YMD)

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
  const pause = useStudyTimerStore((s) => s.pause);
  const resume = useStudyTimerStore((s) => s.resume);
  const stop = useStudyTimerStore((s) => s.stop);

  const [spotIdx, setSpotIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(true); // SSR 안전 — 마운트 후 판정
  const [readingDone, setReadingDone] = useState<{
    title: string;
    durationMin: number;
    source: PaperReadingSource;
    refId?: string;
  } | null>(null);

  // 마운트 후 숨김 여부 판정 (영구 끔 / 오늘 숨김)
  useEffect(() => {
    const off = localStorage.getItem(LS_OFF) === "true";
    const hideUntil = localStorage.getItem(LS_HIDE);
    setHidden(off || hideUntil === todayYmdLocal());
  }, []);

  const isReading = active?.type === "reading";

  // 천천히 자리 이동 (멈춤·메뉴·숨김 중에는 정지)
  useEffect(() => {
    if (!isReading || isPaused || menuOpen || hidden) return;
    const id = setInterval(() => {
      setSpotIdx((i) => (i + 1) % SPOTS.length);
    }, 16000);
    return () => clearInterval(id);
  }, [isReading, isPaused, menuOpen, hidden]);

  if (!isReading || !active || hidden) return null;

  function handleStop() {
    if (!active) return;
    setReadingDone({
      title: active.targetTitle,
      durationMin: Math.max(1, Math.round(elapsed / 60)),
      source: active.readingSource ?? "external",
      refId: active.readingRefId ?? active.paperId,
    });
    stop();
    setMenuOpen(false);
  }

  function hideToday() {
    localStorage.setItem(LS_HIDE, todayYmdLocal());
    setHidden(true);
    setMenuOpen(false);
  }

  function turnOff() {
    localStorage.setItem(LS_OFF, "true");
    setHidden(true);
    setMenuOpen(false);
  }

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
          {/* 말풍선 — 제목 + 경과 시간 + X(오늘 숨김) */}
          <div className="relative mb-1 max-w-[190px] rounded-2xl border bg-card px-3 py-1.5 pr-7 text-center shadow-lg">
            <p className="truncate text-[11px] text-muted-foreground">{active.targetTitle}</p>
            <p
              className={`font-mono text-sm font-bold tabular-nums ${
                isPaused ? "text-muted-foreground" : "text-teal-700"
              }`}
            >
              {fmt(elapsed)}
              {isPaused && <span className="ml-1 text-[10px] font-normal">잠시 멈춤</span>}
            </p>
            <button
              type="button"
              onClick={hideToday}
              className="absolute right-1.5 top-1.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
              aria-label="오늘 하루 숨기기"
              title="오늘 하루 숨기기"
            >
              <X size={13} />
            </button>
            {/* 말풍선 꼬리 */}
            <span className="absolute -bottom-[6px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r bg-card" />
          </div>

          {/* 부엉이 — 누르면 메뉴 */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl ring-2 ring-white transition-transform hover:scale-105 active:scale-95"
            aria-label="읽기 타이머 — 누르면 계속/멈춤/그만 선택"
          >
            <ReadingMascot isPaused={isPaused} size={38} />
          </button>

          {/* 선택 메뉴 */}
          {menuOpen && (
            <div className="absolute top-full mt-2 w-44 rounded-2xl border bg-card p-2 shadow-2xl">
              <p className="px-2 pb-1.5 pt-0.5 text-center text-[11px] font-medium text-muted-foreground">
                지금 읽기를…
              </p>
              {isPaused ? (
                <button
                  type="button"
                  onClick={() => { resume(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                >
                  ▶️ 계속 읽기
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { pause(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                >
                  ⏸️ 잠시 멈춤
                </button>
              )}
              <button
                type="button"
                onClick={handleStop}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
              >
                ⏹️ 그만 읽기
              </button>
              <div className="my-1 border-t" />
              <button
                type="button"
                onClick={hideToday}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              >
                🙈 오늘 하루 안 보기
              </button>
              <button
                type="button"
                onClick={turnOff}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              >
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
    </>
  );
}
