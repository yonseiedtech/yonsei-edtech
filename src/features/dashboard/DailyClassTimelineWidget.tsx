"use client";

/**
 * DailyClassTimelineWidget — 대시보드 메인 타임라인 위젯.
 *
 * Phase B 단순 분할: DailyGrid / WeeklyGrid / 공통 타입·상수는
 * `src/features/dashboard/timeline/` 디렉토리로 추출.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, ChevronLeft, ChevronRight, Settings, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
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
  ACTIVITY_PROGRESS_MODE_LABELS,
  type ClassSession,
  type ClassSessionMode,
  type CourseOffering,
  type CourseTodo,
  type Activity,
  type ActivityProgress,
  type ActivityProgressMode,
} from "@/types";
import { inferCurrentSemester } from "@/lib/semester";
import { parseSchedule, fmtTimeRange } from "@/lib/courseSchedule";
import { resolveOfferingPeriod, isDateInPeriod } from "@/lib/semesterWeeks";
import VacationModeCard from "@/features/dashboard/VacationModeCard";
import { cn } from "@/lib/utils";
import { DailyGrid } from "./timeline/DailyGrid";
import { WeeklyGrid } from "./timeline/WeeklyGrid";
import { MonthlyGrid } from "./timeline/MonthlyGrid";
import { useSeminars } from "@/features/seminar/useSeminar";
import {
  HourRangeSettingsDialog,
  QuickMemoDialog,
  QuickTodoDialog,
  type QuickMemoDraft,
  type QuickTodoDraft,
} from "./timeline/TimelineDialogs";
import { FinishedClassPrompts } from "./timeline/FinishedClassPrompts";
import {
  ACTIVITY_MODE_BORDER,
  DAY_CHARS,
  DEFAULT_HOUR_END,
  DEFAULT_HOUR_START,
  HOUR_RANGE_STORAGE_KEY,
  MODE_BORDER,
  // MODE_BADGE 는 FinishedClassPrompts.tsx 로 이관
  ROW_HEIGHT_PX,
  TIMELINE_MIN_CONTENT_PX,
  VIEW_STORAGE_KEY,
  WEEK_DAY_INDICES,
  addDaysYmd,
  formatHour,
  inferSeminarMode,
  parseHHMM,
  pickLatestSession,
  semesterToTerm,
  ymd,
  type MonthSeminar,
  type PlacedActivity,
  type PlacedClass,
  type ViewMode,
} from "./timeline/types";

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
      if (saved === "daily" || saved === "weekly" || saved === "monthly") {
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
  // 사용자 설정 기준 시간 범위 (분 단위) — 실제 그리드 범위는 effHourRange에서 자동 확장

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

  // 현재 시각 위치 (분 단위) — nowPx는 effHourRange 계산 후 다시 정의된다
  const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
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
    staleTime: 5 * 60_000,
  });

  const courseIds = useMemo(() => {
    return (enrollmentsRes?.data ?? [])
      .filter((e) => e.year === year && e.term === term)
      .map((e) => e.courseOfferingId);
  }, [enrollmentsRes, year, term]);

  const { data: offeringsRes, isLoading: loadingOfferings } = useQuery({
    queryKey: ["course-offerings", year, term],
    queryFn: () => courseOfferingsApi.listBySemester(year, term),
    staleTime: 5 * 60_000,
  });

  const myOfferings: CourseOffering[] = useMemo(() => {
    return (offeringsRes?.data ?? []).filter((o) => courseIds.includes(o.id));
  }, [offeringsRes, courseIds]);

  // 모든 강의 + 파싱 결과 + 수업 기간(개강~종강) — 방학 처리 (학기설정 기능)
  const allParsedOfferings = useMemo(
    () =>
      myOfferings.map((o) => {
        const parsed = parseSchedule(o.schedule);
        const period = resolveOfferingPeriod({
          year,
          term,
          weekdays: parsed.weekdays,
          semesterStartDate: o.semesterStartDate,
          semesterEndDate: o.semesterEndDate,
          totalWeeks: o.totalWeeks,
        });
        return { offering: o, parsed, period };
      }),
    [myOfferings, year, term],
  );
  const selYmd = ymd(selectedDate);
  // 선택일이 수업 기간 안인 과목만 시간표에 반영
  const parsedOfferings = useMemo(
    () => allParsedOfferings.filter(({ period }) => isDateInPeriod(period, selYmd)),
    [allParsedOfferings, selYmd],
  );
  // 방학 판정 — 등록 과목은 있으나 전부 종강(선택일이 모든 종강일 이후)
  const isVacation = useMemo(
    () =>
      allParsedOfferings.length > 0 &&
      parsedOfferings.length === 0 &&
      allParsedOfferings.every(({ period }) => selYmd > period.endDate),
    [allParsedOfferings, parsedOfferings.length, selYmd],
  );
  // 개강 전 판정 — 등록 과목은 있으나 아직 모든 개강일 이전 ("수강과목 없음" 오표시 방지)
  const isBeforeStart = useMemo(
    () =>
      allParsedOfferings.length > 0 &&
      parsedOfferings.length === 0 &&
      allParsedOfferings.every(({ period }) => selYmd < period.startDate),
    [allParsedOfferings, parsedOfferings.length, selYmd],
  );
  const earliestStart = useMemo(
    () =>
      allParsedOfferings.reduce<string | null>(
        (min, { period }) => (min === null || period.startDate < min ? period.startDate : min),
        null,
      ),
    [allParsedOfferings],
  );

  // 사이클 114: 월간 뷰 데이터 — 수업 요일(반복) + 세미나 날짜
  const { seminars: allSeminars } = useSeminars();
  const monthClassWeekdays = useMemo(
    () => Array.from(new Set(parsedOfferings.flatMap((o) => o.parsed.weekdays))),
    [parsedOfferings],
  );
  // 월간 마커용 기간 목록 — 어느 달을 봐도 개강~종강 기간에만 수업 점 표시
  const monthClassPeriods = useMemo(
    () =>
      allParsedOfferings.map(({ parsed, period }) => ({
        weekdays: parsed.weekdays,
        start: period.startDate,
        end: period.endDate,
      })),
    [allParsedOfferings],
  );
  const seminarsByDate = useMemo(() => {
    const map = new Map<string, MonthSeminar[]>();
    (allSeminars ?? []).forEach((s) => {
      if (!s.date) return;
      const arr = map.get(s.date) ?? [];
      arr.push({ id: s.id, title: s.title, mode: inferSeminarMode(s) });
      map.set(s.date, arr);
    });
    return map;
  }, [allSeminars]);

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
    staleTime: 60_000,
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
    staleTime: 60_000,
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
    staleTime: 60_000,
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

  // ── Sprint 41a: 학술활동(스터디/프로젝트/대외) 진행현황을 타임라인에 통합 ──
  // queryKey ["activities", "all"] 로 4개 위젯 캐시 통합 (Phase A queryKey 정리)
  const { data: allActivitiesRes } = useQuery({
    queryKey: ["activities", "all"],
    queryFn: async () => {
      // type 필터 없이 한 번에 가져온 뒤 클라이언트에서 study/project/external 필터
      const res = await activitiesApi.list();
      return res;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  // 내가 참여중인 활동만 (운영진=leaderId 일치 OR participants OR members 포함)
  // 관리자(admin 이상)는 모든 학술활동을 기본으로 본다.
  const isAdmin = isAtLeast(user, "admin");
  const myActivities: Activity[] = useMemo(() => {
    if (!userId) return [];
    const all = (allActivitiesRes?.data ?? []) as Activity[];
    return all.filter((a) => {
      if (a.type !== "study" && a.type !== "project" && a.type !== "external") return false;
      if (isAdmin) return true;
      const isLeader = a.leaderId === userId;
      const inParticipants = (a.participants ?? []).includes(userId);
      const inMembers = (a.members ?? []).includes(userId);
      return isLeader || inParticipants || inMembers;
    });
  }, [allActivitiesRes, userId, isAdmin]);

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
    staleTime: 2 * 60_000,
  });

  const activityById = useMemo(() => {
    const m = new Map<string, Activity>();
    for (const a of myActivities) m.set(a.id, a);
    return m;
  }, [myActivities]);

  // weekly 모드용 — 주(월~일) 날짜 문자열
  const weekDateStrs = useMemo(() => weekDates.map((d) => ymd(d)), [weekDates]);

  // ── 효과적 시간 범위 계산 ──
  // 사용자가 설정한 hourStart~hourEnd를 기준으로 하되,
  // 현재 뷰에 들어오는 수업 + 학술활동의 실제 시작/종료시각이 그 밖에 있으면
  // 자동으로 범위를 확장해서 모두 그리드 안에 표시한다.
  const effHourRange = useMemo(() => {
    let minStart = hourStart * 60;
    let maxEnd = hourEnd * 60;
    const consume = (sm: number | null, em: number | null) => {
      if (sm !== null) minStart = Math.min(minStart, sm);
      if (em !== null) maxEnd = Math.max(maxEnd, em);
    };
    if (viewMode === "daily") {
      for (const { parsed } of todayOfferings) consume(parsed.startMin, parsed.endMin);
      for (const id of myActivityIds) {
        for (const p of progressByActivity[id] ?? []) {
          if (p.date !== today) continue;
          consume(parseHHMM(p.startTime), parseHHMM(p.endTime));
        }
      }
    } else {
      for (const { parsed } of parsedOfferings) consume(parsed.startMin, parsed.endMin);
      const weekSet = new Set(weekDateStrs);
      for (const id of myActivityIds) {
        for (const p of progressByActivity[id] ?? []) {
          if (!weekSet.has(p.date)) continue;
          consume(parseHHMM(p.startTime), parseHHMM(p.endTime));
        }
      }
    }
    const startH = Math.max(0, Math.floor(minStart / 60));
    const endH = Math.min(24, Math.ceil(maxEnd / 60));
    // 안전: end > start 보장
    const safeEnd = endH > startH ? endH : Math.min(24, startH + 1);
    return { startH, endH: safeEnd, startMin: startH * 60, endMin: safeEnd * 60 };
  }, [viewMode, hourStart, hourEnd, todayOfferings, parsedOfferings, myActivityIds, progressByActivity, today, weekDateStrs]);
  const effMinStart = effHourRange.startMin;
  const effMinEnd = effHourRange.endMin;

  // 현재 시각 위치 (분 단위) — effective range 기준으로 NOW 라인 위치 결정
  const nowPx =
    nowMin >= effMinStart && nowMin <= effMinEnd
      ? ((nowMin - effMinStart) / 60) * ROW_HEIGHT_PX
      : null;

  // daily 수업 배치
  const placedDaily: PlacedClass[] = useMemo(() => {
    const result: PlacedClass[] = [];
    for (const { offering, parsed } of todayOfferings) {
      if (parsed.startMin === null || parsed.endMin === null) continue;
      const s = Math.max(effMinStart, parsed.startMin);
      const e = Math.min(effMinEnd, parsed.endMin);
      if (e <= s) continue;
      const session = pickLatestSession(dailySessionsByCourse.get(offering.id) ?? []);
      const mode: ClassSessionMode = session?.mode ?? "in_person";
      result.push({
        offering,
        parsed,
        session,
        mode,
        topPx: ((s - effMinStart) / 60) * ROW_HEIGHT_PX,
        heightPx: ((e - s) / 60) * ROW_HEIGHT_PX,
      });
    }
    return result;
  }, [todayOfferings, dailySessionsByCourse, effMinStart, effMinEnd]);

  const undated = useMemo(() => {
    return todayOfferings.filter(
      ({ parsed }) => parsed.startMin === null || parsed.endMin === null,
    );
  }, [todayOfferings]);

  // weekly 수업 배치 — 요일별
  const placedWeekly: Array<{
    date: Date;
    dayIndex: number;
    items: PlacedClass[];
  }> = useMemo(() => {
    return weekDates.map((d) => {
      const dayIdx = d.getDay();
      const dateStr = ymd(d);
      const items: PlacedClass[] = [];
      // 주 전체가 아니라 '각 날짜'가 수업 기간 안일 때만 배치 — 종강일이 주 중간에 걸려도 정확
      for (const { offering, parsed, period } of allParsedOfferings) {
        if (!isDateInPeriod(period, dateStr)) continue;
        if (!parsed.weekdays.includes(dayIdx)) continue;
        if (parsed.startMin === null || parsed.endMin === null) continue;
        const s = Math.max(effMinStart, parsed.startMin);
        const e = Math.min(effMinEnd, parsed.endMin);
        if (e <= s) continue;
        const sessions = weeklySessionsByDateCourse.get(`${dateStr}__${offering.id}`) ?? [];
        const session = pickLatestSession(sessions);
        const mode: ClassSessionMode = session?.mode ?? "in_person";
        items.push({
          offering,
          parsed,
          session,
          mode,
          topPx: ((s - effMinStart) / 60) * ROW_HEIGHT_PX,
          heightPx: ((e - s) / 60) * ROW_HEIGHT_PX,
        });
      }
      return { date: d, dayIndex: dayIdx, items };
    });
  }, [weekDates, allParsedOfferings, weeklySessionsByDateCourse, effMinStart, effMinEnd]);

  // daily 활동 배치 — 오늘(today) date 매칭 + 시작/종료시간 있는 것만
  // 시간 미정 항목은 그리드에 표시 불가 → 활동 페이지에서 직접 확인
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
        const s = Math.max(effMinStart, startMin);
        const e = Math.min(effMinEnd, endMin);
        if (e <= s) continue;
        result.push({
          activity: a,
          progress: p,
          startMin,
          endMin,
          topPx: ((s - effMinStart) / 60) * ROW_HEIGHT_PX,
          heightPx: ((e - s) / 60) * ROW_HEIGHT_PX,
          isLeader: a.leaderId === userId,
          mode: p.mode ?? "in_person",
        });
      }
    }
    return result.sort((x, y) => x.startMin - y.startMin);
  }, [myActivityIds, activityById, progressByActivity, today, effMinStart, effMinEnd, userId]);

  // weekly 활동 배치 — 주의 월~일 모두 매칭 (주말 활동도 일반 수업처럼 인라인 표시)
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
        const s = Math.max(effMinStart, startMin);
        const e = Math.min(effMinEnd, endMin);
        if (e <= s) continue;
        byDate.get(p.date)!.push({
          activity: a,
          progress: p,
          startMin,
          endMin,
          topPx: ((s - effMinStart) / 60) * ROW_HEIGHT_PX,
          heightPx: ((e - s) / 60) * ROW_HEIGHT_PX,
          isLeader: a.leaderId === userId,
          mode: p.mode ?? "in_person",
        });
      }
    }
    for (const arr of byDate.values()) arr.sort((x, y) => x.startMin - y.startMin);
    return byDate;
  }, [weekDateStrs, myActivityIds, activityById, progressByActivity, effMinStart, effMinEnd, userId]);

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
    { length: effHourRange.endH - effHourRange.startH + 1 },
    (_, i) => effHourRange.startH + i,
  );
  const totalHeight = ROW_HEIGHT_PX * (effHourRange.endH - effHourRange.startH);

  const currentWeekContainsToday = weekDates.some((d) => ymd(d) === actualToday);
  const headerTitle =
    viewMode === "daily"
      ? isShowingToday
        ? "오늘의 수업"
        : `${dateLabel} 수업`
      : currentWeekContainsToday
        ? "이번 주 수업"
        : "선택 주 수업";
  const hourRangeLabel = `${formatHour(effHourRange.startH)}~${formatHour(effHourRange.endH)}`;
  const headerLabel =
    viewMode === "daily"
      ? `${dateLabel} · ${semesterLabel} · ${hourRangeLabel}`
      : `${weekDates[0]?.getMonth() + 1}/${weekDates[0]?.getDate()} ~ ${weekDates[6]?.getMonth() + 1}/${weekDates[6]?.getDate()} · ${semesterLabel}`;

  // 분할 전부터 dead code 였던 항목들(주간 할 일 영역은 MyTodosWidget 로 이관됨) — 위젯 외부 데이터 인터페이스 보존 목적으로
  // 데이터 useQuery / 헬퍼는 유지하되, 미사용 식별자 경고는 명시적으로 무력화.
  void relevantTodos;
  void incompleteCount;
  void courseNameById;
  void toggleWeekTodo;

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-primary" />
          <div className="leading-tight">
            <h2 className="font-bold">{headerTitle}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{headerLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 날짜 네비게이션 (월간에선 MonthlyGrid 자체 네비 사용 → 숨김) */}
          <div className={cn("flex items-center gap-0.5 rounded-lg border p-0.5", viewMode === "monthly" && "hidden")}>
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
            <button
              onClick={() => handleSetView("monthly")}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                viewMode === "monthly"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              월간
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

      {/* 콘텐츠 영역 — 일/주/월 전환 시 점프 방지를 위해 주간 기준 min-height 고정.
          MonthlyGrid 는 자체적으로 동일 min-height 를 적용하므로 여기서는 daily/weekly·로딩만 감싼다. */}
      <div
        className={cn(viewMode !== "monthly" && "flex flex-col")}
        style={viewMode !== "monthly" ? { minHeight: TIMELINE_MIN_CONTENT_PX } : undefined}
      >
      {isLoading ? (
        <div className="mt-4 h-72 animate-pulse rounded-lg bg-muted" />
      ) : viewMode === "monthly" ? (
        <MonthlyGrid
          classWeekdays={monthClassWeekdays}
          classPeriods={monthClassPeriods}
          seminarsByDate={seminarsByDate}
          todayYmd={actualToday}
          onPickDate={(d) => {
            setSelectedDate(new Date(d));
            handleSetView("daily");
          }}
        />
      ) : viewMode === "daily" ? (
        todayOfferings.length === 0 &&
        placedDailyActivities.length === 0 ? (
          isVacation ? (
            <VacationModeCard semesterLabel={semesterLabel} term={term} year={year} />
          ) : isBeforeStart ? (
            <div className="mt-4 rounded-2xl border border-dashed bg-muted/20 p-4 text-sm">
              <p className="font-medium">{semesterLabel} 개강 전입니다.</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                등록된 수강과목 {allParsedOfferings.length}건은 개강일
                {earliestStart ? ` (${earliestStart})` : ""}부터 시간표에 표시됩니다.
              </p>
            </div>
          ) : parsedOfferings.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed bg-muted/20 p-4 text-sm">
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
            <div className="mt-4 rounded-2xl border border-dashed bg-muted/10 p-4 text-sm">
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
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-1.5">
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
                className="mt-3 inline-flex items-center gap-1 rounded-md border bg-card px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/5"
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
          hourRows={hourRows}
          totalHeight={totalHeight}
          actualToday={actualToday}
          nowPx={nowPx}
          nowLabel={nowLabel}
          onResetSession={handleResetSession}
        />
      )}
      </div>

      {/* 수업 할 일 영역은 대시보드의 "나의 할 일" 위젯으로 통합됨 (MyTodosWidget) */}

      {/* 수업 종료 후 메모·할 일 프롬프트 (오늘 뷰에서만) */}
      {viewMode === "daily" && isViewingToday && (
        <FinishedClassPrompts
          finishedToday={finishedToday}
          dismissedToday={dismissedToday}
          currentTime={currentTime}
          nextWeekDate={nextWeekDate}
          nextWeekSessionByCourse={nextWeekSessionByCourse}
          savingNextMode={savingNextMode}
          onMemo={(offering) =>
            setMemoDraft({
              courseOfferingId: offering.id,
              courseName: offering.courseName,
              date: actualToday,
              content: "",
            })
          }
          onTodo={(offering) =>
            setTodoDraft({
              courseOfferingId: offering.id,
              courseName: offering.courseName,
              sessionDate: actualToday,
              type: "assignment",
              content: "",
              dueDate: addDaysYmd(actualToday, 6),
            })
          }
          onDismiss={(offeringId) =>
            setDismissedToday((p) => ({ ...p, [offeringId]: true }))
          }
          onSetNextMode={setNextWeekMode}
        />
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

      {/* Dialog 3종 — TimelineDialogs.tsx 로 분할 */}
      <HourRangeSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        hourStart={hourStart}
        hourEnd={hourEnd}
        onSave={saveHourRange}
      />
      <QuickMemoDialog
        draft={memoDraft}
        onChange={setMemoDraft}
        onClose={() => setMemoDraft(null)}
        onSave={saveQuickMemo}
        saving={savingMemo}
      />
      <QuickTodoDialog
        draft={todoDraft}
        onChange={setTodoDraft}
        onClose={() => setTodoDraft(null)}
        onSave={saveQuickTodo}
        saving={savingTodo}
      />
    </div>
  );
}
