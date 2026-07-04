"use client";

/**
 * 개강 재활성화 배너 (C-1, 2026-07-04 구축 · 개강 주간 자동 노출)
 *
 * 실사용 진단: 방학 중 활동 정체 + 신규 기능 미노출 — 개강 주간(개강 D-7 ~ D+14)에만
 * 대시보드 상단에 자동으로 떠서 ①시간표 등록 ②새 기능 ③세미나 일정으로 유도한다.
 * 학기 시작일은 관례(3/1·9/1) 기준 KST 판정. per-user·학기별 dismiss.
 */

import Link from "next/link";
import { useState } from "react";
import { X, CalendarRange, Sparkles, BookOpen } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { todayYmdKst } from "@/lib/dday";

/** 오늘(KST)이 속한 개강 윈도(D-7~D+14)의 학기 키 — 밖이면 null */
function activeKickoffSemester(): { key: string; label: string } | null {
  const today = todayYmdKst();
  const [y] = today.split("-").map(Number);
  const candidates = [
    { start: `${y}-03-01`, key: `${y}-1`, label: `${y}년 1학기` },
    { start: `${y}-09-01`, key: `${y}-2`, label: `${y}년 2학기` },
    { start: `${y + 1}-03-01`, key: `${y + 1}-1`, label: `${y + 1}년 1학기` },
  ];
  for (const c of candidates) {
    const [sy, sm, sd] = c.start.split("-").map(Number);
    const startMs = Date.UTC(sy, sm - 1, sd);
    const [ty, tm, td] = today.split("-").map(Number);
    const todayMs = Date.UTC(ty, tm - 1, td);
    const diff = (todayMs - startMs) / 86400000;
    if (diff >= -7 && diff <= 14) return { key: c.key, label: c.label };
  }
  return null;
}

export default function SemesterKickoffBanner() {
  const { user } = useAuthStore();
  const [tick, setTick] = useState(0);
  const sem = activeKickoffSemester();
  if (!user || !sem) return null;

  const dismissKey = `yedu_kickoff_dismissed_${sem.key}.${user.id}`;
  let dismissed = false;
  if (typeof window !== "undefined") {
    try {
      dismissed = window.localStorage.getItem(dismissKey) === "1";
    } catch {
      dismissed = false;
    }
  }
  void tick;
  if (dismissed) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(dismissKey, "1");
    } catch {
      /* 무시 */
    }
    setTick((t) => t + 1);
  }

  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-sky-500/5 to-primary/5 p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="개강 배너 닫기"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted"
      >
        <X size={14} />
      </button>
      <p className="text-sm font-bold">🎓 {sem.label}, 다시 시작해볼까요?</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        방학 동안 논문 도구가 크게 업그레이드됐어요 — 시간표를 등록하면 대시보드가 새 학기 모드로 바뀝니다.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-card px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <CalendarRange size={12} /> 수강과목 등록
        </Link>
        <Link
          href="/whats-new"
          className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-card px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Sparkles size={12} /> 새 기능 보기
        </Link>
        <Link
          href="/seminars"
          className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-card px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <BookOpen size={12} /> 이번 학기 세미나
        </Link>
      </div>
    </div>
  );
}
