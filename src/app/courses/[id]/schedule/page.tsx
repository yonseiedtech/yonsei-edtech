"use client";

import { use, useMemo, useState } from "react";
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
  date: date ?? new Date().toISOString().slice(0, 10),
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
    const allSame = args.classDates.every((d) => {
      const ex = args.existing.find((s) => s.date === d);
      const cur = ex?.mode ?? "in_person";
      return cur === args.mode;
    });
    if (allSame) {
      toast.info(`이미 ${CLASS_SESSION_MODE_LABELS[args.mode]}(으)로 설정되어 있습니다.`);
      return;
    }

    try {
      for (const d of args.classDates) {
        const ex = args.existing.find((s) => s.date === d);
        if (ex) {
          if (ex.mode !== args.mode) {
            await classSessionsApi.update(ex.id, { mode: args.mode });
          }
        } else {
          // 기본값(in_person)으로 두고 싶을 땐 세션 미생성 — in_person 클릭 시 굳이 행 추가하지 않음
          if (args.mode === "in_person") continue;
          await classSessionsApi.create({
            courseOfferingId: courseId,
            date: d,
            mode: args.mode,
            createdBy: user.id,
          });
        }
      }
      await qc.refetchQueries({
        queryKey: ["class-sessions", "by-course", courseId],
        type: "active",
      });
      await qc.invalidateQueries({ queryKey: ["class-sessions"] });
      toast.success(`${CLASS_SESSION_MODE_LABELS[args.mode]}(으)로 변경했습니다.`);
    } catch (e) {
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

  const today = new Date().toISOString().slice(0, 10);

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
            <div className="flex gap-2">
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
              const isCurrentWeek = today >= w.startDate && today <= w.endDate;
              const isPast = today > w.endDate;
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
                  className={cn(
                    "rounded-xl border border-l-4 bg-white p-4",
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
                            className={cn(
                              "rounded-full border px-2.5 py-0.5 text-[10px] transition-colors",
                              active
                                ? cn(MODE_COLORS[m], "ring-1 ring-current/30 font-medium")
                                : "border-slate-200 bg-white text-muted-foreground hover:border-slate-300 hover:bg-slate-50",
                            )}
                          >
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
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {w.weekNo}주차
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {w.startDate} ~ {w.endDate}
                      </span>
                      {isCurrentWeek && (
                        <Badge className="bg-primary text-white text-[10px]">
                          이번 주
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setNoteDraft({ date: w.startDate, content: "" })
                        }
                      >
                        <NotebookPen size={12} className="mr-1" /> 메모
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setTodoDraft(blankTodoDraft(firstClassDate))
                        }
                      >
                        <ListChecks size={12} className="mr-1" /> 할 일
                      </Button>
                    </div>
                  </div>

                  {/* 수업 운영 */}
                  {ws.length === 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setNoteDraft({ date: firstClassDate, content: "" })
                      }
                      className="group mt-2 flex w-full items-center gap-2 rounded-md border border-dashed border-slate-200 px-3 py-2 text-left text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    >
                      <NotebookPen size={14} className="shrink-0" />
                      <span>
                        {dayLabel} 수업 메모 없어요. 지금 한번 남겨보시겠어요?
                      </span>
                    </button>
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

                  {/* 개인 메모 */}
                  {ns.length > 0 && (
                    <div className="mt-3 rounded-md border border-blue-100 bg-blue-50/30 p-2">
                      <p className="mb-1 text-[10px] font-medium text-blue-700">
                        내 메모
                      </p>
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
                    </div>
                  )}

                  {/* 개인 할 일 */}
                  {ts.length > 0 && (
                    <div className="mt-2 rounded-md border border-amber-100 bg-amber-50/30 p-2">
                      <p className="mb-1 text-[10px] font-medium text-amber-700">
                        내 할 일
                      </p>
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
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* 주차 미배정 할 일 */}
        {unassignedTodos.length > 0 && (
          <div className="mt-6 rounded-xl border bg-white p-4">
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
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          active
                            ? cn(MODE_COLORS[m], "ring-2 ring-offset-1 ring-current/30 font-medium")
                            : "border-slate-200 bg-white text-muted-foreground hover:border-slate-300",
                        )}
                      >
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
                  className="rounded-md border bg-white px-3 py-2 text-sm"
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
                  className="rounded-md border bg-white px-3 py-2 text-sm"
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
                <span className="text-xs font-medium text-muted-foreground">기한 (선택)</span>
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
