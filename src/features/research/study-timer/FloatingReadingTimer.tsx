"use client";

/**
 * FloatingReadingTimer — 드래그 가능한 학습 부엉이 (사이클 120·122·123·125·126)
 * 상시 동반(로그인 한정). 사용자가 끌어 위치 이동(자동 순간이동 없음). 네이비 원형 배경.
 * - 평소(idle): 격려 + 메뉴(읽기/쓰기 타이머 켜기 · 읽은 논문 기록 · 끄기)
 * - 읽는/쓰는 중: 부엉이 뒤 빨간 집중 불꽃 + 말풍선 경과 시간 + 계속/멈춤/그만
 * - 끄기/X: 바로 사라지지 않고 "오늘 하루 안 보기 / 접속 동안 끄기" 2선택 안내.
 *
 * 상태 구분
 * - 오늘 안 보기: LS_HIDE(날짜 문자열) — 다음날 자동 복귀
 * - 접속 동안 끄기: SS_OFF(sessionStorage) — 다음 접속 시 자동 복귀
 * - 영구 끄기: LS_OFF(localStorage) — 마이페이지 설정 토글로만 복구
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

const LS_OFF = "omcReadingOwlOff"; // 영구 끄기 (설정 토글) — 별칭 yedu_owl_disabled
const LS_HIDE = "omcReadingOwlHideUntil"; // 오늘 하루 안 보기 (날짜)
const SS_OFF = "omcReadingOwlSessionOff"; // 접속 동안 끄기 (sessionStorage)
const LS_POS = "omcReadingOwlPos";
const OWL_OFF_EVENT = "omc-reading-owl-changed"; // 설정 토글 ↔ 부엉이 동기화
const OWL_SIZE = 56;
const BUBBLE_EST_H = 150; // 말풍선/끄기 패널 펼침 시 아래로 필요한 예상 높이
const MENU_EST_H = 230; // idle 메뉴 펼침 시 아래로 필요한 예상 높이

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
  const [offChoiceOpen, setOffChoiceOpen] = useState(false); // 끄기/X 후 2선택 안내 패널
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

  const refreshHidden = useCallback(() => {
    const off = localStorage.getItem(LS_OFF) === "true";
    const sessionOff = sessionStorage.getItem(SS_OFF) === "true";
    const hideUntil = localStorage.getItem(LS_HIDE);
    // QA-v3: UTC 날짜는 KST 오전 9시에 하루가 갱신됨 — 로컬 날짜로
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setHidden(off || sessionOff || hideUntil === today);
  }, []);

  useEffect(() => {
    refreshHidden();
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
    // 설정 토글(같은 탭) + 다른 탭 storage 이벤트 모두 반영해 즉시 다시 켜기/끄기
    const onChange = () => refreshHidden();
    window.addEventListener(OWL_OFF_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(OWL_OFF_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refreshHidden]);

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

  /**
   * 메뉴/패널을 열 때 아래로 펼쳐지는 콘텐츠가 화면 밖으로 잘리면
   * 부엉이를 안쪽(위/왼쪽)으로 부드럽게 이동시켜 보이게 한다.
   * pos 가 null(기본 우하단 고정) 인 경우엔 명시 좌표로 전환 후 보정.
   */
  const ensurePanelVisible = useCallback(
    (neededBelow: number) => {
      if (typeof window === "undefined") return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // 현재 좌표(기본값 우하단 right:24 bottom:96 → 좌표 환산)
      const cur = pos ?? { x: vw - OWL_SIZE - 24, y: vh - OWL_SIZE - 96 };
      let nextX = cur.x;
      let nextY = cur.y;
      // 아래 공간 부족 → 위로 끌어올림
      const bottomNeeded = cur.y + OWL_SIZE + neededBelow + 8;
      if (bottomNeeded > vh) nextY = clamp(vh - OWL_SIZE - neededBelow - 8, 8, vh - OWL_SIZE);
      // 우측 잘림 방지: 패널 폭(약 192px)의 절반이 부엉이 중심 기준 오른쪽으로 나가면 왼쪽으로
      const halfPanel = 100;
      if (cur.x + OWL_SIZE / 2 + halfPanel > vw) nextX = clamp(vw - OWL_SIZE / 2 - halfPanel, 8, vw - OWL_SIZE);
      if (cur.x + OWL_SIZE / 2 - halfPanel < 0) nextX = clamp(halfPanel - OWL_SIZE / 2, 8, vw - OWL_SIZE);
      if (nextX !== cur.x || nextY !== cur.y) {
        const np = { x: nextX, y: nextY };
        setPos(np);
        try {
          localStorage.setItem(LS_POS, JSON.stringify(np));
        } catch {
          /* noop */
        }
      }
    },
    [pos],
  );

  const onOwlClick = useCallback(() => {
    if (moved.current) return;
    setOffChoiceOpen(false);
    setMenuOpen((v) => {
      const next = !v;
      if (next) ensurePanelVisible(isActiveTimer ? BUBBLE_EST_H + 70 : MENU_EST_H);
      return next;
    });
  }, [ensurePanelVisible, isActiveTimer]);

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
      toast.success(`「${title}」 타이머를 시작했습니다.`);
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
      toast.success(`「${active.targetTitle}」 글쓰기 ${min}분을 기록했습니다.`);
    }
    stop();
    setMenuOpen(false);
  }

  /** 끄기/X 버튼 → 바로 숨기지 않고 2선택 안내 패널을 연다. */
  function openOffChoice() {
    setMenuOpen(false);
    setOffChoiceOpen(true);
    ensurePanelVisible(BUBBLE_EST_H);
  }

  function hideToday() {
    localStorage.setItem(LS_HIDE, new Date().toISOString().slice(0, 10));
    setOffChoiceOpen(false);
    setHidden(true);
    toast("오늘 하루 부엉이를 숨겼습니다.", {
      description: "내일 다시 자동으로 찾아와요. 계속 끄려면 마이페이지 설정 → 읽기 타이머에서 꺼주세요.",
    });
  }

  function hideSession() {
    sessionStorage.setItem(SS_OFF, "true");
    setOffChoiceOpen(false);
    setHidden(true);
    toast("이번 접속 동안 부엉이를 숨겼습니다.", {
      description: "브라우저를 다시 열면 자동으로 돌아와요. 계속 끄려면 마이페이지 설정 → 읽기 타이머에서 꺼주세요.",
    });
  }

  const posStyle: React.CSSProperties = pos ? { left: pos.x, top: pos.y } : { right: 24, bottom: 96 };
  const actLabel = isReading ? "읽는 중" : "쓰는 중";

  return (
    <>
      <div className="fixed z-40 transition-all duration-300 ease-out print:hidden" style={posStyle}>
        <div className="relative flex flex-col items-center">
          {/* 말풍선 */}
          <div className="relative mb-1 max-w-[200px] rounded-2xl border bg-card px-3 py-1.5 pr-7 text-center shadow-lg">
            {offChoiceOpen ? (
              <div className="py-0.5 text-left">
                <p className="mb-1.5 text-center text-[11px] font-medium text-indigo-900 dark:text-indigo-200">
                  부엉이를 어떻게 끌까요?
                </p>
                <button
                  type="button"
                  onClick={hideToday}
                  className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  🙈 <span className="flex-1">오늘 하루 안 보기<span className="block text-[10px] text-muted-foreground">내일 자동 복귀</span></span>
                </button>
                <button
                  type="button"
                  onClick={hideSession}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  💤 <span className="flex-1">접속해 있는 동안 끄기<span className="block text-[10px] text-muted-foreground">다음 접속 시 자동 복귀</span></span>
                </button>
                <p className="mt-1.5 px-1 text-center text-[10px] leading-tight text-muted-foreground">
                  완전히 끄려면 마이페이지 설정 → 읽기 타이머
                </p>
              </div>
            ) : isActiveTimer && active ? (
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
            <button
              type="button"
              onClick={offChoiceOpen ? () => setOffChoiceOpen(false) : openOffChoice}
              className="absolute right-1.5 top-1.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
              aria-label={offChoiceOpen ? "닫기" : "부엉이 끄기"}
              title={offChoiceOpen ? "닫기" : "부엉이 끄기"}
            >
              <X size={13} />
            </button>
            <span className="absolute -bottom-[6px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r bg-card" />
          </div>

          {/* 부엉이 + 집중 불꽃 (네이비 원 안에서 타오름) */}
          <div className="relative">
            <button
              type="button"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onClick={onOwlClick}
              className="relative flex h-14 w-14 touch-none cursor-grab items-center justify-center overflow-hidden rounded-full text-white shadow-xl ring-2 ring-white/70 transition-transform hover:scale-105 active:scale-95 active:cursor-grabbing"
              style={{ background: "linear-gradient(135deg,#1e3a8a,#0f172a)" }}
              aria-label="학습 부엉이 — 끌어서 이동, 눌러서 메뉴"
            >
              {focusing && (
                <span aria-hidden className="owl-flame pointer-events-none absolute inset-0 rounded-full" />
              )}
              <span className="relative z-10">
                <ReadingMascot isPaused={isActiveTimer && isPaused} size={38} />
              </span>
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
              <p className="px-2 pb-1 pt-0.5 text-center text-[10px] text-muted-foreground">끌어서 위치 이동 · 끄려면 말풍선 우측 상단 ✕</p>
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
          background: radial-gradient(circle at 50% 62%, rgba(251, 191, 36, 0.95) 0%, rgba(249, 115, 22, 0.7) 38%, rgba(239, 68, 68, 0.4) 60%, transparent 78%);
          filter: blur(3px);
          animation: owl-flame-flicker 0.85s ease-in-out infinite;
        }
        @keyframes owl-flame-flicker {
          0%, 100% { transform: scale(0.94) translateY(1px); opacity: 0.82; }
          50% { transform: scale(1.06) translateY(-1px); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .owl-flame { animation: none; }
        }
      `}</style>
    </>
  );
}
