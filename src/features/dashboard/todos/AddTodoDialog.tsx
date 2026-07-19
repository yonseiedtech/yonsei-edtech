"use client";

/**
 * AddTodoDialog — 할 일 빠른 추가 다이얼로그 (수업/학술활동/세미나/운영 업무 4탭).
 * `MyTodosWidget` 에서 분할 (Phase B 단순 추출 — 기능 변경 X).
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronLeft,
  Mic,
  ShieldAlert,
  Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  COURSE_TODO_TYPE_COLORS,
  COURSE_TODO_TYPE_LABELS,
  type CourseEnrollment,
  type CourseOffering,
  type CourseTodoType,
  type Seminar,
} from "@/types";
import {
  courseEnrollmentsApi,
  courseOfferingsApi,
  courseTodosApi,
  seminarsApi,
  todosApi,
} from "@/lib/bkend";
import { inferCurrentSemester } from "@/lib/semester";
import { cn } from "@/lib/utils";
import { ACTIVITY_LABELS, type AddCategory, type ActivityFlat } from "./types";

const TODO_TYPE_OPTIONS: CourseTodoType[] = [
  "assignment",
  "paper_reading",
  "paper_writing",
  "presentation_prep",
  "other",
];

interface CourseForm {
  courseOfferingId: string;
  type: CourseTodoType;
  content: string;
  dueDate: string;
  sessionDate: string;
}

interface StaffForm {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
}

interface ActivityForm {
  activityId: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
}

interface SeminarForm {
  seminarId: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
}

const EMPTY_COURSE_FORM: CourseForm = {
  courseOfferingId: "",
  type: "assignment",
  content: "",
  dueDate: "",
  sessionDate: "",
};

const EMPTY_STAFF_FORM: StaffForm = {
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
};

const EMPTY_ACTIVITY_FORM: ActivityForm = {
  activityId: "",
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
};

const EMPTY_SEMINAR_FORM: SeminarForm = {
  seminarId: "",
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
};

export interface AddTodoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName?: string;
  isStaff: boolean;
  myActivityTodos: ActivityFlat[];
}

export function AddTodoDialog({
  open,
  onOpenChange,
  userId,
  userName,
  isStaff,
  myActivityTodos,
}: AddTodoDialogProps) {
  const qc = useQueryClient();
  const [addCategory, setAddCategory] = useState<AddCategory>("course");
  const [mobileStep, setMobileStep] = useState<"picker" | "form">("picker");
  const [saving, setSaving] = useState(false);
  const [courseForm, setCourseForm] = useState<CourseForm>(EMPTY_COURSE_FORM);
  const [staffForm, setStaffForm] = useState<StaffForm>(EMPTY_STAFF_FORM);
  const [activityForm, setActivityForm] = useState<ActivityForm>(EMPTY_ACTIVITY_FORM);
  const [seminarForm, setSeminarForm] = useState<SeminarForm>(EMPTY_SEMINAR_FORM);

  // 다이얼로그 open 직후 초기화 — open 변화에 따라 reset
  // (원본은 openAdd()에서 명시 초기화. 분할 후에는 onOpenChange에서 reset)
  function handleOpenChange(next: boolean) {
    if (next) {
      setMobileStep("picker");
      setAddCategory("course");
      setCourseForm(EMPTY_COURSE_FORM);
      setStaffForm(EMPTY_STAFF_FORM);
      setActivityForm(EMPTY_ACTIVITY_FORM);
      setSeminarForm(EMPTY_SEMINAR_FORM);
    }
    onOpenChange(next);
  }

  // 수업 picker 옵션 — 본인 수강 과목 (이번 학기)
  const { year: curYear, semester: curSem } = inferCurrentSemester(new Date());
  const curTerm = curSem === "first" ? "spring" : "fall";
  const { data: enrollmentsRes } = useQuery({
    queryKey: ["my-enrollments", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await courseEnrollmentsApi.listByUser(userId);
    },
    enabled: !!userId && open && addCategory === "course",
    staleTime: 5 * 60_000,
  });
  const myEnrollmentCourseIds = useMemo(() => {
    return ((enrollmentsRes?.data ?? []) as CourseEnrollment[])
      .filter((e) => e.year === curYear && e.term === curTerm)
      .map((e) => e.courseOfferingId);
  }, [enrollmentsRes, curYear, curTerm]);

  const { data: pickerOfferingsRes } = useQuery({
    queryKey: ["course-offerings", curYear, curTerm],
    queryFn: () => courseOfferingsApi.listBySemester(curYear, curTerm),
    enabled: open && addCategory === "course",
    staleTime: 5 * 60_000,
  });
  const pickerOfferings: CourseOffering[] = useMemo(() => {
    return ((pickerOfferingsRes?.data ?? []) as CourseOffering[]).filter((o) =>
      myEnrollmentCourseIds.includes(o.id),
    );
  }, [pickerOfferingsRes, myEnrollmentCourseIds]);

  // 세미나 picker — staff: 전체, 호스트: 본인 호스트 세미나만. 미래·최근 30일 이내 우선
  const { data: seminarsListRes } = useQuery({
    queryKey: ["seminars-for-todo-picker"],
    queryFn: () => seminarsApi.list({ limit: 100 }),
    enabled: open && addCategory === "seminar",
    staleTime: 5 * 60_000,
  });
  const pickerSeminars: Seminar[] = useMemo(() => {
    const all = ((seminarsListRes?.data ?? []) as Seminar[]).slice();
    if (!userId) return [];
    const filtered = isStaff
      ? all
      : all.filter((s) => (s.hostUserIds ?? []).includes(userId));
    const today = new Date().toISOString().slice(0, 10);
    return filtered
      .filter((s) => {
        if (!s.date) return true;
        const days = (new Date(today).getTime() - new Date(s.date).getTime()) / 86400000;
        return days <= 30;
      })
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [seminarsListRes, isStaff, userId]);

  async function saveAdd() {
    if (!userId) return;
    setSaving(true);
    try {
      if (addCategory === "course") {
        if (!courseForm.courseOfferingId) {
          toast.error("수업을 선택하세요.");
          return;
        }
        if (!courseForm.content.trim()) {
          toast.error("내용을 입력하세요.");
          return;
        }
        await courseTodosApi.create({
          courseOfferingId: courseForm.courseOfferingId,
          userId,
          type: courseForm.type,
          content: courseForm.content.trim(),
          dueDate: courseForm.dueDate || undefined,
          sessionDate: courseForm.sessionDate || undefined,
          completed: false,
        });
        await qc.invalidateQueries({ queryKey: ["my-course-todos", userId] });
        await qc.invalidateQueries({
          queryKey: ["course-todos", courseForm.courseOfferingId, userId],
        });
        toast.success("수업 할 일에 추가되었습니다 — /수업/[id]/스케쥴 페이지에도 연동됩니다.");
      } else if (addCategory === "activity") {
        if (!activityForm.activityId) {
          toast.error("학술활동을 선택하세요.");
          return;
        }
        if (!activityForm.title.trim()) {
          toast.error("제목을 입력하세요.");
          return;
        }
        const target = myActivityTodos.find((a) => a.id === activityForm.activityId);
        if (!target) {
          toast.error("선택한 학술활동을 찾지 못했습니다.");
          return;
        }
        await todosApi.create({
          title: activityForm.title.trim(),
          description: activityForm.description.trim() || undefined,
          priority: activityForm.priority,
          status: "todo",
          dueDate: activityForm.dueDate || undefined,
          createdBy: userId,
          createdByName: userName ?? "활동 운영진",
          relatedActivityId: target.id,
          relatedActivityTitle: target.title,
          relatedActivityType: target.type,
        });
        await qc.invalidateQueries({ queryKey: ["admin-todos"] });
        await qc.invalidateQueries({ queryKey: ["activity-todos", target.id] });
        toast.success(
          `학술활동 "${target.title}"에 연동된 업무가 추가되었습니다 — /activities/${target.type}/${target.id} 와 /console/todos 양쪽에 표시됩니다.`,
        );
      } else if (addCategory === "seminar") {
        if (!seminarForm.seminarId) {
          toast.error("세미나를 선택하세요.");
          return;
        }
        if (!seminarForm.title.trim()) {
          toast.error("제목을 입력하세요.");
          return;
        }
        const target = pickerSeminars.find((s) => s.id === seminarForm.seminarId);
        if (!target) {
          toast.error("선택한 세미나를 찾지 못했습니다.");
          return;
        }
        await todosApi.create({
          title: seminarForm.title.trim(),
          description: seminarForm.description.trim() || undefined,
          priority: seminarForm.priority,
          status: "todo",
          dueDate: seminarForm.dueDate || undefined,
          createdBy: userId,
          createdByName: userName ?? "운영진",
          relatedSeminarId: target.id,
          relatedSeminarTitle: target.title,
          relatedSeminarDate: target.date || undefined,
        });
        await qc.invalidateQueries({ queryKey: ["admin-todos"] });
        await qc.invalidateQueries({ queryKey: ["seminar-todos", target.id] });
        toast.success(
          `세미나 "${target.title}"에 연동된 업무가 추가되었습니다 — /seminars/${target.id}/host 와 /console/todos 양쪽에 표시됩니다.`,
        );
      } else {
        if (!staffForm.title.trim()) {
          toast.error("제목을 입력하세요.");
          return;
        }
        await todosApi.create({
          title: staffForm.title.trim(),
          description: staffForm.description.trim() || undefined,
          priority: staffForm.priority,
          status: "todo",
          dueDate: staffForm.dueDate || undefined,
          createdBy: userId,
          createdByName: userName ?? "운영진",
        });
        await qc.invalidateQueries({ queryKey: ["admin-todos"] });
        toast.success("운영 업무에 추가되었습니다 — /console/todos 에도 표시됩니다.");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>할 일 추가</DialogTitle>
        </DialogHeader>

        {/* F5: 모바일 picker — 카테고리 큰 버튼으로 단계화 */}
        {mobileStep === "picker" && (
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => {
                setAddCategory("course");
                setMobileStep("form");
              }}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl border bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <BookOpen size={20} className="text-info" />
              수업
            </button>
            {myActivityTodos.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAddCategory("activity");
                  setMobileStep("form");
                }}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl border bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UsersIcon size={20} className="text-success" />
                학술활동
              </button>
            )}
            {isStaff && (
              <button
                type="button"
                onClick={() => {
                  setAddCategory("seminar");
                  setMobileStep("form");
                }}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl border bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Mic size={20} className="text-cat-5" />
                세미나
              </button>
            )}
            {isStaff && (
              <button
                type="button"
                onClick={() => {
                  setAddCategory("staff");
                  setMobileStep("form");
                }}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl border bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ShieldAlert size={20} className="text-warning" />
                운영 업무
              </button>
            )}
          </div>
        )}

        {mobileStep === "form" && (
          <button
            type="button"
            onClick={() => setMobileStep("picker")}
            className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground sm:hidden"
          >
            <ChevronLeft size={14} /> 카테고리 변경
          </button>
        )}

        <Tabs
          value={addCategory}
          onValueChange={(v) => setAddCategory(v as AddCategory)}
          className={cn(
            "mt-1",
            mobileStep === "picker" && "hidden sm:block",
          )}
        >
          <TabsList
            className={cn(
              "hidden w-full sm:grid",
              (() => {
                let n = 1;
                if (myActivityTodos.length > 0) n++;
                if (isStaff) n += 2;
                return (
                  {
                    1: "sm:grid-cols-1",
                    2: "sm:grid-cols-2",
                    3: "sm:grid-cols-3",
                    4: "sm:grid-cols-4",
                  } as Record<number, string>
                )[n] ?? "sm:grid-cols-4";
              })(),
            )}
          >
            <TabsTrigger value="course" className="text-xs">
              <BookOpen size={12} className="mr-1" /> 수업
            </TabsTrigger>
            {myActivityTodos.length > 0 && (
              <TabsTrigger value="activity" className="text-xs">
                <UsersIcon size={12} className="mr-1" /> 학술활동
              </TabsTrigger>
            )}
            {isStaff && (
              <TabsTrigger value="seminar" className="text-xs">
                <Mic size={12} className="mr-1" /> 세미나
              </TabsTrigger>
            )}
            {isStaff && (
              <TabsTrigger value="staff" className="text-xs">
                <ShieldAlert size={12} className="mr-1" /> 운영 업무
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="course" className="mt-3 space-y-3">
            <p className="text-[11px] text-muted-foreground">
              추가하면 <b>/courses/[id]/schedule</b> 의 주차별 할 일 카드에도 자동으로 표시됩니다.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">수업 (이번 학기 본인 수강)</span>
              <select
                value={courseForm.courseOfferingId}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, courseOfferingId: e.target.value })
                }
                className="rounded-md border bg-card px-2 py-1.5 text-sm"
              >
                <option value="">— 선택 —</option>
                {pickerOfferings.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseName}
                    {c.professor ? ` · ${c.professor}` : ""}
                  </option>
                ))}
              </select>
              {pickerOfferings.length === 0 && (
                <span className="text-[10px] text-muted-foreground">
                  수강 과목이 없으면{" "}
                  <Link href="/courses?tab=mine" className="text-primary underline">
                    수강과목 등록
                  </Link>
                  에서 본인 수강을 먼저 토글하세요.
                </span>
              )}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">유형</span>
              <div className="flex flex-wrap gap-1">
                {TODO_TYPE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCourseForm({ ...courseForm, type: t })}
                    className={`rounded-md px-2 py-1 text-[11px] ${
                      courseForm.type === t
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
                value={courseForm.content}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, content: e.target.value })
                }
                autoFocus
                placeholder="예) Dewey 챕터 2 읽기"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">관련 수업일 (선택)</span>
                <Input
                  type="date"
                  value={courseForm.sessionDate}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, sessionDate: e.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">기한 (선택)</span>
                <Input
                  type="date"
                  value={courseForm.dueDate}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, dueDate: e.target.value })
                  }
                />
              </label>
            </div>
          </TabsContent>

          {myActivityTodos.length > 0 && (
            <TabsContent value="activity" className="mt-3 space-y-3">
              <p className="text-[11px] text-muted-foreground">
                본인이 운영진/멤버로 참여 중인 학술활동에 연동된 업무를 추가합니다.
                추가하면 <b>/console/todos</b> 운영 업무수행철과 해당 활동 상세 페이지 양쪽에 표시됩니다.
              </p>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">학술활동</span>
                <select
                  value={activityForm.activityId}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, activityId: e.target.value })
                  }
                  className="rounded-md border bg-card px-2 py-1.5 text-sm"
                >
                  <option value="">— 선택 —</option>
                  {myActivityTodos.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{ACTIVITY_LABELS[a.type]}] {a.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">제목</span>
                <Input
                  value={activityForm.title}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, title: e.target.value })
                  }
                  autoFocus
                  placeholder="예) 발표 자료 1차 초안 공유"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">설명 (선택)</span>
                <textarea
                  value={activityForm.description}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-md border bg-card px-3 py-2 text-sm"
                  placeholder="자세한 설명을 입력하세요."
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">우선순위</span>
                  <select
                    value={activityForm.priority}
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        priority: e.target.value as "high" | "medium" | "low",
                      })
                    }
                    className="rounded-md border bg-card px-2 py-1.5 text-sm"
                  >
                    <option value="high">높음</option>
                    <option value="medium">보통</option>
                    <option value="low">낮음</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">기한 (선택)</span>
                  <Input
                    type="date"
                    value={activityForm.dueDate}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, dueDate: e.target.value })
                    }
                  />
                </label>
              </div>
            </TabsContent>
          )}

          {isStaff && (
            <TabsContent value="seminar" className="mt-3 space-y-3">
              <p className="text-[11px] text-muted-foreground">
                세미나 운영 업무를 추가하면 <b>/seminars/[id]/host</b> 호스트 대시보드와 <b>/console/todos</b> 운영 업무수행철 양쪽에 표시됩니다.
              </p>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">세미나 (최근 30일 + 예정)</span>
                <select
                  value={seminarForm.seminarId}
                  onChange={(e) =>
                    setSeminarForm({ ...seminarForm, seminarId: e.target.value })
                  }
                  className="rounded-md border bg-card px-2 py-1.5 text-sm"
                >
                  <option value="">— 선택 —</option>
                  {pickerSeminars.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date ? `[${s.date}] ` : ""}
                      {s.title}
                    </option>
                  ))}
                </select>
                {pickerSeminars.length === 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    표시할 세미나가 없습니다.
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">제목</span>
                <Input
                  value={seminarForm.title}
                  onChange={(e) =>
                    setSeminarForm({ ...seminarForm, title: e.target.value })
                  }
                  autoFocus
                  placeholder="예) 다과 발주, 사회 대본 검토, 포스터 인쇄"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">설명 (선택)</span>
                <textarea
                  value={seminarForm.description}
                  onChange={(e) =>
                    setSeminarForm({ ...seminarForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-md border bg-card px-3 py-2 text-sm"
                  placeholder="자세한 설명을 입력하세요."
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">우선순위</span>
                  <select
                    value={seminarForm.priority}
                    onChange={(e) =>
                      setSeminarForm({
                        ...seminarForm,
                        priority: e.target.value as "high" | "medium" | "low",
                      })
                    }
                    className="rounded-md border bg-card px-2 py-1.5 text-sm"
                  >
                    <option value="high">높음</option>
                    <option value="medium">보통</option>
                    <option value="low">낮음</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">기한 (선택)</span>
                  <Input
                    type="date"
                    value={seminarForm.dueDate}
                    onChange={(e) =>
                      setSeminarForm({ ...seminarForm, dueDate: e.target.value })
                    }
                  />
                </label>
              </div>
            </TabsContent>
          )}

          {isStaff && (
            <TabsContent value="staff" className="mt-3 space-y-3">
              <p className="text-[11px] text-muted-foreground">
                추가하면 <b>/console/todos</b> 운영 업무수행철에도 자동으로 등록됩니다.
              </p>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">제목</span>
                <Input
                  value={staffForm.title}
                  onChange={(e) => setStaffForm({ ...staffForm, title: e.target.value })}
                  placeholder="예) 26년 1학기 모집 공고 게시"
                  autoFocus
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">설명 (선택)</span>
                <textarea
                  value={staffForm.description}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-md border bg-card px-3 py-2 text-sm"
                  placeholder="자세한 설명을 입력하세요."
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">우선순위</span>
                  <select
                    value={staffForm.priority}
                    onChange={(e) =>
                      setStaffForm({
                        ...staffForm,
                        priority: e.target.value as "high" | "medium" | "low",
                      })
                    }
                    className="rounded-md border bg-card px-2 py-1.5 text-sm"
                  >
                    <option value="high">높음</option>
                    <option value="medium">보통</option>
                    <option value="low">낮음</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">기한 (선택)</span>
                  <Input
                    type="date"
                    value={staffForm.dueDate}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, dueDate: e.target.value })
                    }
                  />
                </label>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={saveAdd} disabled={saving}>
            {saving ? "저장 중..." : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
