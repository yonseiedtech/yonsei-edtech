"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  NotebookPen,
  ListChecks,
  Settings,
  Check,
} from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  classSessionsApi,
  courseEnrollmentsApi,
  courseOfferingsApi,
  courseSessionNotesApi,
  courseTodosApi,
} from "@/lib/bkend";
import { AttendanceChecklist } from "@/components/courses/AttendanceChecklist";
import { CourseAttendanceStats } from "@/components/courses/CourseAttendanceStats";
import { summarizeAttendance, isAttendanceEnabled } from "@/lib/attendance";
import {
  CLASS_SESSION_MODE_LABELS,
  COURSE_TODO_TYPE_LABELS,
  COURSE_TODO_TYPE_COLORS,
  type ClassSession,
  type ClassSessionMode,
  type CourseOffering,
  type CourseSessionNote,
  type CourseTodo,
  type CourseTodoType,
} from "@/types";
import PageHeader from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
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
import { cn } from "@/lib/utils";
import { isStaffOrAbove } from "@/lib/permissions";
import { parseSchedule } from "@/lib/courseSchedule";
import {
  buildSemesterWeeks,
  inferSemesterStartDate,
  DEFAULT_TOTAL_WEEKS,
  findCurrentCalendarWeek,
  getCalendarWeekRange,
  type WeekRange,
} from "@/lib/semesterWeeks";

const MODE_OPTIONS: ClassSessionMode[] = [
  "in_person",
  "zoom",
  "assignment",
  "cancelled",
  "exam",
];

const MODE_COLORS: Record<ClassSessionMode, string> = {
  in_person: "bg-emerald-50 text-emerald-700 border-emerald-200",
  zoom: "bg-blue-50 text-blue-700 border-blue-200",
  assignment: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  field: "bg-purple-50 text-purple-700 border-purple-200",
  exam: "bg-rose-50 text-rose-700 border-rose-200",
};

/** 비활성 모드 칩 — 항상 모드별 옅은 배경을 입혀 한눈에 구분되게 함 */
const MODE_BTN_DIM: Record<ClassSessionMode, string> = {
  in_person: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  zoom: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  assignment: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
  field: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
  exam: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
};

/** 활성 모드 칩 — 솔리드 배경 + 두꺼운 링으로 강하게 강조 */
const MODE_BTN_ACTIVE: Record<ClassSessionMode, string> = {
  in_person: "bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-300 shadow-sm",
  zoom: "bg-blue-500 text-white border-blue-600 ring-2 ring-blue-300 shadow-sm",
  assignment: "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300 shadow-sm",
  cancelled: "bg-rose-500 text-white border-rose-600 ring-2 ring-rose-300 shadow-sm",
  field: "bg-purple-500 text-white border-purple-600 ring-2 ring-purple-300 shadow-sm",
  exam: "bg-rose-500 text-white border-rose-600 ring-2 ring-rose-300 shadow-sm",
};

const MODE_WEEK_BORDER: Record<ClassSessionMode, string> = {
  in_person: "border-l-emerald-400 bg-emerald-50/30",
  zoom: "border-l-blue-400 bg-blue-50/30",
  assignment: "border-l-amber-400 bg-amber-50/30",
  cancelled: "border-l-rose-400 bg-rose-50/30",
  field: "border-l-purple-400 bg-purple-50/30",
  exam: "border-l-rose-400 bg-rose-50/30",
};

const WEEKDAY_KOR = ["일", "월", "화", "수", "목", "금", "토"];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeClassDatesInWeek(weekStartDate: string, weekdays: number[]): string[] {
  if (!weekdays.length) return [];
  const [y, m, d] = weekStartDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    if (weekdays.includes(cur.getDay())) {
      dates.push(ymd(cur));
    }
  }
  return dates;
}

function formatWeekdayLabel(weekdays: number[]): string {
  if (!weekdays.length) return "수업";
  return weekdays.map((d) => WEEKDAY_KOR[d]).join("·") + "요일";
}

/**
 * 로컬(브라우저 = 일반적으로 KST) 기준 오늘 YYYY-MM-DD.
 * `new Date().toISOString().slice(0,10)`은 UTC 변환 후 자르므로 KST 자정 직후 ~ 09:00 사이
 * 하루 밀린 날짜가 나오는 버그가 있어 별도 헬퍼로 분리.
 */
function todayYmdLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-04-26" → "4/26(일)" — 주차 안의 실제 수업일 표시용 */
function formatClassDate(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${m}/${d}(${WEEKDAY_KOR[dt.getDay()]})`;
}

const TODO_TYPES: CourseTodoType[] = [
  "assignment",
  "paper_reading",
  "paper_writing",
  "presentation_prep",
  "other",
];

interface SessionDraft {
  id?: string;
  date: string;
  mode: ClassSessionMode;
  link: string;
  notes: string;
}

const blankDraft = (date?: string): SessionDraft => ({
  date: date ?? todayYmdLocal(),
  mode: "in_person",
  link: "",
  notes: "",
});

interface TodoDraft {
  id?: string;
  type: CourseTodoType;
  content: string;
  dueDate: string;
  sessionDate?: string;
}

/** 세션 날짜 기준 +6일 (다음 주 동일 요일 수업의 하루 전) */
function defaultDueFromSession(sessionDate?: string): string {
  if (!sessionDate) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sessionDate);
  if (!m) return "";
  const [, y, mo, d] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  dt.setDate(dt.getDate() + 6);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const blankTodoDraft = (sessionDate?: string): TodoDraft => ({
  type: "assignment",
  content: "",
  dueDate: defaultDueFromSession(sessionDate),
  sessionDate,
});

interface NoteDraft {
  id?: string;
  date: string;
  content: string;
}

function ScheduleContent({ courseId }: { courseId: string }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsStart, setSettingsStart] = useState("");
  const [settingsWeeks, setSettingsWeeks] = useState<number>(DEFAULT_TOTAL_WEEKS);
  const [savingSettings, setSavingSettings] = useState(false);

  const [noteDraft, setNoteDraft] = useState<NoteDraft | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [todoDraft, setTodoDraft] = useState<TodoDraft | null>(null);
  const [savingTodo, setSavingTodo] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState<string | null>(null);

  const isStaff = isStaffOrAbove(user);

  const { data: enrollmentsRes } = useQuery({
    queryKey: ["course-enrollments", "by-course", courseId],
    queryFn: () => courseEnrollmentsApi.listByCourse(courseId),
  });
  const myEnrollment = useMemo(() => {
    if (!user) return null;
    return (enrollmentsRes?.data ?? []).find((e) => e.userId === user.id) ?? null;
  }, [enrollmentsRes, user]);
  const isCourseTA = myEnrollment?.role === "ta";
  const master = isStaff || isCourseTA;

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ["course-offering", courseId],
    queryFn: async () => {
      const res = await courseOfferingsApi.get(courseId);
      return res as unknown as CourseOffering;
    },
  });

  const { data: sessionsRes, isLoading: loadingSessions } = useQuery({
    queryKey: ["class-sessions", "by-course", courseId],
    queryFn: () => classSessionsApi.listByCourse(courseId),
  });
  const sessions: ClassSession[] = (sessionsRes?.data ?? []).slice().sort(
    (a, b) => a.date.localeCompare(b.date),
  );

  const { data: notesRes } = useQuery({
    queryKey: ["course-session-notes", courseId, user?.id],
    queryFn: () =>
      user ? courseSessionNotesApi.listByCourseAndUser(courseId, user.id) : null,
    enabled: !!user,
  });
  const notes: CourseSessionNote[] = notesRes?.data ?? [];

  const { data: todosRes } = useQuery({
    queryKey: ["course-todos", courseId, user?.id],
    queryFn: () =>
      user ? courseTodosApi.listByCourseAndUser(courseId, user.id) : null,
    enabled: !!user,
  });
  const todos: CourseTodo[] = todosRes?.data ?? [];

  const parsedSchedule = useMemo(
    () => parseSchedule(course?.schedule),
    [course?.schedule],
  );

  const weeks: WeekRange[] = useMemo(() => {
    if (!course) return [];
    return buildSemesterWeeks({
      year: course.year,
      term: course.term === "spring" ? "spring" : "fall",
      schedule: parsedSchedule,
      semesterStartDate: course.semesterStartDate,
      totalWeeks: course.totalWeeks ?? DEFAULT_TOTAL_WEEKS,
    });
  }, [course, parsedSchedule]);

  const inferredStart = useMemo(() => {
    if (!course) return "";
    return inferSemesterStartDate(
      course.year,
      course.term === "spring" ? "spring" : "fall",
      parsedSchedule.weekdays,
    );
  }, [course, parsedSchedule]);

  // 현재 주차 자동 계산 + 첫 마운트 시 스크롤
  // KST 등 로컬 기준 오늘 — toISOString().slice는 UTC라 자정~09시에 어제로 밀리는 버그가 있어 todayYmdLocal 사용
  // "이번 주" 기준은 달력 주(월~일). 학기 주차 범위(수업일~다음 수업일 전날)와 어긋날 때
  // 사용자 직관(예: 월요일에 보면 같은 주 목요일 수업 = 이번 주)을 우선.
  const todayYmd = useMemo(() => todayYmdLocal(), []);
  const currentWeek = useMemo(
    () => findCurrentCalendarWeek(weeks, todayYmd),
    [weeks, todayYmd],
  );
  const didAutoScrollRef = useRef(false);
  useEffect(() => {
    if (didAutoScrollRef.current) return;
    if (!currentWeek) return;
    const el = document.getElementById(`week-${currentWeek.weekNo}`);
    if (!el) return;
    didAutoScrollRef.current = true;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [currentWeek]);

  function jumpToCurrentWeek() {
    if (!currentWeek) return;
    const el = document.getElementById(`week-${currentWeek.weekNo}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save() {
    if (!draft || !user) return;
    if (!draft.date) {
      toast.error("날짜를 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        courseOfferingId: courseId,
        date: draft.date,
        mode: draft.mode,
        link: draft.link.trim() || undefined,
        notes: draft.notes.trim() || undefined,
      };
      if (draft.id) {
        await classSessionsApi.update(draft.id, payload);
      } else {
        await classSessionsApi.create({ ...payload, createdBy: user.id });
      }
      await qc.invalidateQueries({
        queryKey: ["class-sessions", "by-course", courseId],
      });
      await qc.invalidateQueries({ queryKey: ["class-sessions"] });
      toast.success("저장했습니다.");
      setDraft(null);
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function quickSetWeekMode(args: {
    classDates: string[];
    existing: ClassSession[];
    mode: ClassSessionMode;
  }) {
    if (!user) return;
    if (args.classDates.length === 0) {
      toast.error("강의 시간(요일) 설정이 필요합니다. 콘솔에서 schedule을 등록하세요.");
      return;
    }

    // 모든 수업일이 이미 같은 모드인지 확인 (전부 in_person 기본값일 때도 포함)
    // 같은 date에 여러 row(legacy 중복)가 누적되어 있다면 정합화 대상이므로 false 처리
    const allSame = args.classDates.every((d) => {
      const exs = args.existing.filter((s) => s.date === d);
      if (exs.length === 0) return args.mode === "in_person";
      if (exs.length > 1) return false;
      return exs[0].mode === args.mode;
    });
    if (allSame) {
      toast.info(`이미 ${CLASS_SESSION_MODE_LABELS[args.mode]}(으)로 설정되어 있습니다.`);
      return;
    }

    // ── Optimistic update — 서버 응답을 기다리지 않고 캐시 먼저 변경 ──
    // in_person으로 reset 시 기존 row를 모두 제거(기본값 복귀), 그 외 mode는 첫 row만 유지하고 중복은 삭제
    const queryKey = ["class-sessions", "by-course", courseId];
    const prev = qc.getQueryData<{ data: ClassSession[] }>(queryKey);
    if (prev) {
      let next: ClassSession[] = [...(prev.data ?? [])];
      const nowIso = new Date().toISOString();
      for (const d of args.classDates) {
        const sameDate = next.filter((s) => s.date === d);
        if (args.mode === "in_person") {
          // 기본값(대면)으로 복귀 → 같은 date의 모든 row 제거
          if (sameDate.length > 0) {
            const removeIds = new Set(sameDate.map((s) => s.id));
            next = next.filter((s) => !removeIds.has(s.id));
          }
        } else if (sameDate.length === 0) {
          next.push({
            id: `__optimistic_${d}_${Date.now()}`,
            courseOfferingId: courseId,
            date: d,
            mode: args.mode,
            createdBy: user.id,
            createdAt: nowIso,
            updatedAt: nowIso,
          } as ClassSession);
        } else {
          // 첫 번째 row의 mode 변경, 나머지 중복 row는 제거
          const [keep, ...dups] = sameDate;
          const idxKeep = next.findIndex((s) => s.id === keep.id);
          if (idxKeep >= 0) {
            next[idxKeep] = { ...next[idxKeep], mode: args.mode, updatedAt: nowIso };
          }
          if (dups.length > 0) {
            const removeIds = new Set(dups.map((s) => s.id));
            next = next.filter((s) => !removeIds.has(s.id));
          }
        }
      }
      qc.setQueryData(queryKey, { ...prev, data: next });
    }

    try {
      // 병렬 처리로 속도 개선
      await Promise.all(
        args.classDates.map(async (d) => {
          const exs = args.existing.filter((s) => s.date === d);
          if (args.mode === "in_person") {
            // 대면(기본값)으로 복귀 — 같은 date의 모든 기존 row 삭제하여 stale 데이터 잔존 차단
            for (const ex of exs) {
              await classSessionsApi.delete(ex.id);
            }
            return;
          }
          if (exs.length === 0) {
            await classSessionsApi.create({
              courseOfferingId: courseId,
              date: d,
              mode: args.mode,
              createdBy: user.id,
            });
            return;
          }
          // 첫 번째 row만 유지(update), 나머지 중복은 삭제하여 단일 row 보장
          const [keep, ...dups] = exs;
          if (keep.mode !== args.mode) {
            await classSessionsApi.update(keep.id, { mode: args.mode });
          }
          for (const ex of dups) {
            await classSessionsApi.delete(ex.id);
          }
        }),
      );
      // 정합화 — 임시 ID를 진짜 ID로 교체
      await qc.invalidateQueries({
        queryKey: ["class-sessions", "by-course", courseId],
      });
      await qc.refetchQueries({
        queryKey: ["class-sessions", "by-course", courseId],
        type: "active",
      });
      await qc.invalidateQueries({ queryKey: ["class-sessions"] });
      toast.success(`${CLASS_SESSION_MODE_LABELS[args.mode]}(으)로 변경했습니다.`);
    } catch (e) {
      // 실패 시 캐시 롤백
      if (prev) {
        qc.setQueryData(queryKey, prev);
      }
      console.error("[quickSetWeekMode]", e);
      toast.error(`변경 실패: ${(e as Error).message}`);
    }
  }

  async function remove(s: ClassSession) {
    if (!confirm(`${s.date} 일정을 삭제하시겠습니까?`)) return;
    try {
      await classSessionsApi.delete(s.id);
      await qc.invalidateQueries({
        queryKey: ["class-sessions", "by-course", courseId],
      });
      await qc.invalidateQueries({ queryKey: ["class-sessions"] });
      toast.success("삭제했습니다.");
    } catch (e) {
      toast.error(`삭제 실패: ${(e as Error).message}`);
    }
  }

  async function saveSettings() {
    if (!course) return;
    setSavingSettings(true);
    try {
      const payload: Record<string, unknown> = {
        semesterStartDate: settingsStart || undefined,
        totalWeeks: settingsWeeks,
      };
      await courseOfferingsApi.update(courseId, payload);
      await qc.invalidateQueries({ queryKey: ["course-offering", courseId] });
      await qc.refetchQueries({ queryKey: ["course-offering", courseId] });
      toast.success("개강일/주차 설정을 저장했습니다.");
      setSettingsOpen(false);
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveNote() {
    if (!noteDraft || !user) return;
    const content = noteDraft.content.trim();
    if (!content) {
      toast.error("메모 내용을 입력하세요.");
      return;
    }
    setSavingNote(true);
    try {
      if (noteDraft.id) {
        await courseSessionNotesApi.update(noteDraft.id, {
          content,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await courseSessionNotesApi.create({
          courseOfferingId: courseId,
          date: noteDraft.date,
          userId: user.id,
          content,
        });
      }
      await qc.invalidateQueries({
        queryKey: ["course-session-notes", courseId, user.id],
      });
      await qc.refetchQueries({
        queryKey: ["course-session-notes", courseId, user.id],
      });
      toast.success("메모를 저장했습니다.");
      setNoteDraft(null);
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSavingNote(false);
    }
  }

  async function deleteNote(n: CourseSessionNote) {
    if (!user) return;
    if (!confirm("이 메모를 삭제하시겠습니까?")) return;
    try {
      await courseSessionNotesApi.delete(n.id);
      await qc.invalidateQueries({
        queryKey: ["course-session-notes", courseId, user.id],
      });
      toast.success("삭제했습니다.");
    } catch (e) {
      toast.error(`삭제 실패: ${(e as Error).message}`);
    }
  }

  async function saveTodo() {
    if (!todoDraft || !user) return;
    const content = todoDraft.content.trim();
    if (!content) {
      toast.error("할 일 내용을 입력하세요.");
      return;
    }
    setSavingTodo(true);
    try {
      if (todoDraft.id) {
        await courseTodosApi.update(todoDraft.id, {
          type: todoDraft.type,
          content,
          dueDate: todoDraft.dueDate || undefined,
          sessionDate: todoDraft.sessionDate,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await courseTodosApi.create({
          courseOfferingId: courseId,
          userId: user.id,
          type: todoDraft.type,
          content,
          dueDate: todoDraft.dueDate || undefined,
          sessionDate: todoDraft.sessionDate,
          completed: false,
        });
      }
      await qc.invalidateQueries({
        queryKey: ["course-todos", courseId, user.id],
      });
      await qc.refetchQueries({
        queryKey: ["course-todos", courseId, user.id],
      });
      // 대시보드 "나의 할 일" 위젯과 즉시 동기화
      await qc.invalidateQueries({ queryKey: ["my-course-todos", user.id] });
      toast.success("할 일을 저장했습니다.");
      setTodoDraft(null);
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSavingTodo(false);
    }
  }

  async function toggleTodo(t: CourseTodo) {
    if (!user) return;
    try {
      await courseTodosApi.update(t.id, {
        completed: !t.completed,
        completedAt: !t.completed ? new Date().toISOString() : undefined,
      });
      await qc.invalidateQueries({
        queryKey: ["course-todos", courseId, user.id],
      });
      await qc.invalidateQueries({ queryKey: ["my-course-todos", user.id] });
    } catch (e) {
      toast.error(`변경 실패: ${(e as Error).message}`);
    }
  }

  async function deleteTodo(t: CourseTodo) {
    if (!user) return;
    if (!confirm("이 할 일을 삭제하시겠습니까?")) return;
    try {
      await courseTodosApi.delete(t.id);
      await qc.invalidateQueries({
        queryKey: ["course-todos", courseId, user.id],
      });
      await qc.invalidateQueries({ queryKey: ["my-course-todos", user.id] });
      toast.success("삭제했습니다.");
    } catch (e) {
      toast.error(`삭제 실패: ${(e as Error).message}`);
    }
  }

  function openSettings() {
    if (!course) return;
    setSettingsStart(course.semesterStartDate ?? inferredStart);
    setSettingsWeeks(course.totalWeeks ?? DEFAULT_TOTAL_WEEKS);
    setSettingsOpen(true);
  }

  if (loadingCourse) {
    return (
      <div className="py-16" aria-busy="true" aria-label="과목 정보 불러오는 중">
        <section className="mx-auto max-w-4xl px-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-9 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </section>
        <section className="mx-auto mt-8 max-w-4xl px-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </section>
      </div>
    );
  }
  if (!course) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="과목을 찾을 수 없습니다"
        description="삭제되었거나 권한이 없습니다."
      />
    );
  }

  const today = todayYmdLocal();
  // 달력 주(월~일) 범위 — "이번 주" 판정과 과거/미래 분류에 공통 사용
  const { mondayYmd: thisWeekMonday, sundayYmd: thisWeekSunday } =
    getCalendarWeekRange(today);

  // 주차별 그룹: 세션·메모·할일을 주차에 정렬해 집계
  const sessionsByWeek = new Map<number, ClassSession[]>();
  for (const s of sessions) {
    const wk = weeks.find((w) => s.date >= w.startDate && s.date <= w.endDate);
    if (!wk) continue;
    const arr = sessionsByWeek.get(wk.weekNo) ?? [];
    arr.push(s);
    sessionsByWeek.set(wk.weekNo, arr);
  }

  const notesByWeek = new Map<number, CourseSessionNote[]>();
  for (const n of notes) {
    const wk = weeks.find((w) => n.date >= w.startDate && n.date <= w.endDate);
    if (!wk) continue;
    const arr = notesByWeek.get(wk.weekNo) ?? [];
    arr.push(n);
    notesByWeek.set(wk.weekNo, arr);
  }

  const todosByWeek = new Map<number, CourseTodo[]>();
  for (const t of todos) {
    if (!t.sessionDate) continue;
    const wk = weeks.find(
      (w) => t.sessionDate! >= w.startDate && t.sessionDate! <= w.endDate,
    );
    if (!wk) continue;
    const arr = todosByWeek.get(wk.weekNo) ?? [];
    arr.push(t);
    todosByWeek.set(wk.weekNo, arr);
  }
  const unassignedTodos = todos.filter((t) => !t.sessionDate);

  // 학기 weeks 범위 밖에 있는 잔존 class_sessions — 운영진이 직접 정리할 수 있도록 노출
  const orphanSessions = sessions.filter(
    (s) => !weeks.some((w) => s.date >= w.startDate && s.date <= w.endDate),
  );

  return (
    <div className="py-16">
      <section className="mx-auto max-w-4xl px-4">
        <Link
          href="/courses"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft size={14} /> 수강과목 목록
        </Link>
        <PageHeader
          icon={<CalendarClock size={24} />}
          title={course.courseName}
          description={`${course.year}년 ${
            course.term === "spring" ? "1학기" : "2학기"
          } · ${course.schedule ?? "시간 미정"}${
            course.classroom ? ` · ${course.classroom}` : ""
          }`}
          actions={
            <div className="flex flex-wrap gap-2">
              {currentWeek && (
                <Button
                  onClick={jumpToCurrentWeek}
                  size="sm"
                  variant="outline"
                  className="border-primary/40 text-primary hover:bg-primary/5"
                >
                  <CalendarClock size={14} className="mr-1" />
                  이번 주({currentWeek.weekNo}주차)로 이동
                </Button>
              )}
              {master && (
                <Button onClick={openSettings} size="sm" variant="outline">
                  <Settings size={14} className="mr-1" /> 학기 설정
                </Button>
              )}
              {master && (
                <Button onClick={() => setDraft(blankDraft(today))} size="sm">
                  <Plus size={14} className="mr-1" /> 일정 추가
                </Button>
              )}
            </div>
          }
        />

        <p className="mt-3 text-xs text-muted-foreground">
          기본 운영방식은 <span className="font-medium">대면</span>입니다.
          일자별 변경사항은 운영진이 등록하며, 수강생은 매 수업마다 개인 메모와 할 일을 남길 수 있습니다.
          {course.semesterStartDate ? (
            <>
              {" "}개강일: <b>{course.semesterStartDate}</b> · 총 {course.totalWeeks ?? DEFAULT_TOTAL_WEEKS}주
            </>
          ) : (
            <>
              {" "}기본 개강일(자동 추정): <b>{inferredStart || "—"}</b> · 총 {DEFAULT_TOTAL_WEEKS}주
            </>
          )}
        </p>
      </section>

      {/* Sprint 65: 이번 주차 하이라이트 카드 — currentWeek 있을 때만 노출 */}
      {currentWeek && (() => {
        const cw = currentWeek;
        const cwSessions = sessionsByWeek.get(cw.weekNo) ?? [];
        const cwNotes = notesByWeek.get(cw.weekNo) ?? [];
        const cwTodos = todosByWeek.get(cw.weekNo) ?? [];
        const cwClassDates = computeClassDatesInWeek(cw.startDate, parsedSchedule.weekdays);
        const cwSessionsByDate = new Map(cwSessions.map((s) => [s.date, s]));
        const cwModes: ClassSessionMode[] =
          cwClassDates.length > 0
            ? cwClassDates.map((d) => cwSessionsByDate.get(d)?.mode ?? "in_person")
            : cwSessions.map((s) => s.mode);
        const cwAllSame = cwModes.length > 0 && cwModes.every((m) => m === cwModes[0]);
        const cwPrimaryMode: ClassSessionMode = cwAllSame
          ? cwModes[0]
          : (cwSessions[0]?.mode ?? "in_person");
        const todoOpen = cwTodos.filter((t) => !t.completed).length;
        const todoDone = cwTodos.length - todoOpen;
        return (
          <section className="mx-auto mt-6 max-w-4xl px-4">
            <div
              className={cn(
                "rounded-2xl border border-l-4 bg-card p-4 shadow-sm sm:p-5",
                MODE_WEEK_BORDER[cwPrimaryMode],
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  이번 주
                </span>
                <h2 className="text-base font-bold sm:text-lg">{cw.weekNo}주차</h2>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    MODE_COLORS[cwPrimaryMode],
                  )}
                  title={cwAllSame ? "전 수업일 동일 모드" : "수업일별 모드 다름"}
                >
                  {cwAllSame ? CLASS_SESSION_MODE_LABELS[cwPrimaryMode] : "수업일별 다름"}
                </span>
                <Button
                  onClick={jumpToCurrentWeek}
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-8 text-xs"
                >
                  상세 보기 ↓
                </Button>
              </div>

              {cwClassDates.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <CalendarClock size={12} className="text-muted-foreground" aria-hidden="true" />
                  {cwClassDates.map((d, i) => {
                    const sessionMode = cwSessionsByDate.get(d)?.mode ?? "in_person";
                    return (
                      <span
                        key={d}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
                          MODE_COLORS[sessionMode],
                        )}
                        title={`${formatClassDate(d)} · ${CLASS_SESSION_MODE_LABELS[sessionMode]}`}
                      >
                        {formatClassDate(d)}
                        {!cwAllSame && (
                          <span className="text-[9px] opacity-70">
                            · {CLASS_SESSION_MODE_LABELS[sessionMode]}
                          </span>
                        )}
                        {i < cwClassDates.length - 1 && <span className="sr-only">,</span>}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {cwSessions.length > 0 && (
                  <span>
                    변경 <strong className="text-foreground">{cwSessions.length}</strong>건
                  </span>
                )}
                {cwNotes.length > 0 && (
                  <span>
                    메모 <strong className="text-foreground">{cwNotes.length}</strong>건
                  </span>
                )}
                {cwTodos.length > 0 && (
                  <span className={todoOpen > 0 ? "text-amber-700" : ""}>
                    할 일 <strong className={todoOpen > 0 ? "text-amber-800" : "text-foreground"}>{todoOpen}</strong>
                    {todoDone > 0 && <span className="opacity-60"> / {todoDone} 완료</span>}
                  </span>
                )}
                {cwSessions.length === 0 && cwNotes.length === 0 && cwTodos.length === 0 && (
                  <span className="italic">이번 주차에 등록된 변경/메모/할 일이 없습니다.</span>
                )}
              </div>
            </div>
          </section>
        );
      })()}

      {master && (
        <CourseAttendanceStats
          enrollments={enrollmentsRes?.data ?? []}
          sessions={sessions}
          weeks={weeks}
        />
      )}

      <section className="mx-auto mt-8 max-w-4xl px-4">
        {loadingSessions ? (
          <div className="space-y-3" aria-busy="true" aria-label="수업 일정 불러오는 중">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : weeks.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="주차를 계산할 수 없습니다"
            description="학기/수업요일 정보를 확인해주세요."
          />
        ) : (
          <ul className="space-y-3">
            {weeks.map((w) => {
              const ws = sessionsByWeek.get(w.weekNo) ?? [];
              const ns = notesByWeek.get(w.weekNo) ?? [];
              const ts = todosByWeek.get(w.weekNo) ?? [];
              // 달력 주 기준 "이번 주" — 그 주차의 수업일이 이번 주 월~일에 포함되는가
              const isCurrentWeek =
                w.startDate >= thisWeekMonday && w.startDate <= thisWeekSunday;
              const isPast = w.startDate < thisWeekMonday;
              const classDates = computeClassDatesInWeek(
                w.startDate,
                parsedSchedule.weekdays,
              );
              const dayLabel = formatWeekdayLabel(parsedSchedule.weekdays);
              const firstClassDate = classDates[0] ?? w.startDate;

              // 모든 수업일의 실효 모드 (세션 없으면 기본 in_person)
              const sessionsByDate = new Map(ws.map((s) => [s.date, s]));
              const effectiveModes: ClassSessionMode[] = classDates.length > 0
                ? classDates.map((d) => sessionsByDate.get(d)?.mode ?? "in_person")
                : ws.map((s) => s.mode);
              const allSameMode =
                effectiveModes.length > 0 &&
                effectiveModes.every((m) => m === effectiveModes[0]);
              const activeMode: ClassSessionMode | null = allSameMode
                ? (effectiveModes[0] as ClassSessionMode)
                : null;
              const primaryMode: ClassSessionMode = activeMode ?? ws[0]?.mode ?? "in_person";
              const noWeekdays = parsedSchedule.weekdays.length === 0;
              return (
                <li
                  key={w.weekNo}
                  id={`week-${w.weekNo}`}
                  className={cn(
                    "scroll-mt-24 rounded-2xl border border-l-4 bg-card p-4",
                    MODE_WEEK_BORDER[primaryMode],
                    isCurrentWeek && "ring-2 ring-primary/30",
                    isPast && !isCurrentWeek && "opacity-80",
                  )}
                >
                  {master && (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5 border-b border-dashed border-slate-200 pb-2">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        수업 형태{classDates.length > 1 ? ` (${classDates.length}회 일괄)` : ""}:
                      </span>
                      {noWeekdays && (
                        <span className="text-[10px] text-amber-700">
                          강의 시간(요일) 설정이 필요합니다.
                        </span>
                      )}
                      {!noWeekdays && MODE_OPTIONS.map((m) => {
                        const active = activeMode === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() =>
                              quickSetWeekMode({
                                classDates,
                                existing: ws,
                                mode: m,
                              })
                            }
                            aria-pressed={active}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-all",
                              active ? MODE_BTN_ACTIVE[m] : MODE_BTN_DIM[m],
                            )}
                          >
                            {active && <Check size={10} className="shrink-0" />}
                            {CLASS_SESSION_MODE_LABELS[m]}
                          </button>
                        );
                      })}
                      {!noWeekdays && !allSameMode && (
                        <span className="text-[10px] text-muted-foreground">
                          (수업일별 다름)
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {w.weekNo}주차
                      </Badge>
                      {classDates.length > 0 ? (
                        <span className="text-xs font-medium text-slate-700">
                          {classDates.map((d) => formatClassDate(d)).join(", ")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {w.startDate} ~ {w.endDate}
                        </span>
                      )}
                      {isCurrentWeek && (
                        <Badge className="bg-primary text-white text-[10px]">
                          이번 주
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 수업 운영 */}
                  {ws.length === 0 ? (
                    <p className="mt-2 rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-3 py-2 text-[11px] text-muted-foreground">
                      운영진이 등록한 변경사항 없음 · 기본 <span className="font-medium text-emerald-700">대면</span> 진행
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {ws.map((s) => (
                        <li
                          key={s.id}
                          className="rounded-md bg-slate-50 px-2 py-1.5"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-medium">{s.date}</span>
                            <Badge
                              variant="outline"
                              className={cn("border text-[10px]", MODE_COLORS[s.mode])}
                            >
                              {CLASS_SESSION_MODE_LABELS[s.mode]}
                            </Badge>
                            {s.notes && (
                              <span className="text-[11px] text-muted-foreground">
                                {s.notes}
                              </span>
                            )}
                            {s.link && (
                              <a
                                href={s.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-primary hover:underline"
                              >
                                링크
                              </a>
                            )}
                            {master && (
                              <div className="ml-auto flex gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraft({
                                      id: s.id,
                                      date: s.date,
                                      mode: s.mode,
                                      link: s.link ?? "",
                                      notes: s.notes ?? "",
                                    })
                                  }
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-slate-200 hover:text-primary"
                                  aria-label="일정 수정"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => remove(s)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-100 hover:text-destructive"
                                  aria-label="일정 삭제"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* 학생 본인 출석 배지 — 회원 연동된 수강생만 */}
                  {!master && myEnrollment && classDates.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {classDates.map((d) => {
                        const ses = sessionsByDate.get(d);
                        const enabled = isAttendanceEnabled(ses?.mode ?? "in_person");
                        const recorded = !!(
                          ses?.attendedUserIds || ses?.attendedStudentIds || ses?.attendanceUpdatedAt
                        );
                        const present =
                          (ses?.attendedUserIds ?? []).includes(user?.id ?? "") ||
                          (ses?.attendedStudentIds ?? []).includes(myEnrollment.id);
                        const myNote =
                          ses?.absenceNotes?.[`user:${user?.id}`] ??
                          ses?.absenceNotes?.[`enrollment:${myEnrollment.id}`];
                        return (
                          <div
                            key={`my-att-${d}`}
                            className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-card px-2 py-1.5"
                          >
                            <span className="text-[11px] font-medium text-slate-700">
                              {d} 내 출석
                            </span>
                            {!enabled ? (
                              <Badge variant="outline" className="border-slate-300 text-[10px] text-slate-600">
                                비대상
                              </Badge>
                            ) : !recorded ? (
                              <Badge variant="outline" className="border-slate-300 text-[10px] text-slate-600">
                                미체크
                              </Badge>
                            ) : present ? (
                              <Badge className="bg-emerald-500 text-white text-[10px]">출석</Badge>
                            ) : (
                              <Badge className="bg-rose-500 text-white text-[10px]">결석</Badge>
                            )}
                            {myNote && (
                              <span className="text-[11px] text-muted-foreground">사유: {myNote}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 출석 체크 (운영진/조교 전용) */}
                  {master && classDates.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {classDates.map((d) => {
                        const ses = sessionsByDate.get(d);
                        const mode = ses?.mode ?? "in_person";
                        const enabled = isAttendanceEnabled(mode);
                        const sum = summarizeAttendance(ses, enrollmentsRes?.data ?? []);
                        return (
                          <div
                            key={`att-${d}`}
                            className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50/30 px-2 py-1.5"
                          >
                            <span className="text-[11px] font-medium text-emerald-800">
                              {d} 출석
                            </span>
                            {sum.total > 0 ? (
                              <span className="text-[11px] text-slate-600">
                                {sum.unmarked > 0
                                  ? `미체크 (${sum.total}명)`
                                  : `${sum.attended}/${sum.total} 출석 · 결석 ${sum.absent}`}
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-700">수강생 없음</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setAttendanceDate(d)}
                              disabled={!enabled || sum.total === 0}
                              className="ml-auto inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-card px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                              title={!enabled ? "비대면·휴강·과제 회차는 비활성화" : ""}
                            >
                              {sum.unmarked > 0 ? "출석 체크" : "출석 수정"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 개인 메모 — 항상 표시 (인라인 추가 버튼) */}
                  <div className="mt-3 rounded-md border border-blue-100 bg-blue-50/30 p-2">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[10px] font-medium text-blue-700">
                        내 메모{ns.length > 0 ? ` (${ns.length})` : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => setNoteDraft({ date: firstClassDate, content: "" })}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-200"
                      >
                        <Plus size={11} /> 메모 추가
                      </button>
                    </div>
                    {ns.length === 0 ? (
                      <p className="text-[11px] text-blue-700/70">
                        이번 주 ({dayLabel}) 수업 메모를 남겨보세요.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {ns.map((n) => (
                          <li
                            key={n.id}
                            className="flex items-start justify-between gap-2 text-[11px]"
                          >
                            <div className="flex-1">
                              <span className="mr-1 text-muted-foreground">{n.date}</span>
                              <span className="whitespace-pre-wrap">{n.content}</span>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setNoteDraft({
                                    id: n.id,
                                    date: n.date,
                                    content: n.content,
                                  })
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-blue-100 hover:text-primary"
                                aria-label="메모 수정"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteNote(n)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-100 hover:text-destructive"
                                aria-label="메모 삭제"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* 개인 할 일 — 항상 표시 (인라인 추가 버튼) */}
                  <div className="mt-2 rounded-md border border-amber-100 bg-amber-50/30 p-2">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[10px] font-medium text-amber-700">
                        내 할 일{ts.length > 0 ? ` (${ts.filter((t) => !t.completed).length}/${ts.length})` : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => setTodoDraft(blankTodoDraft(firstClassDate))}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-200"
                      >
                        <Plus size={11} /> 할 일 추가
                      </button>
                    </div>
                    {ts.length === 0 ? (
                      <p className="text-[11px] text-amber-700/70">
                        이번 주 과제·논문 읽기 등 할 일을 추가해보세요.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {ts.map((t) => (
                          <li
                            key={t.id}
                            className="flex items-center gap-2 text-[11px]"
                          >
                            <input
                              type="checkbox"
                              checked={!!t.completed}
                              onChange={() => toggleTodo(t)}
                              className="shrink-0"
                            />
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px]",
                                COURSE_TODO_TYPE_COLORS[t.type],
                              )}
                            >
                              {COURSE_TODO_TYPE_LABELS[t.type]}
                            </Badge>
                            <span
                              className={cn(
                                "flex-1",
                                t.completed && "line-through text-muted-foreground",
                              )}
                            >
                              {t.content}
                            </span>
                            {t.dueDate && (
                              <span className="text-muted-foreground">
                                ~{t.dueDate}
                              </span>
                            )}
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setTodoDraft({
                                    id: t.id,
                                    type: t.type,
                                    content: t.content,
                                    dueDate: t.dueDate ?? "",
                                    sessionDate: t.sessionDate,
                                  })
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-amber-100 hover:text-primary"
                                aria-label="할 일 수정"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteTodo(t)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-100 hover:text-destructive"
                                aria-label="할 일 삭제"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* 학기 주차 범위 밖에 있는 잔존 변경 기록 */}
        {orphanSessions.length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
            <p className="mb-2 text-xs font-medium text-amber-900">
              주차에 매핑되지 않은 변경 기록 ({orphanSessions.length}건)
              <span className="ml-2 text-amber-700/80">
                — 학기 범위 밖이거나 잘못된 날짜의 잔존 데이터입니다. 정리하려면 삭제하세요.
              </span>
            </p>
            <ul className="space-y-1">
              {orphanSessions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-md bg-card px-2 py-1.5 text-[11px]"
                >
                  <span className="font-mono font-medium text-amber-900">{s.date}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {CLASS_SESSION_MODE_LABELS[s.mode]}
                  </Badge>
                  {s.notes && (
                    <span className="flex-1 text-muted-foreground">{s.notes}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(s)}
                    className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-100 hover:text-destructive"
                    aria-label="잔존 일정 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 주차 미배정 할 일 */}
        {unassignedTodos.length > 0 && (
          <div className="mt-6 rounded-2xl border bg-card p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              주차 미배정 할 일
            </p>
            <ul className="space-y-1">
              {unassignedTodos.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={!!t.completed}
                    onChange={() => toggleTodo(t)}
                  />
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px]", COURSE_TODO_TYPE_COLORS[t.type])}
                  >
                    {COURSE_TODO_TYPE_LABELS[t.type]}
                  </Badge>
                  <span
                    className={cn(
                      "flex-1",
                      t.completed && "line-through text-muted-foreground",
                    )}
                  >
                    {t.content}
                  </span>
                  {t.dueDate && (
                    <span className="text-muted-foreground">~{t.dueDate}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteTodo(t)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-100 hover:text-destructive"
                    aria-label="할 일 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 운영자 일정 Dialog */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? "일정 수정" : "일정 추가"}
            </DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">날짜</span>
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </label>
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="text-xs font-medium text-muted-foreground">운영방식</span>
                <div className="flex flex-wrap gap-1.5">
                  {MODE_OPTIONS.map((m) => {
                    const active = draft.mode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDraft({ ...draft, mode: m })}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                          active ? MODE_BTN_ACTIVE[m] : MODE_BTN_DIM[m],
                        )}
                      >
                        {active && <Check size={12} className="shrink-0" />}
                        {CLASS_SESSION_MODE_LABELS[m]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">링크 (줌 등)</span>
                <Input
                  value={draft.link}
                  onChange={(e) => setDraft({ ...draft, link: e.target.value })}
                  placeholder="https://..."
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">메모</span>
                <Input
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="과제 대체 안내, 보강 일정 등"
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>취소</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 학기 설정 Dialog (master) */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>학기 설정</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              개강일(주차 1의 시작일)과 총 주차 수를 설정합니다. 설정값은 수강생 전원에게 동일하게 적용됩니다.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                개강일 (주차 1 시작일)
              </span>
              <Input
                type="date"
                value={settingsStart}
                onChange={(e) => setSettingsStart(e.target.value)}
              />
              {inferredStart && (
                <span className="text-[11px] text-muted-foreground">
                  자동 추정값: {inferredStart}
                </span>
              )}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">총 주차</span>
              <Input
                type="number"
                min={1}
                max={30}
                value={settingsWeeks}
                onChange={(e) => setSettingsWeeks(Number(e.target.value) || DEFAULT_TOTAL_WEEKS)}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>취소</Button>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 메모 Dialog */}
      <Dialog open={!!noteDraft} onOpenChange={(o) => !o && setNoteDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{noteDraft?.id ? "메모 수정" : "수업 메모"}</DialogTitle>
          </DialogHeader>
          {noteDraft && (
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">수업 일자</span>
                <Input
                  type="date"
                  value={noteDraft.date}
                  onChange={(e) => setNoteDraft({ ...noteDraft, date: e.target.value })}
                  disabled={!!noteDraft.id}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">내용</span>
                <textarea
                  value={noteDraft.content}
                  onChange={(e) => setNoteDraft({ ...noteDraft, content: e.target.value })}
                  rows={5}
                  className="rounded-md border bg-card px-3 py-2 text-sm"
                  placeholder="수업에서 배운 내용, 느낀 점, 질문 등을 자유롭게 기록하세요."
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDraft(null)}>취소</Button>
            <Button onClick={saveNote} disabled={savingNote}>
              {savingNote ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 할 일 Dialog */}
      <Dialog open={!!todoDraft} onOpenChange={(o) => !o && setTodoDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{todoDraft?.id ? "할 일 수정" : "할 일 추가"}</DialogTitle>
          </DialogHeader>
          {todoDraft && (
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">유형</span>
                <select
                  value={todoDraft.type}
                  onChange={(e) =>
                    setTodoDraft({ ...todoDraft, type: e.target.value as CourseTodoType })
                  }
                  className="rounded-md border bg-card px-3 py-2 text-sm"
                >
                  {TODO_TYPES.map((t) => (
                    <option key={t} value={t}>{COURSE_TODO_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">내용</span>
                <Input
                  value={todoDraft.content}
                  onChange={(e) => setTodoDraft({ ...todoDraft, content: e.target.value })}
                  placeholder="해야 할 일"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  관련 수업일 (선택) · 비워두면 주차 미배정으로 분류됩니다
                </span>
                <Input
                  type="date"
                  value={todoDraft.sessionDate ?? ""}
                  onChange={(e) => {
                    const v = e.target.value || undefined;
                    setTodoDraft({
                      ...todoDraft,
                      sessionDate: v,
                      dueDate: todoDraft.dueDate || defaultDueFromSession(v),
                    });
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  기한 (선택) · 수업일 선택 시 자동으로 하루 전 입력됩니다
                </span>
                <Input
                  type="date"
                  value={todoDraft.dueDate}
                  onChange={(e) => setTodoDraft({ ...todoDraft, dueDate: e.target.value })}
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTodoDraft(null)}>취소</Button>
            <Button onClick={saveTodo} disabled={savingTodo}>
              {savingTodo ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 출석 체크 모달 (운영진/조교 전용) */}
      {master && attendanceDate && user && (
        <AttendanceChecklist
          open={!!attendanceDate}
          onOpenChange={(next) => !next && setAttendanceDate(null)}
          courseOfferingId={courseId}
          date={attendanceDate}
          session={(sessionsRes?.data ?? []).find(
            (s) => s.date === attendanceDate,
          )}
          enrollments={enrollmentsRes?.data ?? []}
          actorUserId={user.id}
        />
      )}
    </div>
  );
}

export default function CourseSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGuard>
      <ScheduleContent courseId={id} />
    </AuthGuard>
  );
}
