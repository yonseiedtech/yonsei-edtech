"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, ChevronLeft, ChevronRight, ExternalLink, Settings, NotebookPen, ListChecks, BookOpen, Users, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  courseEnrollmentsApi,
  courseOfferingsApi,
  classSessionsApi,
  courseSessionNotesApi,
  courseTodosApi,
  activitiesApi,
  activityProgressApi,
} from "@/lib/bkend";
import {
  CLASS_SESSION_MODE_LABELS,
  COURSE_TODO_TYPE_LABELS,
  COURSE_TODO_TYPE_COLORS,
  ACTIVITY_PROGRESS_MODE_LABELS,
  type ClassSession,
  type ClassSessionMode,
  type CourseOffering,
  type CourseTodo,
  type CourseTodoType,
  type Activity,
  type ActivityType,
  type ActivityProgress,
  type ActivityProgressMode,
} from "@/types";
import { inferCurrentSemester } from "@/lib/semester";
import {
  parseSchedule,
  fmtTimeRange,
  type ParsedSchedule,
} from "@/lib/courseSchedule";
import { cn } from "@/lib/utils";

const DAY_CHARS = ["일", "월", "화", "수", "목", "금", "토"] as const;
// 주간 그리드는 평일만(월~금)
const WEEK_DAY_INDICES = [1, 2, 3, 4, 5] as const;

const DEFAULT_HOUR_START = 17;
const DEFAULT_HOUR_END = 24; // 24 = 자정 (00:00)
const ROW_HEIGHT_PX = 64;

const VIEW_STORAGE_KEY = "dashboard.classTimeline.view";
const HOUR_RANGE_STORAGE_KEY = "dashboard.classTimeline.hourRange";
type ViewMode = "daily" | "weekly";

function formatHour(h: number): string {
  if (h === 24) return "00:00";
  return `${String(h).padStart(2, "0")}:00`;
}

const MODE_BORDER: Record<ClassSessionMode, string> = {
  in_person: "border-l-emerald-400 bg-emerald-50/40",
  zoom: "border-l-blue-400 bg-blue-50/40",
  assignment: "border-l-amber-400 bg-amber-50/40",
  cancelled: "border-l-rose-400 bg-rose-50/40",
  field: "border-l-purple-400 bg-purple-50/40",
  exam: "border-l-rose-500 bg-rose-50/60",
};

const MODE_BADGE: Record<ClassSessionMode, string> = {
  in_person: "bg-emerald-100 text-emerald-700",
  zoom: "bg-blue-100 text-blue-700",
  assignment: "bg-amber-100 text-amber-700",
  cancelled: "bg-rose-100 text-rose-700",
  field: "bg-purple-100 text-purple-700",
  exam: "bg-rose-100 text-rose-700",
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** YYYY-MM-DD + n일 */
function addDaysYmd(dateStr: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  const [, y, mo, d] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  dt.setDate(dt.getDate() + days);
  return ymd(dt);
}

function semesterToTerm(semester: "first" | "second"): "spring" | "fall" {
  return semester === "first" ? "spring" : "fall";
}

function pickLatestSession(sessions: ClassSession[]): ClassSession | null {
  if (sessions.length === 0) return null;
  return sessions.reduce((a, b) =>
    new Date(b.updatedAt ?? b.createdAt).getTime() >
    new Date(a.updatedAt ?? a.createdAt).getTime()
      ? b
      : a,
  );
}

interface PlacedClass {
  offering: CourseOffering;
  parsed: ParsedSchedule;
  session: ClassSession | null;
  mode: ClassSessionMode;
  topPx: number;
  heightPx: number;
}

const ACTIVITY_TYPE_PATH: Record<ActivityType, string> = {
  study: "studies",
  project: "projects",
  external: "external",
};

const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  study: "스터디",
  project: "프로젝트",
  external: "대외활동",
};

const ACTIVITY_MODE_BORDER: Record<ActivityProgressMode, string> = {
  in_person: "border-l-violet-400 bg-violet-50/50",
  zoom: "border-l-indigo-400 bg-indigo-50/50",
};

const ACTIVITY_MODE_BADGE: Record<ActivityProgressMode, string> = {
  in_person: "bg-violet-100 text-violet-700",
  zoom: "bg-indigo-100 text-indigo-700",
};

interface PlacedActivity {
  activity: Activity;
  progress: ActivityProgress;
  startMin: number;
  endMin: number;
  topPx: number;
  heightPx: number;
  isLeader: boolean;
  mode: ActivityProgressMode;
}

function parseHHMM(s?: string): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(mm)) return null;
  return h * 60 + mm;
}

interface QuickMemoDraft {
  courseOfferingId: string;
  courseName: string;
  date: string;
  content: string;
}

interface QuickTodoDraft {
  courseOfferingId: string;
  courseName: string;
  sessionDate: string;
  type: CourseTodoType;
  content: string;
  dueDate: string;
}

const TODO_TYPE_OPTIONS: CourseTodoType[] = [
  "assignment",
  "paper_reading",
  "paper_writing",
  "presentation_prep",
  "other",
];

