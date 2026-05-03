"use client";

/**
 * 학습 스트릭 / 잔디밭 — Sprint 56
 *
 * MyPage 홈 상단에 GitHub 스타일 365일 활동 그리드 노출.
 * 가중치 점수(일별 합산):
 *  - 세미나 출석(checkedIn=true)  : +10
 *  - 강의 후기 작성              : +5
 *  - 게시글 작성                 : +5
 *  - 학습 타이머 ≥30분 세션      : +3
 *  - 댓글 작성                   : +1
 *
 * 표시:
 *  - 53주 × 7일 그리드 (오늘로부터 365일 전까지)
 *  - 강도 5단계 컬러 (0 / 1-5 / 6-10 / 11-20 / 21+)
 *  - 누적 점수 / 활동일수 / 주 단위 streak / 마일스톤 배지
 *  - 신규 달성한 마일스톤은 sessionStorage 게이트로 1회 토스트
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, Trophy, Sprout, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  attendeesApi,
  studySessionsApi,
  dataApi,
} from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import type {
  SeminarAttendee,
  StudySession,
  Post,
  CourseReview,
  Comment,
} from "@/types";
import { cn } from "@/lib/utils";

const WEEKS = 53;
const DAYS_PER_WEEK = 7;
const TOTAL_DAYS = WEEKS * DAYS_PER_WEEK; // 371

const MILESTONE_KEY = "mypage.learningStreak.milestonesShown";

const SCORES = {
  attendance: 10,
  courseReview: 5,
  post: 5,
  timer30: 3,
  comment: 1,
} as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** ISO datetime → 로컬 YYYY-MM-DD */
function isoToYmdLocal(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return ymdLocal(d);
}

interface DayCell {
  ymd: string;
  date: Date;
  score: number;
  /** ISO 주 번호 (그리드 컬럼) */
  weekIndex: number;
  /** 0=일 ~ 6=토 (그리드 행) */
  weekday: number;
}

/** 색상 단계 */
function intensityClass(score: number): string {
  if (score <= 0) return "bg-muted/40";
  if (score < 6) return "bg-emerald-200";
  if (score < 11) return "bg-emerald-400";
  if (score < 21) return "bg-emerald-500";
  return "bg-emerald-700";
}

function getMilestonesShown(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(`${MILESTONE_KEY}.${userId}`);
    if (!raw) return new Set();
    const list = JSON.parse(raw) as string[];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

function setMilestonesShown(userId: string, set: Set<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    `${MILESTONE_KEY}.${userId}`,
    JSON.stringify(Array.from(set)),
  );
}

interface Stats {
  totalScore: number;
  activeDays: number;
  weekStreak: number;
  thisMonthCount: number;
  cells: DayCell[];
  weeklyActive: boolean[]; // length 53
}

// ─── Sprint 64: 학기 기반 그리드 + 연도 스크롤 ─────────────────────────────
type Semester = { year: number; half: 1 | 2 };

function currentSemester(now: Date = new Date()): Semester {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m >= 3 && m <= 8) return { year: y, half: 1 };
  if (m >= 9) return { year: y, half: 2 };
  // Jan/Feb → 작년 후기
  return { year: y - 1, half: 2 };
}

function semesterStartDate(s: Semester): Date {
  // 전기: 3월 1일 / 후기: 9월 1일
  return s.half === 1 ? new Date(s.year, 2, 1) : new Date(s.year, 8, 1);
}

function semesterPrev(s: Semester): Semester {
  if (s.half === 1) return { year: s.year - 1, half: 2 };
  return { year: s.year, half: 1 };
}

function semesterNext(s: Semester): Semester {
  if (s.half === 1) return { year: s.year, half: 2 };
  return { year: s.year + 1, half: 1 };
}

function semesterCmp(a: Semester, b: Semester): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.half - b.half;
}

function semesterLabel(s: Semester): string {
  return `${s.year}년 ${s.half === 1 ? "전기 (3월~)" : "후기 (9월~)"}`;
}

