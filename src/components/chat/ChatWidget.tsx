"use client";

import { useState, useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { MessageCircle, Loader2, Pause, Play, Square, BookOpen, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useStudyTimerStore } from "@/features/research/study-timer/study-timer-store";
import { useEndSession, useCreateManualSession } from "@/features/research/study-timer/useStudySessions";
import { cn } from "@/lib/utils";

const ChatPanel = lazy(() => import("./ChatPanel"));

const STORAGE_KEY = "chat-widget-pos";
const BTN_SIZE = 56;
const RING_RADIUS = 26;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;
/** 진행링 한 바퀴 = 25분 (포모도로 1세션) */
const RING_PERIOD_SEC = 25 * 60;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function loadPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [pillExpanded, setPillExpanded] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const moved = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const restoredRef = useRef(false);

  // ───── Timer integration ─────
  const {
    active,
    elapsed,
    isPaused,
    ghost,
    pause,
    resume,
    stop,
    tick,
    restore,
    acknowledgeGhost,
    setStopHandler,
  } = useStudyTimerStore();
  const endSession = useEndSession();
  const createManualSession = useCreateManualSession();

  // 종료 핸들러 등록 (store → API)
  useEffect(() => {
    setStopHandler((session) => {
      endSession.mutate({ sessionId: session.id });
    });
    return () => setStopHandler(null);
  }, [setStopHandler, endSession]);

  // 위치 복원
  useEffect(() => {
    const saved = loadPosition();
    if (saved) {
      setPos({
        x: clamp(saved.x, 0, window.innerWidth - BTN_SIZE),
        y: clamp(saved.y, 0, window.innerHeight - BTN_SIZE),
      });
    }
  }, []);

  // 타이머 세션 복원 (1회)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    restore();
  }, [restore]);

  // 활성 세션이 있고 일시정지 아니면 1초 tick
  useEffect(() => {
    if (!active || isPaused) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, isPaused, tick]);

  // Ghost 세션 안내 (4시간 초과 자동 폐기 알림)
  useEffect(() => {
    if (!ghost) return;
    const startedAt = new Date(ghost.startTime).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    toast.info(`이전 세션이 4시간 넘게 켜져 있었어요`, {
      description: `「${ghost.targetTitle}」 ${startedAt} 시작 — 자동 폐기되었습니다.`,
      action: {
        label: "수동 입력",
        onClick: () => {
          // 빠른 수기 입력: 시작~지금까지를 1시간으로 보정 입력 가능하도록 대시보드로 이동 (간단 버전)
          // V1에서는 단순 acknowledge로만 처리
          acknowledgeGhost();
          toast.message("수기 입력은 마이페이지 → 연구 통계에서 가능합니다");
        },
      },
      onDismiss: () => acknowledgeGhost(),
      onAutoClose: () => acknowledgeGhost(),
      duration: 8000,
    });
  }, [ghost, acknowledgeGhost, createManualSession]);

  // ───── Drag handlers ─────
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
    const nx = clamp(dragStart.current.px + dx, 0, window.innerWidth - BTN_SIZE);
    const ny = clamp(dragStart.current.py + dy, 0, window.innerHeight - BTN_SIZE);
    setPos({ x: nx, y: ny });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    if (moved.current && pos) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
    }
  }, [pos]);

  const handleClick = useCallback(() => {
    if (!moved.current) setOpen(true);
  }, []);

  const defaultStyle = pos
    ? { left: pos.x, top: pos.y, right: "auto" as const, bottom: "auto" as const }
    : { right: 24, bottom: 24 };

  // 진행링 dasharray (25분 1cycle)
  const progress = active ? (elapsed % RING_PERIOD_SEC) / RING_PERIOD_SEC : 0;
  const dashOffset = RING_CIRC * (1 - progress);
  const cycleCount = active ? Math.floor(elapsed / RING_PERIOD_SEC) : 0;

  // pill 위치: 버튼 좌측 (오른쪽 가장자리에 가까울 때) 또는 우측
  const pillOnLeft =
    pos === null
      ? true // 기본 위치(우측 하단)면 좌측에 pill
      : pos.x > window.innerWidth / 2;

  return (
    <>
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50"
          style={
            pos
              ? {
                  left: clamp(pos.x - 340, 8, window.innerWidth - 400),
                  top: clamp(pos.y - 420, 8, window.innerHeight - 460),
                }
              : undefined
          }
        >
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Suspense
                fallback={
                  <div className="flex h-[400px] w-96 items-center justify-center rounded-2xl border bg-background shadow-2xl">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <ChatPanel onClose={() => setOpen(false)} />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {!open && (
        <div
          className="fixed z-50 print:hidden"
          style={defaultStyle}
          onMouseEnter={() => active && setPillExpanded(true)}
          onMouseLeave={() => setPillExpanded(false)}
        >
          <div className="relative flex items-center" style={{ width: BTN_SIZE, height: BTN_SIZE }}>
            {/* Mini pill: 좌측 또는 우측에 펼쳐짐 */}
            <AnimatePresence>
              {active && pillExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: pillOnLeft ? 10 : -10, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: pillOnLeft ? 10 : -10, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-white shadow-xl",
                    active.type === "reading" ? "bg-primary" : "bg-blue-800",
                    pillOnLeft ? "right-full mr-2" : "left-full ml-2",
                  )}
                  style={{ maxWidth: 280 }}
                >
                  {active.type === "reading" ? (
                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Pencil className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="max-w-[120px] truncate text-xs font-medium">
                    {active.targetTitle}
                  </span>
                  <span className={cn("font-mono text-xs tabular-nums", isPaused && "animate-pulse opacity-60")}>
                    {fmt(elapsed)}
                  </span>
                  {isPaused ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); resume(); }}
                      className="rounded-full p-1 hover:bg-white/20"
                      aria-label="계속하기"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); pause(); }}
                      className="rounded-full p-1 hover:bg-white/20"
                      aria-label="일시정지"
                    >
                      <Pause className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      stop();
                      toast.success(`「${active.targetTitle}」 ${fmt(elapsed)} 기록됨`);
                    }}
                    className="rounded-full bg-white/20 p-1 hover:bg-white/30"
                    aria-label="종료"
                  >
                    <Square className="h-3 w-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 메인 버튼 (챗봇) */}
            <motion.button
              ref={btnRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onClick={handleClick}
              className={cn(
                "relative flex h-14 w-14 touch-none items-center justify-center rounded-full text-primary-foreground shadow-lg hover:shadow-xl",
                active
                  ? active.type === "reading"
                    ? "bg-primary"
                    : "bg-blue-800"
                  : "bg-primary",
              )}
              whileHover={{ scale: 1.05 }}
              aria-label={active ? `타이머 진행 중 ${fmt(elapsed)} - 챗봇 열기` : "연교공 챗봇 열기"}
            >
              {/* 진행링 SVG */}
              {active && (
                <svg
                  className="absolute inset-0 -rotate-90"
                  width={BTN_SIZE}
                  height={BTN_SIZE}
                  viewBox={`0 0 ${BTN_SIZE} ${BTN_SIZE}`}
                  aria-hidden
                >
                  <circle
                    cx={BTN_SIZE / 2}
                    cy={BTN_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={3}
                  />
                  <circle
                    cx={BTN_SIZE / 2}
                    cy={BTN_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    stroke="white"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRC}
                    strokeDashoffset={dashOffset}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
              )}
              <MessageCircle className={cn("h-6 w-6 relative z-10", isPaused && "animate-pulse opacity-70")} />
              {/* 누적 cycle 배지 (포모도로 ●) */}
              {active && cycleCount > 0 && (
                <span className="absolute -top-1 -right-1 z-20 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow">
                  {cycleCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      )}
    </>
  );
}