export default function DailyClassTimelineWidget() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const qc = useQueryClient();

  // 사용자가 좌/우로 이동 가능한 선택일 — 기본값은 오늘
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const today = ymd(selectedDate);
  const todayDayIndex = selectedDate.getDay();
  const dayChar = DAY_CHARS[todayDayIndex];
  const { year, semester } = inferCurrentSemester(selectedDate);
  const term = semesterToTerm(semester);
  const dateLabel = `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${dayChar})`;
  const semesterLabel = `${year}년 ${term === "spring" ? "1학기" : "2학기"}`;

  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "daily" || saved === "weekly") {
        setViewMode(saved);
        return;
      }
      // 저장값 없을 때: 주말(토/일)이면 주간 모드로 자동 전환
      const dow = new Date().getDay();
      if (dow === 0 || dow === 6) setViewMode("weekly");
    } catch {}
  }, []);
  const handleSetView = (v: ViewMode) => {
    setViewMode(v);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, v);
    } catch {}
  };

  // 시간대 설정 (localStorage 영속화)
  const [hourStart, setHourStart] = useState<number>(DEFAULT_HOUR_START);
  const [hourEnd, setHourEnd] = useState<number>(DEFAULT_HOUR_END);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HOUR_RANGE_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { start?: number; end?: number };
      if (
        typeof parsed.start === "number" &&
        typeof parsed.end === "number" &&
        parsed.start >= 0 &&
        parsed.end <= 24 &&
        parsed.end > parsed.start
      ) {
        setHourStart(parsed.start);
        setHourEnd(parsed.end);
      }
    } catch {}
  }, []);
  const saveHourRange = (start: number, end: number) => {
    setHourStart(start);
    setHourEnd(end);
    try {
      localStorage.setItem(
        HOUR_RANGE_STORAGE_KEY,
        JSON.stringify({ start, end }),
      );
    } catch {}
  };
  const MIN_START = hourStart * 60;
  const MIN_END = hourEnd * 60;

  // 수업 종료 후 메모·할 일 입력 Dialog 상태
  const [memoDraft, setMemoDraft] = useState<QuickMemoDraft | null>(null);
  const [savingMemo, setSavingMemo] = useState(false);
  const [todoDraft, setTodoDraft] = useState<QuickTodoDraft | null>(null);
  const [savingTodo, setSavingTodo] = useState(false);
  const [dismissedToday, setDismissedToday] = useState<Record<string, boolean>>({});

  async function saveQuickMemo() {
    if (!memoDraft || !userId) return;
    const content = memoDraft.content.trim();
    if (!content) {
      toast.error("메모 내용을 입력하세요.");
      return;
    }
    setSavingMemo(true);
    try {
      await courseSessionNotesApi.create({
        courseOfferingId: memoDraft.courseOfferingId,
        date: memoDraft.date,
        userId,
        content,
      });
      await qc.invalidateQueries({
        queryKey: ["course-session-notes", memoDraft.courseOfferingId, userId],
      });
      toast.success("메모를 저장했습니다.");
      setDismissedToday((p) => ({ ...p, [memoDraft.courseOfferingId]: true }));
      setMemoDraft(null);
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSavingMemo(false);
    }
  }

  async function saveQuickTodo() {
    if (!todoDraft || !userId) return;
    const content = todoDraft.content.trim();
    if (!content) {
      toast.error("할 일 내용을 입력하세요.");
      return;
    }
    setSavingTodo(true);
    try {
      await courseTodosApi.create({
        courseOfferingId: todoDraft.courseOfferingId,
        userId,
        type: todoDraft.type,
        content,
        dueDate: todoDraft.dueDate || undefined,
        sessionDate: todoDraft.sessionDate,
        completed: false,
      });
      await qc.invalidateQueries({
        queryKey: ["course-todos", todoDraft.courseOfferingId, userId],
      });
      await qc.invalidateQueries({ queryKey: ["my-course-todos", userId] });
      toast.success("할 일을 저장했습니다.");
      setTodoDraft(null);
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSavingTodo(false);
    }
  }

  // 변경 기록(class_session) 직접 삭제 — 잔존 row를 schedule 페이지 안 거치고 정리
  async function handleResetSession(sessionId: string, label: string) {
    if (!window.confirm(`"${label}" 의 변경 기록을 삭제하고 기본 대면으로 복원할까요?`)) {
      return;
    }
    try {
      await classSessionsApi.delete(sessionId);
      await qc.invalidateQueries({ queryKey: ["class-sessions"] });
      toast.success("변경 기록을 삭제했습니다. 기본 대면으로 표시됩니다.");
    } catch (e) {
      toast.error(`삭제 실패: ${(e as Error).message}`);
    }
  }

  // 1분마다 갱신되는 현재 시각 (NOW 라인 + 라벨용) — 분 경계에 정렬
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const tick = () => setCurrentTime(new Date());
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 60_000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // 현재 시각 위치 (분 단위)
  const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
  const nowPx =
    nowMin >= MIN_START && nowMin <= MIN_END
      ? ((nowMin - MIN_START) / 60) * ROW_HEIGHT_PX
      : null;
  const nowLabel = `${String(currentTime.getHours()).padStart(2, "0")}:${String(currentTime.getMinutes()).padStart(2, "0")}`;

  // 실제 오늘(selectedDate와 무관) — NOW 라인 표시 여부 판별용
  const actualToday = ymd(currentTime);
  const isViewingToday = today === actualToday;

  // 날짜 네비게이션 (daily: ±1일, weekly: ±7일)
  const navigateDate = (direction: -1 | 1) => {
    const step = viewMode === "daily" ? 1 : 7;
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + step * direction);
    setSelectedDate(next);
  };
  const resetToToday = () => setSelectedDate(new Date());
  const isShowingToday = isViewingToday; // 버튼 활성 판별

  const { data: enrollmentsRes, isLoading: loadingEnrollments } = useQuery({
    queryKey: ["my-enrollments", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await courseEnrollmentsApi.listByUser(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const courseIds = useMemo(() => {
    return (enrollmentsRes?.data ?? [])
      .filter((e) => e.year === year && e.term === term)
      .map((e) => e.courseOfferingId);
  }, [enrollmentsRes, year, term]);

  const { data: offeringsRes, isLoading: loadingOfferings } = useQuery({
    queryKey: ["course-offerings", year, term],
    queryFn: () => courseOfferingsApi.listBySemester(year, term),
    staleTime: 1000 * 60 * 5,
  });

  const myOfferings: CourseOffering[] = useMemo(() => {
    return (offeringsRes?.data ?? []).filter((o) => courseIds.includes(o.id));
  }, [offeringsRes, courseIds]);

  // 모든 강의 + 파싱 결과
  const parsedOfferings = useMemo(
    () =>
      myOfferings.map((o) => ({ offering: o, parsed: parseSchedule(o.schedule) })),
    [myOfferings],
  );

  // 오늘 요일 강의 (daily 모드)
  const todayOfferings = useMemo(() => {
    return parsedOfferings
      .filter(({ parsed }) => parsed.weekdays.includes(todayDayIndex))
      .sort((a, b) => {
        const sa = a.parsed.startMin ?? Number.POSITIVE_INFINITY;
        const sb = b.parsed.startMin ?? Number.POSITIVE_INFINITY;
        return sa - sb;
      });
  }, [parsedOfferings, todayDayIndex]);

  // 선택일이 속한 주의 월~금 날짜 (weekly 모드)
  const weekDates = useMemo(() => {
    const monday = new Date(selectedDate);
    const dayDiff = (selectedDate.getDay() + 6) % 7; // 월=0, ..., 일=6
    monday.setDate(monday.getDate() - dayDiff);
    return WEEK_DAY_INDICES.map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const weekStartStr = weekDates.length > 0 ? ymd(weekDates[0]) : today;
  const weekEndStr = weekDates.length > 0 ? ymd(weekDates[weekDates.length - 1]) : today;

  // 오늘 / 주간 모두에서 사용할 class_sessions
  // 데이터 소스를 listByCourses(myCourseIds)로 통일 — schedule 페이지(listByCourse)와 같은
  // courseOfferingId 인덱스를 사용해서 인덱스 경로 차이로 인한 stale mode 표시 버그를 차단한다.
  const myOfferingIdsForSessions = useMemo(
    () => myOfferings.map((o) => o.id).sort(),
    [myOfferings],
  );
  const myOfferingIdsKey = myOfferingIdsForSessions.join(",");

  const { data: dailySessionsRes } = useQuery({
    queryKey: ["class-sessions", "by-my-courses-day", today, myOfferingIdsKey],
    queryFn: async () => {
      if (myOfferingIdsForSessions.length === 0)
        return { data: [] as ClassSession[] };
      const res = await classSessionsApi.listByCourses(myOfferingIdsForSessions);
      return {
        data: ((res?.data ?? []) as ClassSession[]).filter(
          (s) => s.date === today,
        ),
      };
    },
    staleTime: 1000 * 60,
    enabled: viewMode === "daily" && todayOfferings.length > 0,
  });

  const { data: weeklySessionsRes } = useQuery({
    queryKey: [
      "class-sessions",
      "by-my-courses-week",
      weekStartStr,
      weekEndStr,
      myOfferingIdsKey,
    ],
    queryFn: async () => {
      if (myOfferingIdsForSessions.length === 0)
        return { data: [] as ClassSession[] };
      const res = await classSessionsApi.listByCourses(myOfferingIdsForSessions);
      return {
        data: ((res?.data ?? []) as ClassSession[]).filter(
          (s) => s.date >= weekStartStr && s.date <= weekEndStr,
        ),
      };
    },
    staleTime: 1000 * 60,
    enabled: viewMode === "weekly" && parsedOfferings.length > 0,
  });

  // 사용자 전체 수업 할 일 (이번 주 표시용)
  const { data: myTodosRes } = useQuery({
    queryKey: ["my-course-todos", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await courseTodosApi.listByUser(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60,
  });

  // 이번 주(월~일) 범위 계산: weekDates는 월~금만이므로 일요일까지 확장
  const weekTodoStart = weekStartStr;
  const weekTodoEnd = useMemo(() => {
    if (weekDates.length === 0) return weekEndStr;
    const sun = new Date(weekDates[0]);
    sun.setDate(sun.getDate() + 6);
    return ymd(sun);
  }, [weekDates, weekEndStr]);

  // 할 일에서 참조하는 모든 courseOfferingId — 학기 enrollment 와 무관하게 이름 조회
  const todoCourseIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of (myTodosRes?.data ?? []) as CourseTodo[]) {
      if (t.courseOfferingId) set.add(t.courseOfferingId);
    }
    return Array.from(set);
  }, [myTodosRes]);

  const myOfferingIdSet = useMemo(
    () => new Set(myOfferings.map((o) => o.id)),
    [myOfferings],
  );

  // 현재 학기 myOfferings 에 없는 강의 이름은 별도 조회 (지난 학기 등록 과목의 잔여 할 일 등)
  const { data: extraOfferingsMap = {} } = useQuery({
    queryKey: [
      "todo-course-offerings",
      todoCourseIds.filter((id) => !myOfferingIdSet.has(id)).sort().join(","),
    ],
    queryFn: async () => {
      const map: Record<string, CourseOffering> = {};
      const missing = todoCourseIds.filter((id) => !myOfferingIdSet.has(id));
      await Promise.all(
        missing.map(async (id) => {
          try {
            const c = (await courseOfferingsApi.get(id)) as unknown as CourseOffering;
            if (c) map[id] = c;
          } catch {
            // 삭제된 과목 등은 무시
          }
        }),
      );
      return map;
    },
    enabled: todoCourseIds.some((id) => !myOfferingIdSet.has(id)),
    staleTime: 5 * 60_000,
  });

  const courseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of myOfferings) map.set(o.id, o.courseName);
    for (const id of Object.keys(extraOfferingsMap)) {
      const o = extraOfferingsMap[id];
      if (o) map.set(id, o.courseName);
    }
    return map;
  }, [myOfferings, extraOfferingsMap]);

  // 표시 정책: 미완료는 항상 노출, 완료된 항목은 이번 주 범위(week) 안인 것만
  const relevantTodos: CourseTodo[] = useMemo(() => {
    const all = (myTodosRes?.data ?? []) as CourseTodo[];
    const inWeek = (d?: string) => !!d && d >= weekTodoStart && d <= weekTodoEnd;
    return all
      .filter((t) => !t.completed || inWeek(t.dueDate) || inWeek(t.sessionDate))
      .sort((a, b) => {
        // 1) 미완료 먼저 2) 마감일/세션일 빠른 순
        if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
        const ka = a.dueDate ?? a.sessionDate ?? "9999-12-31";
        const kb = b.dueDate ?? b.sessionDate ?? "9999-12-31";
        return ka.localeCompare(kb);
      });
  }, [myTodosRes, weekTodoStart, weekTodoEnd]);

  const incompleteCount = relevantTodos.filter((t) => !t.completed).length;

  async function toggleWeekTodo(t: CourseTodo) {
    if (!userId) return;
    try {
      await courseTodosApi.update(t.id, {
        completed: !t.completed,
        completedAt: !t.completed ? new Date().toISOString() : undefined,
      });
      await qc.refetchQueries({ queryKey: ["my-course-todos", userId], type: "active" });
    } catch (e) {
      toast.error(`변경 실패: ${(e as Error).message}`);
    }
  }

  const dailySessionsByCourse = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    (dailySessionsRes?.data ?? []).forEach((s) => {
      if (!map.has(s.courseOfferingId)) map.set(s.courseOfferingId, []);
      map.get(s.courseOfferingId)!.push(s);
    });
    return map;
  }, [dailySessionsRes]);

  // weekly: { date(YYYY-MM-DD)+courseId → sessions }
  const weeklySessionsByDateCourse = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    (weeklySessionsRes?.data ?? []).forEach((s: ClassSession) => {
      const key = `${s.date}__${s.courseOfferingId}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [weeklySessionsRes]);

  // daily 배치
  const placedDaily: PlacedClass[] = useMemo(() => {
    const result: PlacedClass[] = [];
    for (const { offering, parsed } of todayOfferings) {
      if (parsed.startMin === null || parsed.endMin === null) continue;
      const s = Math.max(MIN_START, parsed.startMin);
      const e = Math.min(MIN_END, parsed.endMin);
      if (e <= s) continue;
      const session = pickLatestSession(dailySessionsByCourse.get(offering.id) ?? []);
      const mode: ClassSessionMode = session?.mode ?? "in_person";
      result.push({
        offering,
        parsed,
        session,
        mode,
        topPx: ((s - MIN_START) / 60) * ROW_HEIGHT_PX,
        heightPx: ((e - s) / 60) * ROW_HEIGHT_PX,
      });
    }
    return result;
  }, [todayOfferings, dailySessionsByCourse, MIN_START, MIN_END]);

  const undated = useMemo(() => {
    return todayOfferings.filter(
      ({ parsed }) => parsed.startMin === null || parsed.endMin === null,
    );
  }, [todayOfferings]);

  // weekly 배치 — 요일별
  const placedWeekly: Array<{
    date: Date;
    dayIndex: number;
    items: PlacedClass[];
  }> = useMemo(() => {
    return weekDates.map((d) => {
      const dayIdx = d.getDay();
      const dateStr = ymd(d);
      const items: PlacedClass[] = [];
      for (const { offering, parsed } of parsedOfferings) {
        if (!parsed.weekdays.includes(dayIdx)) continue;
        if (parsed.startMin === null || parsed.endMin === null) continue;
        const s = Math.max(MIN_START, parsed.startMin);
        const e = Math.min(MIN_END, parsed.endMin);
        if (e <= s) continue;
        const sessions = weeklySessionsByDateCourse.get(`${dateStr}__${offering.id}`) ?? [];
        const session = pickLatestSession(sessions);
        const mode: ClassSessionMode = session?.mode ?? "in_person";
        items.push({
          offering,
          parsed,
          session,
          mode,
          topPx: ((s - MIN_START) / 60) * ROW_HEIGHT_PX,
          heightPx: ((e - s) / 60) * ROW_HEIGHT_PX,
        });
      }
      return { date: d, dayIndex: dayIdx, items };
    });
  }, [weekDates, parsedOfferings, weeklySessionsByDateCourse, MIN_START, MIN_END]);

  // [Sprint50 debug] 4/30 mode 결정 근거 출력 — root cause 진단용 임시 로그
  useEffect(() => {
    if (viewMode !== "weekly") return;
    const target = "2026-04-30";
    const dayBlock = placedWeekly.find((w) => ymd(w.date) === target);
    if (!dayBlock) return;
    const rawSessions = ((weeklySessionsRes?.data ?? []) as ClassSession[])
      .filter((s) => s.date === target)
      .map((s) => ({
        id: s.id,
        courseOfferingId: s.courseOfferingId,
        mode: s.mode,
        updatedAt: s.updatedAt,
        createdAt: s.createdAt,
      }));
    const placed = dayBlock.items.map((it) => ({
      courseId: it.offering.id,
      courseName: it.offering.courseName,
      mode: it.mode,
      sessionId: it.session?.id ?? null,
      sessionMode: it.session?.mode ?? null,
      sessionUpdatedAt: it.session?.updatedAt ?? null,
    }));
    console.warn(
      "[Sprint50-JSON] 4/30 RAW:",
      JSON.stringify(rawSessions),
    );
    console.warn(
      "[Sprint50-JSON] 4/30 placed:",
      JSON.stringify(placed),
    );
    console.warn(
      "[Sprint50-JSON] myOfferingIds:",
      JSON.stringify(myOfferingIdsForSessions),
    );
  }, [
    viewMode,
    placedWeekly,
    weeklySessionsRes,
    myOfferingIdsForSessions,
  ]);

  // ── Sprint 41a: 학술활동(스터디/프로젝트/대외) 진행현황을 타임라인에 통합 ──
  const { data: allActivitiesRes } = useQuery({
    queryKey: ["my-activities-timeline", userId],
    queryFn: async () => {
      // type 필터 없이 한 번에 가져온 뒤 클라이언트에서 study/project/external 필터
      const res = await activitiesApi.list();
      return res;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  // 내가 참여중인 활동만 (운영진=leaderId 일치 OR participants OR members 포함)
  const myActivities: Activity[] = useMemo(() => {
    if (!userId) return [];
    const all = (allActivitiesRes?.data ?? []) as Activity[];
    return all.filter((a) => {
      if (a.type !== "study" && a.type !== "project" && a.type !== "external") return false;
      const isLeader = a.leaderId === userId;
      const inParticipants = (a.participants ?? []).includes(userId);
      const inMembers = (a.members ?? []).includes(userId);
      return isLeader || inParticipants || inMembers;
    });
  }, [allActivitiesRes, userId]);

  const myActivityIds = useMemo(() => myActivities.map((a) => a.id), [myActivities]);
  const myActivityIdsKey = myActivityIds.slice().sort().join(",");

  // 참여 활동들의 진행현황(주차) 일괄 조회
  const { data: progressByActivity = {} } = useQuery({
    queryKey: ["my-activities-progress", myActivityIdsKey],
    queryFn: async () => {
      const map: Record<string, ActivityProgress[]> = {};
      await Promise.all(
        myActivityIds.map(async (id) => {
          try {
            const r = await activityProgressApi.list(id);
            map[id] = (r.data ?? []) as ActivityProgress[];
          } catch {
            map[id] = [];
          }
        }),
      );
      return map;
    },
    enabled: myActivityIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  const activityById = useMemo(() => {
    const m = new Map<string, Activity>();
    for (const a of myActivities) m.set(a.id, a);
    return m;
  }, [myActivities]);

  // daily 활동 배치 — 오늘(today) date 매칭 + 시작/종료시간 있는 것만
  const placedDailyActivities: PlacedActivity[] = useMemo(() => {
    const result: PlacedActivity[] = [];
    for (const id of myActivityIds) {
      const a = activityById.get(id);
      if (!a) continue;
      const list = progressByActivity[id] ?? [];
      for (const p of list) {
        if (p.date !== today) continue;
        const startMin = parseHHMM(p.startTime);
        const endMin = parseHHMM(p.endTime);
        if (startMin === null || endMin === null) continue;
        const s = Math.max(MIN_START, startMin);
        const e = Math.min(MIN_END, endMin);
        if (e <= s) continue;
        result.push({
          activity: a,
          progress: p,
          startMin,
          endMin,
          topPx: ((s - MIN_START) / 60) * ROW_HEIGHT_PX,
          heightPx: ((e - s) / 60) * ROW_HEIGHT_PX,
          isLeader: a.leaderId === userId,
          mode: p.mode ?? "in_person",
        });
      }
    }
    return result.sort((x, y) => x.startMin - y.startMin);
  }, [myActivityIds, activityById, progressByActivity, today, MIN_START, MIN_END, userId]);

  // 그리드 외 활동(오늘) — 시간미정 OR 시간외(17~23 범위 밖) 항목 모두 칩으로 노출
  const undatedDailyActivities = useMemo(() => {
    if (!userId)
      return [] as {
        activity: Activity;
        progress: ActivityProgress;
        isLeader: boolean;
        reason: "untimed" | "out_of_range";
      }[];
    const result: {
      activity: Activity;
      progress: ActivityProgress;
      isLeader: boolean;
      reason: "untimed" | "out_of_range";
    }[] = [];
    for (const id of myActivityIds) {
      const a = activityById.get(id);
      if (!a) continue;
      const list = progressByActivity[id] ?? [];
      for (const p of list) {
        if (p.date !== today) continue;
        const startMin = parseHHMM(p.startTime);
        const endMin = parseHHMM(p.endTime);
        const isUntimed = startMin === null || endMin === null;
        const s = !isUntimed ? Math.max(MIN_START, startMin!) : 0;
        const e = !isUntimed ? Math.min(MIN_END, endMin!) : 0;
        const isOutOfRange = !isUntimed && e <= s;
        if (!isUntimed && !isOutOfRange) continue; // 그리드에 정상 배치됨
        result.push({
          activity: a,
          progress: p,
          isLeader: a.leaderId === userId,
          reason: isUntimed ? "untimed" : "out_of_range",
        });
      }
    }
    return result.sort((x, y) =>
      (x.progress.startTime ?? "").localeCompare(y.progress.startTime ?? ""),
    );
  }, [myActivityIds, activityById, progressByActivity, today, MIN_START, MIN_END, userId]);

  // weekly 활동 배치 — 주의 평일(월~금)에 매칭
  const weekDateStrs = useMemo(() => weekDates.map((d) => ymd(d)), [weekDates]);
  const placedWeeklyActivities: Map<string, PlacedActivity[]> = useMemo(() => {
    const byDate = new Map<string, PlacedActivity[]>();
    for (const ds of weekDateStrs) byDate.set(ds, []);
    for (const id of myActivityIds) {
      const a = activityById.get(id);
      if (!a) continue;
      const list = progressByActivity[id] ?? [];
      for (const p of list) {
        if (!byDate.has(p.date)) continue;
        const startMin = parseHHMM(p.startTime);
        const endMin = parseHHMM(p.endTime);
        if (startMin === null || endMin === null) continue;
        const s = Math.max(MIN_START, startMin);
        const e = Math.min(MIN_END, endMin);
        if (e <= s) continue;
        byDate.get(p.date)!.push({
          activity: a,
          progress: p,
          startMin,
          endMin,
          topPx: ((s - MIN_START) / 60) * ROW_HEIGHT_PX,
          heightPx: ((e - s) / 60) * ROW_HEIGHT_PX,
          isLeader: a.leaderId === userId,
          mode: p.mode ?? "in_person",
        });
      }
    }
    for (const arr of byDate.values()) arr.sort((x, y) => x.startMin - y.startMin);
    return byDate;
  }, [weekDateStrs, myActivityIds, activityById, progressByActivity, MIN_START, MIN_END, userId]);

  // 그리드 외 활동(이번 주) — 시간미정 / 시간외(17~23 범위 밖) / 주말(토·일) 모두 칩으로 노출
  const undatedWeeklyActivities = useMemo(() => {
    if (!userId)
      return [] as {
        activity: Activity;
        progress: ActivityProgress;
        isLeader: boolean;
        reason: "untimed" | "out_of_range" | "weekend";
      }[];
    const result: {
      activity: Activity;
      progress: ActivityProgress;
      isLeader: boolean;
      reason: "untimed" | "out_of_range" | "weekend";
    }[] = [];
    // 이번 주 월~일 전체 범위
    const fullWeekSet = new Set<string>();
    if (weekDates.length > 0) {
      const monday = weekDates[0];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        fullWeekSet.add(ymd(d));
      }
    }
    const weekdaySet = new Set(weekDateStrs); // 월~금만
    for (const id of myActivityIds) {
      const a = activityById.get(id);
      if (!a) continue;
      const list = progressByActivity[id] ?? [];
      for (const p of list) {
        if (!fullWeekSet.has(p.date)) continue;
        const startMin = parseHHMM(p.startTime);
        const endMin = parseHHMM(p.endTime);
        const isWeekend = !weekdaySet.has(p.date);
        const isUntimed = startMin === null || endMin === null;
        const s = !isUntimed ? Math.max(MIN_START, startMin!) : 0;
        const e = !isUntimed ? Math.min(MIN_END, endMin!) : 0;
        const isOutOfRange = !isUntimed && e <= s;
        // 그리드에 정상 배치되는 경우는 제외 (평일 + 시간있음 + 17~23 겹침)
        if (!isWeekend && !isUntimed && !isOutOfRange) continue;
        const reason: "untimed" | "out_of_range" | "weekend" = isWeekend
          ? "weekend"
          : isUntimed
            ? "untimed"
            : "out_of_range";
        result.push({ activity: a, progress: p, isLeader: a.leaderId === userId, reason });
      }
    }
    return result.sort((x, y) => (x.progress.date ?? "").localeCompare(y.progress.date ?? ""));
  }, [weekDateStrs, weekDates, myActivityIds, activityById, progressByActivity, MIN_START, MIN_END, userId]);

  // 오늘 종료된 수업들 — 메모·할 일 입력 프롬프트용
  const finishedToday = useMemo(() => {
    if (!isViewingToday) return [] as typeof todayOfferings;
    return todayOfferings.filter(
      ({ parsed }) => parsed.endMin !== null && parsed.endMin <= nowMin,
    );
  }, [isViewingToday, todayOfferings, nowMin]);

  // 다음주 같은 요일의 수업 세션 (종료 수업 프롬프트에서 수업형태 편집용)
  const nextWeekDate = useMemo(() => addDaysYmd(actualToday, 7), [actualToday]);
  const { data: nextWeekSessionsRes } = useQuery({
    queryKey: ["class-sessions", "next-week", nextWeekDate, myOfferingIdsKey],
    queryFn: async () => {
      if (myOfferingIdsForSessions.length === 0)
        return { data: [] as ClassSession[] };
      const res = await classSessionsApi.listByCourses(myOfferingIdsForSessions);
      return {
        data: ((res?.data ?? []) as ClassSession[]).filter(
          (s) => s.date === nextWeekDate,
        ),
      };
    },
    enabled: isViewingToday && finishedToday.length > 0,
    staleTime: 30_000,
  });
  const nextWeekSessionByCourse = useMemo(() => {
    const map = new Map<string, ClassSession>();
    for (const s of (nextWeekSessionsRes?.data ?? []) as ClassSession[]) {
      // 같은 과목에 여러 건이면 최신 updatedAt을 채택
      const prev = map.get(s.courseOfferingId);
      if (
        !prev ||
        new Date(s.updatedAt ?? s.createdAt).getTime() >
          new Date(prev.updatedAt ?? prev.createdAt).getTime()
      ) {
        map.set(s.courseOfferingId, s);
      }
    }
    return map;
  }, [nextWeekSessionsRes]);
  const [savingNextMode, setSavingNextMode] = useState<string | null>(null);

  async function setNextWeekMode(
    courseOfferingId: string,
    mode: ClassSessionMode,
  ) {
    if (!userId) return;
    const key = `${courseOfferingId}__${mode}`;
    if (savingNextMode) return;
    setSavingNextMode(key);
    try {
      const ex = nextWeekSessionByCourse.get(courseOfferingId);
      // 대면(기본값)으로 복귀할 때는 row를 삭제해 stale 데이터를 남기지 않는다.
      // 그 외 mode는 update(있으면) / create(없으면).
      if (mode === "in_person") {
        if (ex) {
          await classSessionsApi.delete(ex.id);
        }
        // ex 없으면 no-op (이미 기본 대면 상태)
      } else if (ex) {
        if (ex.mode !== mode) {
          await classSessionsApi.update(ex.id, { mode });
        }
      } else {
        await classSessionsApi.create({
          courseOfferingId,
          date: nextWeekDate,
          mode,
          createdBy: userId,
        });
      }
      await qc.refetchQueries({
        queryKey: ["class-sessions", "next-week", nextWeekDate],
        type: "active",
      });
      await qc.invalidateQueries({ queryKey: ["class-sessions"] });
      // 과목 schedule 페이지 캐시도 함께 무효화
      await qc.invalidateQueries({
        queryKey: ["class-sessions", "by-course", courseOfferingId],
      });
      toast.success(
        `다음주 ${CLASS_SESSION_MODE_LABELS[mode]}(으)로 설정했습니다.`,
      );
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSavingNextMode(null);
    }
  }

  if (!userId) return null;
  const isLoading = loadingEnrollments || loadingOfferings;

  const hourRows = Array.from(
    { length: hourEnd - hourStart + 1 },
    (_, i) => hourStart + i,
  );
  const totalHeight = ROW_HEIGHT_PX * (hourEnd - hourStart);

  const currentWeekContainsToday = weekDates.some((d) => ymd(d) === actualToday);
  const headerTitle =
    viewMode === "daily"
      ? isShowingToday
        ? "오늘의 수업"
        : `${dateLabel} 수업`
      : currentWeekContainsToday
        ? "이번 주 수업"
        : "선택 주 수업";
  const hourRangeLabel = `${formatHour(hourStart)}~${formatHour(hourEnd)}`;
  const headerLabel =
    viewMode === "daily"
      ? `${dateLabel} · ${semesterLabel} · ${hourRangeLabel}`
      : `${weekDates[0]?.getMonth() + 1}/${weekDates[0]?.getDate()} ~ ${weekDates[4]?.getMonth() + 1}/${weekDates[4]?.getDate()} · ${semesterLabel}`;

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-primary" />
          <div className="leading-tight">
            <h2 className="font-bold">{headerTitle}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{headerLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 날짜 네비게이션 */}
          <div className="flex items-center gap-0.5 rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => navigateDate(-1)}
              aria-label={viewMode === "daily" ? "이전 날" : "이전 주"}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={resetToToday}
              disabled={viewMode === "weekly" ? currentWeekContainsToday : isShowingToday}
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                (viewMode === "weekly" ? currentWeekContainsToday : isShowingToday)
                  ? "cursor-default text-muted-foreground/50"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {viewMode === "weekly" ? "이번주" : "오늘"}
            </button>
            <button
              type="button"
              onClick={() => navigateDate(1)}
              aria-label={viewMode === "daily" ? "다음 날" : "다음 주"}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          {/* 일간/주간 토글 */}
          <div className="flex gap-0.5 rounded-lg border p-0.5">
            <button
              onClick={() => handleSetView("daily")}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                viewMode === "daily"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              일간
            </button>
            <button
              onClick={() => handleSetView("weekly")}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                viewMode === "weekly"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              주간
            </button>
          </div>
        </div>
      </div>

      {/* 색상 범례 — 실제 카드와 동일하게 좌측 보더 + 옅은 배경으로 표현 */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-lg border border-dashed bg-muted/10 px-3 py-2 text-[11px]">
        <span className="font-medium text-muted-foreground">수업</span>
        {(Object.keys(CLASS_SESSION_MODE_LABELS) as ClassSessionMode[]).map((m) => (
          <span
            key={`cls-${m}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-sm border-l-[3px] py-0.5 pl-1.5 pr-1.5 leading-none",
              MODE_BORDER[m],
            )}
          >
            <span className="text-muted-foreground">{CLASS_SESSION_MODE_LABELS[m]}</span>
          </span>
        ))}
        <span className="ml-1 font-medium text-muted-foreground">학술활동</span>
        {(Object.keys(ACTIVITY_PROGRESS_MODE_LABELS) as ActivityProgressMode[]).map((m) => (
          <span
            key={`act-${m}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-sm border-l-[3px] py-0.5 pl-1.5 pr-1.5 leading-none",
              ACTIVITY_MODE_BORDER[m],
            )}
          >
            <span className="text-muted-foreground">{ACTIVITY_PROGRESS_MODE_LABELS[m]}</span>
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-4 h-72 animate-pulse rounded-lg bg-muted" />
      ) : viewMode === "daily" ? (
        todayOfferings.length === 0 &&
        placedDailyActivities.length === 0 &&
        undatedDailyActivities.length === 0 ? (
          parsedOfferings.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed bg-muted/20 p-4 text-sm">
              <p className="font-medium">
                {semesterLabel}에 등록된 수강과목이 없어요.
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                <Link href="/courses?tab=mine" className="text-primary underline">
                  수강과목 페이지
                </Link>
                의 <b>“이번 학기”</b> 탭에서 본인 수강 또는 청강 버튼을 누르면 여기에 자동으로 표시됩니다.
              </p>
              {loadingEnrollments ? null : (enrollmentsRes?.data?.length ?? 0) > 0 ? (
                <p className="mt-1 text-[11px] text-muted-foreground/80">
                  ※ 다른 학기 수강 기록 {enrollmentsRes?.data?.length}건이 있지만,
                  {semesterLabel} 학기에 해당하는 항목은 없습니다.
                </p>
              ) : null}
              <Link
                href="/courses?tab=mine"
                className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-white hover:bg-primary/90"
              >
                <BookOpen size={12} /> 수강과목 등록하러 가기
              </Link>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed bg-muted/10 p-4 text-sm">
              <p className="text-muted-foreground">
                {isShowingToday ? `오늘(${dayChar}요일)` : `${dateLabel}`}에 예정된 수업이 없어요.
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                이번 학기 등록 과목 {parsedOfferings.length}건 — 주간 시간표에서 확인할 수 있어요.
              </p>
              <ul className="mt-3 space-y-1.5 text-[12px]">
                {parsedOfferings.map(({ offering: c, parsed }) => {
                  const days = parsed.weekdays.map((d) => DAY_CHARS[d]).join("");
                  const time = fmtTimeRange(parsed);
                  const meta = [days, time].filter(Boolean).join(" ");
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border bg-white px-2.5 py-1.5">
                      <span className="truncate">
                        <b className="font-medium">{c.courseName}</b>
                        {meta && <span className="ml-1.5 text-muted-foreground">· {meta || c.schedule}</span>}
                      </span>
                      <Link
                        href={`/courses/${c.id}/schedule`}
                        className="shrink-0 text-[11px] text-primary hover:underline"
                      >
                        스케줄 →
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => handleSetView("weekly")}
                className="mt-3 inline-flex items-center gap-1 rounded-md border bg-white px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/5"
              >
                주간 시간표 보기 →
              </button>
            </div>
          )
        ) : (
          <DailyGrid
            placed={placedDaily}
            placedActivities={placedDailyActivities}
            undated={undated}
            undatedActivities={undatedDailyActivities}
            hourRows={hourRows}
            totalHeight={totalHeight}
            nowPx={isViewingToday ? nowPx : null}
            nowLabel={nowLabel}
          />
        )
      ) : (
        <WeeklyGrid
          placedWeekly={placedWeekly}
          placedWeeklyActivities={placedWeeklyActivities}
          undatedActivities={undatedWeeklyActivities}
          hourRows={hourRows}
          totalHeight={totalHeight}
          actualToday={actualToday}
          nowPx={nowPx}
          nowLabel={nowLabel}
          onResetSession={handleResetSession}
        />
      )}

      {/* 수업 할 일 영역은 대시보드의 "나의 할 일" 위젯으로 통합됨 (MyTodosWidget) */}

      {/* 수업 종료 후 메모·할 일 프롬프트 (오늘 뷰에서만) */}
      {viewMode === "daily" && isViewingToday && finishedToday.length > 0 && (
        <div className="mt-4 space-y-2">
          {finishedToday.map(({ offering, parsed }) => {
            if (dismissedToday[offering.id]) return null;
            const nextWeekday =
              parsed.weekdays.length > 0
                ? DAY_CHARS[parsed.weekdays[0]]
                : DAY_CHARS[currentTime.getDay()];
            const nextSession = nextWeekSessionByCourse.get(offering.id);
            const nextMode: ClassSessionMode = nextSession?.mode ?? "in_person";
            const isSavingThis = savingNextMode?.startsWith(`${offering.id}__`);
            return (
              <div
                key={offering.id}
                className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex-1 text-[13px]">
                    <p className="font-medium text-emerald-900">
                      오늘도 <b>{offering.courseName}</b> 수업 들으시느라 고생하셨습니다.
                    </p>
                    <p className="text-[11px] text-emerald-800/70">
                      오늘 수업에 대한 메모 또는 할 일을 남겨둘까요?
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setMemoDraft({
                          courseOfferingId: offering.id,
                          courseName: offering.courseName,
                          date: actualToday,
                          content: "",
                        })
                      }
                    >
                      <NotebookPen size={12} className="mr-1" /> 메모
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setTodoDraft({
                          courseOfferingId: offering.id,
                          courseName: offering.courseName,
                          sessionDate: actualToday,
                          type: "assignment",
                          content: "",
                          dueDate: addDaysYmd(actualToday, 6),
                        })
                      }
                    >
                      <ListChecks size={12} className="mr-1" /> 할 일
                    </Button>
                    <button
                      type="button"
                      onClick={() =>
                        setDismissedToday((p) => ({ ...p, [offering.id]: true }))
                      }
                      className="rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      닫기
                    </button>
                  </div>
                </div>

                {/* 다음주 수업 형태 편집 */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-emerald-200/60 pt-2">
                  <span className="text-[11px] font-medium text-emerald-900">
                    다음주 {nextWeekday}요일 ({nextWeekDate}) 수업 형태:
                  </span>
                  {(["in_person", "zoom", "assignment", "cancelled", "exam"] as ClassSessionMode[]).map(
                    (m) => {
                      const active = nextMode === m;
                      const saving = savingNextMode === `${offering.id}__${m}`;
                      return (
                        <button
                          key={m}
                          type="button"
                          disabled={!!isSavingThis}
                          onClick={() => setNextWeekMode(offering.id, m)}
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[10px] transition-colors",
                            active
                              ? cn(
                                  MODE_BADGE[m],
                                  "border-current/30 ring-1 ring-current/30 font-medium",
                                )
                              : "border-emerald-200 bg-white text-emerald-700/70 hover:border-emerald-300 hover:bg-emerald-50",
                            isSavingThis && !saving && "opacity-50",
                          )}
                        >
                          {saving ? "저장중…" : CLASS_SESSION_MODE_LABELS[m]}
                        </button>
                      );
                    },
                  )}
                  {!nextSession && (
                    <span className="text-[10px] text-emerald-700/60">
                      (기본: 대면 — 변경하려면 클릭)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 하단: 설정 + 내 수강기록 */}
      <div className="mt-3 flex items-center justify-end gap-2 border-t pt-2">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="타임라인 시간대 설정"
        >
          <Settings size={12} />
          시간대 설정
        </button>
        <Link
          href="/courses?tab=mine"
          className="text-[11px] text-muted-foreground hover:text-primary"
        >
          내 수강기록 →
        </Link>
      </div>

      {/* 시간대 설정 Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>일간 타임라인 시간대 설정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              일간 뷰에서 표시할 시간대를 선택하세요. 설정은 이 브라우저에만 저장됩니다.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-muted-foreground">시작 시간</span>
                <select
                  value={hourStart}
                  onChange={(e) => {
                    const s = Number(e.target.value);
                    const newEnd = hourEnd <= s ? Math.min(24, s + 1) : hourEnd;
                    saveHourRange(s, newEnd);
                  }}
                  className="rounded border px-2 py-1.5 text-sm"
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-muted-foreground">종료 시간</span>
                <select
                  value={hourEnd}
                  onChange={(e) => saveHourRange(hourStart, Number(e.target.value))}
                  className="rounded border px-2 py-1.5 text-sm"
                >
                  {Array.from({ length: 24 - hourStart }, (_, i) => hourStart + 1 + i).map((h) => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={() => saveHourRange(DEFAULT_HOUR_START, DEFAULT_HOUR_END)}
              className="text-[11px] text-muted-foreground underline hover:text-foreground"
            >
              기본값(17:00~00:00)으로 되돌리기
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 빠른 메모 Dialog */}
      <Dialog open={!!memoDraft} onOpenChange={(o) => !o && setMemoDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{memoDraft?.courseName} — 수업 메모</DialogTitle>
          </DialogHeader>
          {memoDraft && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {memoDraft.date} 수업에 대한 개인 메모입니다.
              </p>
              <textarea
                value={memoDraft.content}
                onChange={(e) =>
                  setMemoDraft({ ...memoDraft, content: e.target.value })
                }
                rows={6}
                autoFocus
                className="w-full rounded-md border bg-white px-3 py-2 text-sm"
                placeholder="오늘 수업에서 배운 내용, 느낀 점, 질문 등을 자유롭게 기록하세요."
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemoDraft(null)}>
              취소
            </Button>
            <Button onClick={saveQuickMemo} disabled={savingMemo}>
              {savingMemo ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 빠른 할 일 Dialog */}
      <Dialog open={!!todoDraft} onOpenChange={(o) => !o && setTodoDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{todoDraft?.courseName} — 할 일 추가</DialogTitle>
          </DialogHeader>
          {todoDraft && (
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">유형</span>
                <div className="flex flex-wrap gap-1">
                  {TODO_TYPE_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTodoDraft({ ...todoDraft, type: t })}
                      className={`rounded-md px-2 py-1 text-[11px] ${
                        todoDraft.type === t
                          ? COURSE_TODO_TYPE_COLORS[t] + " ring-1 ring-offset-1 ring-primary/40"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {COURSE_TODO_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">내용</span>
                <Input
                  value={todoDraft.content}
                  onChange={(e) =>
                    setTodoDraft({ ...todoDraft, content: e.target.value })
                  }
                  autoFocus
                  placeholder="예) Dewey 챕터 2 읽기"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">기한 (선택)</span>
                <Input
                  type="date"
                  value={todoDraft.dueDate}
                  onChange={(e) =>
                    setTodoDraft({ ...todoDraft, dueDate: e.target.value })
                  }
                />
              </label>
              <p className="text-[10px] text-muted-foreground">
                이 할 일은 {todoDraft.sessionDate} 수업({todoDraft.courseName})에 연결됩니다.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTodoDraft(null)}>
              취소
            </Button>
            <Button onClick={saveQuickTodo} disabled={savingTodo}>
              {savingTodo ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────────── Daily ───────────── */

function DailyGrid({
  placed,
  placedActivities,
  undated,
  undatedActivities,
  hourRows,
  totalHeight,
  nowPx,
  nowLabel,
}: {
  placed: PlacedClass[];
  placedActivities: PlacedActivity[];
  undated: { offering: CourseOffering; parsed: ParsedSchedule }[];
  undatedActivities: {
    activity: Activity;
    progress: ActivityProgress;
    isLeader: boolean;
    reason: "untimed" | "out_of_range";
  }[];
  hourRows: number[];
  totalHeight: number;
  nowPx: number | null;
  nowLabel: string;
}) {
  return (
    <>
      <div className="mt-4 grid gap-0" style={{ gridTemplateColumns: "44px 1fr" }}>
        {/* 시간 라벨 */}
        <div className="relative" style={{ height: totalHeight }}>
          {hourRows.map((h, i) => (
            <div
              key={h}
              className="absolute right-2 -translate-y-2 text-[11px] font-medium text-muted-foreground"
              style={{ top: i * ROW_HEIGHT_PX }}
            >
              {h === 24 ? "00:00" : `${h}:00`}
            </div>
          ))}
        </div>

        {/* 카드 영역 */}
        <div
          className="relative border-l border-muted"
          style={{ height: totalHeight }}
        >
          {hourRows.slice(1).map((h, i) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-dashed border-muted/60"
              style={{ top: (i + 1) * ROW_HEIGHT_PX }}
            />
          ))}
          {nowPx !== null && (
            <div
              className="absolute left-0 right-0 z-10 border-t-2 border-primary/60"
              style={{ top: nowPx }}
            >
              <span className="absolute -top-2 -left-1 h-2 w-2 rounded-full bg-primary" />
              <span className="absolute -top-2.5 left-2 rounded bg-primary px-1 py-0.5 text-[9px] font-medium tabular-nums text-white">
                {nowLabel}
              </span>
            </div>
          )}
          {placed.map(
            ({ offering: c, parsed, session, mode, topPx, heightPx }) => {
              const compact = heightPx < 80;
              const timeLabel = fmtTimeRange(parsed) || c.schedule || "";
              const isCancelled = mode === "cancelled";
              return (
                <Link
                  key={c.id}
                  href={`/courses/${c.id}/schedule`}
                  aria-label={`${c.courseName} 강의 스케줄로 이동`}
                  className={cn(
                    "absolute left-3 right-3 block overflow-hidden rounded-xl border border-l-4 bg-white p-3 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer",
                    MODE_BORDER[mode],
                    isCancelled && "opacity-70",
                  )}
                  style={{ top: topPx, height: Math.max(heightPx, 64) }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p
                          className={cn(
                            "truncate text-sm font-semibold",
                            isCancelled && "line-through text-muted-foreground",
                          )}
                        >
                          {c.courseName}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            MODE_BADGE[mode],
                          )}
                        >
                          {CLASS_SESSION_MODE_LABELS[mode]}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {timeLabel}
                        {c.professor && ` · ${c.professor}`}
                        {c.classroom && ` · ${c.classroom}`}
                      </p>
                      {!compact && session?.notes && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                          📝 {session.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {session?.link && !isCancelled && (
                        <a
                          href={session.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/5"
                        >
                          입장 <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                </Link>
              );
            },
          )}
          {placedActivities.map(({ activity, progress, topPx, heightPx, isLeader, mode }) => {
            const compact = heightPx < 80;
            const typePath = ACTIVITY_TYPE_PATH[activity.type];
            const timeLabel =
              progress.startTime && progress.endTime
                ? `${progress.startTime}~${progress.endTime}`
                : progress.startTime || "";
            return (
              <Link
                key={progress.id}
                href={`/activities/${typePath}/${activity.id}`}
                aria-label={`${activity.title} ${progress.week}주차 활동으로 이동`}
                className={cn(
                  "absolute left-3 right-3 block overflow-hidden rounded-xl border border-l-4 bg-white p-3 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 cursor-pointer",
                  ACTIVITY_MODE_BORDER[mode],
                )}
                style={{ top: topPx, height: Math.max(heightPx, 64) }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                        {ACTIVITY_TYPE_LABEL[activity.type]} · {progress.week}주차
                      </span>
                      <p className="truncate text-sm font-semibold">
                        {activity.title}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          ACTIVITY_MODE_BADGE[mode],
                        )}
                      >
                        {ACTIVITY_PROGRESS_MODE_LABELS[mode]}
                      </span>
                      {isLeader && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          운영진
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {timeLabel}
                      {progress.title && ` · ${progress.title}`}
                    </p>
                    {!compact && progress.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {progress.description}
                      </p>
                    )}
                  </div>
                  <Users size={14} className="shrink-0 text-violet-600" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {undated.length > 0 && (
        <div className="mt-4 rounded-lg border border-dashed bg-muted/30 p-3 text-xs">
          <p className="font-medium text-muted-foreground">
            시간 미정 ({undated.length}개)
          </p>
          <ul className="mt-1.5 space-y-1">
            {undated.map(({ offering }) => (
              <li
                key={offering.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">
                  {offering.courseName}
                  {offering.professor && (
                    <span className="ml-1 text-muted-foreground">
                      · {offering.professor}
                    </span>
                  )}
                  {offering.schedule && (
                    <span className="ml-1 text-muted-foreground">
                      ({offering.schedule})
                    </span>
                  )}
                </span>
                <Link
                  href={`/courses/${offering.id}/schedule`}
                  className="shrink-0 text-primary hover:underline"
                >
                  스케줄 →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {undatedActivities.length > 0 && (
        <div className="mt-3 rounded-lg border border-dashed border-violet-200 bg-violet-50/40 p-3 text-xs">
          <p className="font-medium text-violet-800">
            오늘 학술활동 (그리드 외 · {undatedActivities.length}개)
          </p>
          <ul className="mt-1.5 space-y-1">
            {undatedActivities.map(({ activity, progress, isLeader, reason }) => {
              const typePath = ACTIVITY_TYPE_PATH[activity.type];
              const reasonLabel =
                reason === "untimed" ? "시간 미정" : "시간표 시간외";
              return (
                <li
                  key={progress.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="mr-1 inline-flex items-center gap-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                      {ACTIVITY_TYPE_LABEL[activity.type]} · {progress.week}주차
                    </span>
                    <span className="mr-1 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                      {reasonLabel}
                    </span>
                    <span className="font-medium">{activity.title}</span>
                    {progress.title && (
                      <span className="ml-1 text-muted-foreground">· {progress.title}</span>
                    )}
                    {progress.startTime && progress.endTime && (
                      <span className="ml-1 text-muted-foreground">
                        ({progress.startTime}~{progress.endTime})
                      </span>
                    )}
                    {progress.startTime && !progress.endTime && (
                      <span className="ml-1 text-muted-foreground">({progress.startTime}~)</span>
                    )}
                    {isLeader && (
                      <span className="ml-1 rounded bg-amber-100 px-1 py-0 text-[10px] font-medium text-amber-700">
                        운영진
                      </span>
                    )}
                  </span>
                  <Link
                    href={`/activities/${typePath}/${activity.id}`}
                    className="shrink-0 text-violet-700 hover:underline"
                  >
                    열기 →
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

/* ───────────── Weekly ───────────── */

function WeeklyGrid({
  placedWeekly,
  placedWeeklyActivities,
  undatedActivities,
  hourRows,
  totalHeight,
  actualToday,
  nowPx,
  nowLabel,
  onResetSession,
}: {
  placedWeekly: Array<{ date: Date; dayIndex: number; items: PlacedClass[] }>;
  placedWeeklyActivities: Map<string, PlacedActivity[]>;
  undatedActivities: {
    activity: Activity;
    progress: ActivityProgress;
    isLeader: boolean;
    reason: "untimed" | "out_of_range" | "weekend";
  }[];
  hourRows: number[];
  totalHeight: number;
  actualToday: string;
  nowPx: number | null;
  nowLabel: string;
  onResetSession?: (sessionId: string, label: string) => void;
}) {
  const hasAny =
    placedWeekly.some((d) => d.items.length > 0) ||
    Array.from(placedWeeklyActivities.values()).some((arr) => arr.length > 0) ||
    undatedActivities.length > 0;
  return (
    <>
      <div className="mt-4 overflow-x-auto">
        <div
          className="grid min-w-[640px] gap-0"
          style={{ gridTemplateColumns: `44px repeat(${placedWeekly.length}, 1fr)` }}
        >
          {/* 헤더 행 */}
          <div />
          {placedWeekly.map(({ date, dayIndex }) => {
            const isToday = ymd(date) === actualToday;
            return (
              <div
                key={ymd(date)}
                className={cn(
                  "border-l border-muted px-2 pb-2 text-center text-[11px]",
                  isToday ? "font-bold text-primary" : "text-muted-foreground",
                )}
              >
                <div>{DAY_CHARS[dayIndex]}</div>
                <div className="text-[10px]">
                  {date.getMonth() + 1}/{date.getDate()}
                </div>
              </div>
            );
          })}

          {/* 시간 라벨 컬럼 */}
          <div className="relative" style={{ height: totalHeight }}>
            {hourRows.map((h, i) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-2 text-[11px] font-medium text-muted-foreground"
                style={{ top: i * ROW_HEIGHT_PX }}
              >
                {h}:00
              </div>
            ))}
          </div>

          {/* 요일 컬럼들 */}
          {placedWeekly.map(({ date, items }) => {
            const isToday = ymd(date) === actualToday;
            const dayActivities = placedWeeklyActivities.get(ymd(date)) ?? [];
            return (
              <div
                key={ymd(date)}
                className={cn(
                  "relative border-l border-muted",
                  isToday && "bg-primary/[0.02]",
                )}
                style={{ height: totalHeight }}
              >
                {/* 시간 가이드 라인 */}
                {hourRows.slice(1).map((h, i) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-dashed border-muted/60"
                    style={{ top: (i + 1) * ROW_HEIGHT_PX }}
                  />
                ))}
                {/* 오늘 컬럼에만 NOW 라인 */}
                {isToday && nowPx !== null && (
                  <div
                    className="absolute left-0 right-0 z-10 border-t-2 border-primary/60"
                    style={{ top: nowPx }}
                  >
                    <span className="absolute -top-2 -left-1 h-2 w-2 rounded-full bg-primary" />
                    <span className="absolute -top-2.5 left-2 rounded bg-primary px-1 py-0.5 text-[9px] font-medium tabular-nums text-white">
                      {nowLabel}
                    </span>
                  </div>
                )}
                {/* 카드들 */}
                {items.map(({ offering: c, parsed, session, mode, topPx, heightPx }) => {
                  const isCancelled = mode === "cancelled";
                  const timeLabel = fmtTimeRange(parsed);
                  // 변경 기록이 있고 기본(in_person)이 아닐 때 — 1클릭 복원 버튼 노출
                  const hasOverride = session && session.mode !== "in_person";
                  return (
                    <div
                      key={c.id}
                      className="absolute left-1 right-1"
                      style={{ top: topPx, height: Math.max(heightPx, 40) }}
                    >
                      <Link
                        href={`/courses/${c.id}/schedule`}
                        className={cn(
                          "block h-full overflow-hidden rounded-md border border-l-4 bg-white p-1.5 text-[10px] shadow-sm transition-shadow hover:shadow",
                          MODE_BORDER[mode],
                          isCancelled && "opacity-60",
                        )}
                      >
                        <p
                          className={cn(
                            "truncate text-[11px] font-semibold leading-tight",
                            isCancelled && "line-through text-muted-foreground",
                          )}
                        >
                          {c.courseName}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {timeLabel}
                        </p>
                        {c.classroom && (
                          <p className="truncate text-[10px] text-muted-foreground">
                            {c.classroom}
                          </p>
                        )}
                      </Link>
                      {hasOverride && session && onResetSession && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onResetSession(
                              session.id,
                              `${c.courseName} ${session.date}`,
                            );
                          }}
                          aria-label="변경 기록 삭제 (대면으로 복원)"
                          title="변경 기록 삭제 — 기본 대면으로 복원"
                          className="absolute right-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-white/95 text-amber-700 shadow-sm hover:bg-amber-50"
                        >
                          <RotateCcw size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {/* 학술활동 진행현황 카드 */}
                {dayActivities.map(({ activity, progress, topPx, heightPx, isLeader, mode }) => {
                  const typePath = ACTIVITY_TYPE_PATH[activity.type];
                  return (
                    <Link
                      key={progress.id}
                      href={`/activities/${typePath}/${activity.id}`}
                      className={cn(
                        "absolute left-1 right-1 overflow-hidden rounded-md border border-l-4 bg-white p-1.5 text-[10px] shadow-sm transition-shadow hover:shadow",
                        ACTIVITY_MODE_BORDER[mode],
                      )}
                      style={{ top: topPx, height: Math.max(heightPx, 40) }}
                    >
                      <div className="flex items-center gap-1">
                        <span className="shrink-0 rounded bg-violet-100 px-1 py-0 text-[9px] font-medium text-violet-700">
                          {ACTIVITY_TYPE_LABEL[activity.type][0]}{progress.week}
                        </span>
                        {isLeader && (
                          <span className="shrink-0 rounded bg-amber-100 px-1 py-0 text-[9px] font-medium text-amber-700">
                            운영
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] font-semibold leading-tight">
                        {activity.title}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {progress.startTime}~{progress.endTime}
                      </p>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {undatedActivities.length > 0 && (
        <div className="mt-3 rounded-lg border border-dashed border-violet-200 bg-violet-50/40 p-3 text-xs">
          <p className="font-medium text-violet-800">
            이번 주 학술활동 (그리드 외 · {undatedActivities.length}개)
          </p>
          <p className="mt-0.5 text-[10px] text-violet-700/80">
            주말(토·일) · 시간 미정 · 시간표 시간외 항목 — 시간표 시간 범위를 넓히면 그리드에 표시됩니다.
          </p>
          <ul className="mt-1.5 space-y-1">
            {undatedActivities.map(({ activity, progress, isLeader, reason }) => {
              const typePath = ACTIVITY_TYPE_PATH[activity.type];
              const reasonLabel =
                reason === "weekend"
                  ? "주말"
                  : reason === "untimed"
                    ? "시간 미정"
                    : "시간표 시간외";
              return (
                <li
                  key={progress.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="mr-1 inline-flex items-center gap-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                      {ACTIVITY_TYPE_LABEL[activity.type]} · {progress.week}주차
                    </span>
                    <span className="mr-1 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                      {reasonLabel}
                    </span>
                    <span className="font-medium">{activity.title}</span>
                    {progress.title && (
                      <span className="ml-1 text-muted-foreground">· {progress.title}</span>
                    )}
                    <span className="ml-1 text-muted-foreground">
                      ({progress.date}
                      {progress.startTime && progress.endTime
                        ? ` ${progress.startTime}~${progress.endTime}`
                        : ""}
                      )
                    </span>
                    {isLeader && (
                      <span className="ml-1 rounded bg-amber-100 px-1 py-0 text-[10px] font-medium text-amber-700">
                        운영진
                      </span>
                    )}
                  </span>
                  <Link
                    href={`/activities/${typePath}/${activity.id}`}
                    className="shrink-0 text-violet-700 hover:underline"
                  >
                    열기 →
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {!hasAny && (
        <p className="mt-4 text-sm text-muted-foreground">
          이번 주 평일에 해당하는 수강과목·학술활동 일정이 없습니다.
        </p>
      )}
    </>
  );
}