function computeStats(scoresByDay: Map<string, number>, semester: Semester): Stats {
  const cells: DayCell[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayYmd = ymdLocal(today);

  // 학기 시작일을 포함하는 주의 일요일을 그리드 시작으로
  const semStart = semesterStartDate(semester);
  const start = new Date(semStart);
  const startDow = start.getDay(); // 0=일
  start.setDate(start.getDate() - startDow);

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const ymd = ymdLocal(d);
    const score = scoresByDay.get(ymd) ?? 0;
    cells.push({
      ymd,
      date: d,
      score,
      weekIndex: Math.floor(i / DAYS_PER_WEEK),
      weekday: i % DAYS_PER_WEEK, // 0=일 (start 가 일요일)
    });
  }

  // 미래 일자(오늘 이후) 는 score=0 강제
  for (const c of cells) {
    if (c.ymd > todayYmd) c.score = 0;
  }

  // 통계 (해당 학기 안 + 오늘 이전만)
  let totalScore = 0;
  let activeDays = 0;
  for (const c of cells) {
    if (c.ymd > todayYmd) continue;
    totalScore += c.score;
    if (c.score > 0) activeDays++;
  }

  // 이번 달 (오늘이 그리드 안에 있는 경우만 의미)
  const thisMonth = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`;
  let thisMonthCount = 0;
  for (const c of cells) {
    if (c.score > 0 && c.ymd.startsWith(thisMonth)) thisMonthCount++;
  }

  // 주 단위 streak (오늘이 속한 주부터 과거로 — 그리드가 현재 학기일 때만 의미)
  const weeklyActive: boolean[] = new Array(WEEKS).fill(false);
  for (const c of cells) {
    if (c.score > 0 && c.ymd <= todayYmd) {
      weeklyActive[c.weekIndex] = true;
    }
  }
  let weekStreak = 0;
  for (let w = WEEKS - 1; w >= 0; w--) {
    if (weeklyActive[w]) weekStreak++;
    else break;
  }

  return { totalScore, activeDays, weekStreak, thisMonthCount, cells, weeklyActive };
}

interface Milestone {
  id: string;
  label: string;
  description: string;
  Icon: typeof Trophy;
  achieved: (s: Stats) => boolean;
}

const MILESTONES: Milestone[] = [
  {
    id: "first-day",
    label: "첫 활동 🎉",
    description: "잔디 한 칸을 채웠어요!",
    Icon: Sprout,
    achieved: (s) => s.activeDays >= 1,
  },
  {
    id: "month-10",
    label: "이번 달 10일 활동",
    description: "이번 달 활동 일수 10일 돌파",
    Icon: Trophy,
    achieved: (s) => s.thisMonthCount >= 10,
  },
  {
    id: "streak-2",
    label: "2주 연속 🔥",
    description: "주 단위 streak 2주 달성",
    Icon: Flame,
    achieved: (s) => s.weekStreak >= 2,
  },
  {
    id: "streak-5",
    label: "5주 연속 🔥",
    description: "주 단위 streak 5주 달성",
    Icon: Flame,
    achieved: (s) => s.weekStreak >= 5,
  },
  {
    id: "streak-12",
    label: "12주 연속 🔥",
    description: "한 학기 streak 달성",
    Icon: Flame,
    achieved: (s) => s.weekStreak >= 12,
  },
  {
    id: "score-100",
    label: "누적 100점",
    description: "365일 누적 100점 돌파",
    Icon: Trophy,
    achieved: (s) => s.totalScore >= 100,
  },
  {
    id: "score-500",
    label: "누적 500점",
    description: "365일 누적 500점 돌파",
    Icon: Trophy,
    achieved: (s) => s.totalScore >= 500,
  },
];

const MONTH_LABELS_KR = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default function LearningStreak() {
  const { user } = useAuthStore();
  const userId = user?.id;

  // Sprint 64: 학기 기반 그리드 + 좌·우 스크롤 + 입학시점 가드
  const cur = useMemo(() => currentSemester(), []);
  const [semester, setSemester] = useState<Semester>(cur);

  const minSemester: Semester | null = useMemo(() => {
    if (!user?.enrollmentYear) return null;
    const half: 1 | 2 = user.enrollmentHalf === 2 ? 2 : 1;
    return { year: user.enrollmentYear, half };
  }, [user?.enrollmentYear, user?.enrollmentHalf]);

  const canPrev = !minSemester || semesterCmp(semesterPrev(semester), minSemester) >= 0;
  const canNext = semesterCmp(semester, cur) < 0;
  const isCurrentSem = semesterCmp(semester, cur) === 0;

  const { data: attendeesRes } = useQuery({
    queryKey: ["streak", "attendees", userId],
    queryFn: () => attendeesApi.listByUser(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
  const { data: studyRes } = useQuery({
    queryKey: ["streak", "study-sessions", userId],
    queryFn: () => studySessionsApi.listByUser(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
  const { data: postsRes } = useQuery({
    queryKey: ["streak", "my-posts", userId],
    queryFn: () =>
      dataApi.list<Post>("posts", {
        "filter[authorId]": userId!,
        limit: 500,
      }),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
  const { data: courseReviewsRes } = useQuery({
    queryKey: ["streak", "my-course-reviews", userId],
    queryFn: () =>
      dataApi.list<CourseReview>("course_reviews", {
        "filter[authorId]": userId!,
        limit: 500,
      }),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
  const { data: commentsRes } = useQuery({
    queryKey: ["streak", "my-comments", userId],
    queryFn: () =>
      dataApi.list<Comment>("comments", {
        "filter[authorId]": userId!,
        limit: 1000,
      }),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  const stats = useMemo<Stats>(() => {
    const scores = new Map<string, number>();
    function add(ymd: string | null, score: number) {
      if (!ymd) return;
      scores.set(ymd, (scores.get(ymd) ?? 0) + score);
    }

    for (const a of (attendeesRes?.data ?? []) as SeminarAttendee[]) {
      if (!a.checkedIn) continue;
      const ymd = isoToYmdLocal(a.checkedInAt) ?? isoToYmdLocal(a.createdAt);
      if (!ymd) continue;
      add(ymd, SCORES.attendance);
    }
    for (const s of (studyRes?.data ?? []) as StudySession[]) {
      if (!s.endTime) continue;
      if ((s.durationMinutes ?? 0) < 30) continue;
      const ymd = isoToYmdLocal(s.endTime) ?? isoToYmdLocal(s.startTime);
      if (!ymd) continue;
      add(ymd, SCORES.timer30);
    }
    for (const p of (postsRes?.data ?? []) as Post[]) {
      const ymd = isoToYmdLocal(p.createdAt);
      add(ymd, SCORES.post);
    }
    for (const r of (courseReviewsRes?.data ?? []) as CourseReview[]) {
      const ymd = isoToYmdLocal(r.createdAt);
      add(ymd, SCORES.courseReview);
    }
    for (const c of (commentsRes?.data ?? []) as Comment[]) {
      const ymd = isoToYmdLocal(c.createdAt);
      add(ymd, SCORES.comment);
    }

    return computeStats(scores, semester);
  }, [attendeesRes, studyRes, postsRes, courseReviewsRes, commentsRes, semester]);

  const achievedMilestones = useMemo(
    () => MILESTONES.filter((m) => m.achieved(stats)),
    [stats],
  );

  // 신규 달성 마일스톤 1회 토스트 (sessionStorage 가 아닌 localStorage 영구)
  useEffect(() => {
    if (!userId || achievedMilestones.length === 0) return;
    const shown = getMilestonesShown(userId);
    let dirty = false;
    for (const m of achievedMilestones) {
      if (shown.has(m.id)) continue;
      shown.add(m.id);
      dirty = true;
      toast.success(`${m.label} — ${m.description}`, { duration: 5000 });
    }
    if (dirty) setMilestonesShown(userId, shown);
  }, [userId, achievedMilestones]);

  if (!userId) return null;

  // 월 라벨 — 그리드 첫 날 기준으로 각 달 시작 컬럼만 표시
  const monthLabels: { col: number; month: number }[] = [];
  let lastMonth = -1;
  for (const c of stats.cells) {
    if (c.weekday !== 0) continue;
    const m = c.date.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: c.weekIndex, month: m });
      lastMonth = m;
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Sprout size={18} className="text-emerald-600" aria-hidden="true" />
        <h2 className="font-bold">학습 잔디</h2>
        <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>활동 <strong className="text-foreground">{stats.activeDays}</strong>일</span>
          <span>누적 <strong className="text-foreground">{stats.totalScore}</strong>점</span>
          {isCurrentSem && (
            <span className="inline-flex items-center gap-1">
              <Flame size={12} className="text-rose-500" />
              <strong className="text-foreground">{stats.weekStreak}</strong>주 streak
            </span>
          )}
        </span>
      </div>

      {/* Sprint 64: 학기 네비게이션 */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setSemester(semesterPrev(semester))}
          disabled={!canPrev}
          className={cn(
            "inline-flex h-8 min-w-[88px] items-center gap-1 rounded-lg border px-2 text-xs transition-colors",
            canPrev ? "bg-white hover:bg-muted/40" : "cursor-not-allowed bg-muted/30 text-muted-foreground",
          )}
          aria-label="이전 학기"
          title={canPrev ? `이전: ${semesterLabel(semesterPrev(semester))}` : "입학 시점 이전으로는 이동할 수 없어요"}
        >
          <ChevronLeft size={14} />
          이전 학기
        </button>
        <p className="flex-1 text-center text-sm font-semibold">
          {semesterLabel(semester)}
          {isCurrentSem && (
            <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
              현재
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setSemester(semesterNext(semester))}
          disabled={!canNext}
          className={cn(
            "inline-flex h-8 min-w-[88px] items-center justify-end gap-1 rounded-lg border px-2 text-xs transition-colors",
            canNext ? "bg-white hover:bg-muted/40" : "cursor-not-allowed bg-muted/30 text-muted-foreground",
          )}
          aria-label="다음 학기"
          title={canNext ? `다음: ${semesterLabel(semesterNext(semester))}` : "현재 학기 이후는 아직 시작되지 않았어요"}
        >
          다음 학기
          <ChevronRight size={14} />
        </button>
      </div>

      {/* 그리드 영역 — 가로 스크롤 가능 */}
      <div className="mt-4 overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          {/* 월 라벨 행 */}
          <div
            className="grid gap-[2px] text-[10px] text-muted-foreground"
            style={{ gridTemplateColumns: `repeat(${WEEKS}, 12px)` }}
          >
            {Array.from({ length: WEEKS }, (_, w) => {
              const lab = monthLabels.find((m) => m.col === w);
              return (
                <span key={w} className="text-left">
                  {lab ? MONTH_LABELS_KR[lab.month] : ""}
                </span>
              );
            })}
          </div>
          {/* 7행 × WEEKS열 셀 */}
          <div
            className="mt-1 grid gap-[2px]"
            style={{
              gridTemplateColumns: `repeat(${WEEKS}, 12px)`,
              gridTemplateRows: `repeat(${DAYS_PER_WEEK}, 12px)`,
              gridAutoFlow: "column",
            }}
          >
            {stats.cells.map((c) => (
              <div
                key={c.ymd}
                className={cn(
                  "h-3 w-3 rounded-[3px]",
                  intensityClass(c.score),
                )}
                title={`${c.ymd} · ${c.score}점`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 색 범례 */}
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span>적음</span>
        <span className="h-3 w-3 rounded-[3px] bg-muted/40" />
        <span className="h-3 w-3 rounded-[3px] bg-emerald-200" />
        <span className="h-3 w-3 rounded-[3px] bg-emerald-400" />
        <span className="h-3 w-3 rounded-[3px] bg-emerald-500" />
        <span className="h-3 w-3 rounded-[3px] bg-emerald-700" />
        <span>많음</span>
      </div>

      {/* 마일스톤 배지 */}
      {achievedMilestones.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {achievedMilestones.map((m) => {
            const Icon = m.Icon;
            return (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200"
                title={m.description}
              >
                <Icon size={12} />
                {m.label}
              </span>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        가중치: 세미나 출석 +10 · 강의 후기 +5 · 글 작성 +5 · 타이머 30분 +3 · 댓글 +1
      </p>
    </div>
  );
}
