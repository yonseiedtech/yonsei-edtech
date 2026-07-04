"use client";

/**
 * 방학 모드 카드 v2 — 시간표 위젯의 종강(방학) 상태를 채우는 콘텐츠.
 * (대학원 특성상 계절학기 없음 — 방학 = 연구·복습 시즌으로 전환)
 *
 * 1) 개강 D-day 카운트다운 (관례 개강일: 1학기 3/1, 2학기 9/1)
 * 2) 방학 주간 연구 목표 게이지 — user.vacationWeeklyGoalHours vs 이번 주 타이머 합산
 * 3) 연구 타이머·암기카드 바로가기
 */

import Link from "next/link";
import { todayYmdKst, isoToKstYmd } from "@/lib/dday";
import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Timer, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/auth-store";
import { studySessionsApi, profilesApi, streakEventsApi } from "@/lib/bkend";
import type { StudySession } from "@/types";

function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 이번 주 월~일 범위 (로컬) */
function thisWeekRange(now: Date): { from: string; to: string } {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: ymdLocal(monday), to: ymdLocal(sunday) };
}

export default function VacationModeCard({
  semesterLabel,
  term,
  year,
}: {
  semesterLabel: string;
  /** 종강한 학기의 term — 다음 학기 개강일 계산에 사용 */
  term: "spring" | "fall";
  year: number;
}) {
  const { user } = useAuthStore();
  const uid = user?.id ?? "";

  // 다음 학기 관례 개강일: 1학기 종강 후 → 9/1, 2학기 종강 후 → 이듬해 3/1
  const nextStart = term === "spring" ? `${year}-09-01` : `${year + 1}-03-01`;
  const nextLabel = term === "spring" ? `${year}년 2학기` : `${year + 1}년 1학기`;
  const daysLeft = useMemo(() => {
    // P2(2026-07-04): UTC/로컬 Date 혼용 대신 YMD 문자열끼리 UTC epoch 로 비교 — 시간대 무관
    const [y, m, d] = nextStart.split("-").map(Number);
    const [ty, tm, td] = todayYmdKst().split("-").map(Number);
    return Math.max(0, Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000));
  }, [nextStart]);

  // 이번 주 연구 타이머 합산 (종료된 세션)
  const { data: sessions = [] } = useQuery({
    queryKey: ["vacation-week-sessions", uid],
    queryFn: async () => (await studySessionsApi.listByUser(uid)).data as StudySession[],
    enabled: !!uid,
    staleTime: 5 * 60_000,
  });
  const weekMinutes = useMemo(() => {
    const { from, to } = thisWeekRange(new Date());
    return sessions
      .filter((s) => s.endTime && isoToKstYmd(s.endTime) >= from && isoToKstYmd(s.endTime) <= to)
      .reduce((a, s) => a + (s.durationMinutes ?? 0), 0);
  }, [sessions]);

  // 주간 목표 (프로필 필드) — 로컬 오버라이드로 즉시 반영
  const profileGoal = typeof user?.vacationWeeklyGoalHours === "number" ? user.vacationWeeklyGoalHours : null;
  const [goalOverride, setGoalOverride] = useState<number | null>(null);
  const goalHours = goalOverride ?? profileGoal;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveGoal() {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < 1 || n > 80) {
      toast.error("1~80 사이 시간을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      await profilesApi.update(uid, { vacationWeeklyGoalHours: n });
      setGoalOverride(n);
      setEditing(false);
      toast.success(`주간 연구 목표를 ${n}시간으로 설정했습니다.`);
    } catch {
      toast.error("목표 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const pct = goalHours ? Math.min(100, Math.round((weekMinutes / (goalHours * 60)) * 100)) : 0;

  // RT-2(2026-07-04): 주간 목표 달성 보상 — 100% 도달 시 잔디 +5(주 시작일 멱등) + 연속 주 라벨
  const achieved = !!goalHours && weekMinutes >= goalHours * 60;
  const weekStart = thisWeekRange(new Date()).from;
  const awardedRef = useRef(false);
  useEffect(() => {
    if (!achieved || awardedRef.current || !uid) return;
    awardedRef.current = true;
    void streakEventsApi
      .add({ userId: uid, type: "vacation-goal-week", refId: weekStart, points: 5 })
      .catch(() => {});
  }, [achieved, uid, weekStart]);
  const { data: goalEvents = [] } = useQuery({
    queryKey: ["vacation-goal-weeks", uid],
    enabled: !!uid,
    staleTime: 5 * 60_000,
    queryFn: async () =>
      ((await streakEventsApi.listByUser(uid)).data as { type: string; refId: string }[]).filter(
        (e) => e.type === "vacation-goal-week",
      ),
  });
  const consecutiveWeeks = useMemo(() => {
    const weeks = new Set(goalEvents.map((e) => e.refId));
    if (achieved) weeks.add(weekStart);
    let n = 0;
    const cur = new Date(`${weekStart}T00:00:00`);
    while (weeks.has(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`)) {
      n += 1;
      cur.setDate(cur.getDate() - 7);
    }
    return n;
  }, [goalEvents, achieved, weekStart]);
  const weekH = Math.floor(weekMinutes / 60);
  const weekM = weekMinutes % 60;

  return (
    <div className="mt-4 rounded-2xl border border-dashed bg-muted/20 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{semesterLabel} 수업이 모두 종강했습니다 — 방학 모드</p>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          <CalendarClock size={13} />
          {nextLabel} 개강 D-{daysLeft}
        </span>
      </div>

      {/* 주간 연구 목표 게이지 */}
      <div className="mt-3 rounded-xl border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold">
            이번 주 연구 시간
            <span className="ml-1 font-normal text-muted-foreground">(월~일 · 종료된 타이머 세션 기준)</span>
          </p>
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setDraft(goalHours ? String(goalHours) : "10");
                setEditing(true);
              }}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            >
              {goalHours ? `목표 ${goalHours}시간 · 변경` : "주간 목표 설정"}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Input
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveGoal();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="h-8 w-16 text-xs"
                min={1}
                max={80}
              />
              <span className="text-xs text-muted-foreground">시간</span>
              <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={saveGoal}>
                저장
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
                취소
              </Button>
            </span>
          )}
        </div>
        <p className="mt-1.5 text-lg font-bold tabular-nums">
          {weekH > 0 ? `${weekH}시간 ${weekM}분` : `${weekM}분`}
          {goalHours ? (
            <span className="ml-1 text-xs font-medium text-muted-foreground">/ {goalHours}시간 ({pct}%)</span>
          ) : null}
        </p>
        {achieved && (
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            🎉 이번 주 목표 달성! 잔디 +5
            {consecutiveWeeks >= 2 && <span className="font-bold">· 🔥 {consecutiveWeeks}주 연속</span>}
          </p>
        )}
        {goalHours ? (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            주간 목표를 설정하면 방학 동안 매주 진행률이 여기에 표시됩니다.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/mypage/research?tab=report"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
        >
          <Timer size={13} />
          연구 타이머 시작
        </Link>
        <Link
          href="/flashcards"
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <Layers size={13} />
          암기카드 복습
        </Link>
      </div>
    </div>
  );
}
