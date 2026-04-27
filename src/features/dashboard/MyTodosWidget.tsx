"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ListChecks,
  BookOpen,
  Microscope,
  Users as UsersIcon,
  ShieldAlert,
  ChevronRight,
  Plus,
  Bell,
  BellOff,
} from "lucide-react";
import { formatDday } from "@/lib/dday";
import { parseSchedule, fmtMin } from "@/lib/courseSchedule";
import { Badge } from "@/components/ui/badge";
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
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import {
  courseTodosApi,
  courseOfferingsApi,
  courseEnrollmentsApi,
  todosApi,
  researchProposalsApi,
  researchReportsApi,
  activitiesApi,
} from "@/lib/bkend";
import { usePendingMembers } from "@/features/member/useMembers";
import { useInquiries } from "@/features/inquiry/useInquiry";
import { inferCurrentSemester } from "@/lib/semester";
import {
  COURSE_TODO_TYPE_LABELS,
  COURSE_TODO_TYPE_COLORS,
  type CourseTodo,
  type CourseTodoType,
  type CourseOffering,
  type ResearchProposal,
  type ResearchReport,
  type Activity,
  type ActivityType,
  type CourseEnrollment,
} from "@/types";
import { cn } from "@/lib/utils";

type AddCategory = "course" | "activity" | "staff";

const TODO_TYPE_OPTIONS: CourseTodoType[] = [
  "assignment",
  "paper_reading",
  "paper_writing",
  "presentation_prep",
  "other",
];

type TabKey = "all" | "course" | "research" | "activity" | "staff";

const POPUP_PREF_KEY = "dashboard_today_popup_enabled";

function readPopupPref(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(POPUP_PREF_KEY);
  return v !== "false";
}

function writePopupPref(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(POPUP_PREF_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new Event("dashboard-popup-pref-changed"));
}

const TYPE_ROUTE: Record<ActivityType, string> = {
  study: "/activities/studies",
  project: "/activities/projects",
  external: "/activities/external",
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  study: "스터디",
  project: "프로젝트",
  external: "대외활동",
};

interface ActivityFlat extends Activity {
  participants?: string[];
  members?: string[];
}

function isUserInvolved(a: ActivityFlat, userId: string): boolean {
  if (a.leaderId === userId) return true;
  if (Array.isArray(a.members) && a.members.includes(userId)) return true;
  if (Array.isArray(a.participants) && a.participants.includes(userId)) return true;
  return false;
}

export default function MyTodosWidget() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isStaff = isAtLeast(user, "staff");
  const userId = user?.id;
  const [tab, setTab] = useState<TabKey>("all");

  // ── 1) 수업 할 일 ──
  const { data: courseTodosRes } = useQuery({
    queryKey: ["my-course-todos", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await courseTodosApi.listByUser(userId);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const courseTodos = (courseTodosRes?.data ?? []) as CourseTodo[];
  const incompleteCourseTodos = useMemo(
    () =>
      courseTodos
        .filter((t) => !t.completed)
        .sort((a, b) => {
          const ka = a.dueDate ?? a.sessionDate ?? "9999-12-31";
          const kb = b.dueDate ?? b.sessionDate ?? "9999-12-31";
          return ka.localeCompare(kb);
        }),
    [courseTodos],
  );

  const todoCourseIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of courseTodos) if (t.courseOfferingId) set.add(t.courseOfferingId);
    return Array.from(set);
  }, [courseTodos]);

  const { data: courseInfoMap = {} } = useQuery({
    queryKey: ["my-course-todo-info", todoCourseIds.sort().join(",")],
    queryFn: async () => {
      const map: Record<string, { name: string; startMin: number | null }> = {};
      await Promise.all(
        todoCourseIds.map(async (id) => {
          try {
            const c = (await courseOfferingsApi.get(id)) as unknown as CourseOffering;
            if (c) {
              const parsed = parseSchedule(c.schedule);
              map[id] = { name: c.courseName, startMin: parsed.startMin };
            }
          } catch {
            // skip
          }
        }),
      );
      return map;
    },
    enabled: todoCourseIds.length > 0,
    staleTime: 5 * 60_000,
  });

  async function toggleCourseTodo(t: CourseTodo) {
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

  // ── 2) 연구활동 ──
  const { data: proposalsRes } = useQuery({
    queryKey: ["my-research-proposals", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await researchProposalsApi.listByUser(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
  const proposals = (proposalsRes?.data ?? []) as ResearchProposal[];

  const { data: reportsRes } = useQuery({
    queryKey: ["my-research-reports", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await researchReportsApi.listByUser(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
  const reports = (reportsRes?.data ?? []) as ResearchReport[];

  type ResearchTodo = {
    id: string;
    title: string;
    href: string;
    note?: string;
  };
  const researchTodos: ResearchTodo[] = useMemo(() => {
    const list: ResearchTodo[] = [];
    if (proposals.length === 0) {
      list.push({
        id: "no-proposal",
        title: "연구 계획서 작성하기",
        href: "/mypage/research",
        note: "아직 작성된 연구 계획서가 없어요",
      });
    } else {
      // 가장 최근 업데이트된 계획서 1건 노출
      const latest = [...proposals].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
      )[0];
      list.push({
        id: latest.id,
        title: latest.titleKo || latest.titleEn || "연구 계획서 이어 작성",
        href: "/mypage/research",
        note: "마지막 저장 후 이어 작성",
      });
    }
    if (reports.length === 0) {
      list.push({
        id: "no-report",
        title: "연구 보고서 시작하기",
        href: "/mypage/research",
        note: "1·2장부터 차근차근 채워보세요",
      });
    } else {
      const latestReport = [...reports].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
      )[0];
      const reportLabel =
        latestReport.fieldDescription?.slice(0, 40) ||
        latestReport.problemDefinition?.slice(0, 40) ||
        "연구 보고서 이어 작성";
      list.push({
        id: latestReport.id,
        title: reportLabel,
        href: "/mypage/research",
        note: "마지막 저장 후 이어 작성",
      });
    }
    return list;
  }, [proposals, reports]);

  // ── 3) 학술활동 ──
  const { data: allActivities = [] } = useQuery({
    queryKey: ["my-activities-todos"],
    queryFn: async () => {
      const res = await activitiesApi.list();
      return res.data as ActivityFlat[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const myActivityTodos = useMemo(() => {
    if (!user) return [] as ActivityFlat[];
    return allActivities
      .filter((a) => a.status !== "completed")
      .filter((a) => isUserInvolved(a, user.id))
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  }, [allActivities, user]);

  // ── 4) 운영진 (staff 전용) ──
  const { pendingMembers } = usePendingMembers({ enabled: isStaff });
  const { inquiries } = useInquiries({ enabled: isStaff });
  const unansweredInquiries = useMemo(
    () => inquiries.filter((q) => q.status === "pending"),
    [inquiries],
  );

  // ── 카운트 ──
  const counts = {
    course: incompleteCourseTodos.length,
    research: researchTodos.length,
    activity: myActivityTodos.length,
    staff: isStaff ? pendingMembers.length + unansweredInquiries.length : 0,
  };
  const totalCount = counts.course + counts.research + counts.activity + counts.staff;

  // ── 오늘의 할 일 팝업 설정 (localStorage 영속) ──
  const [popupEnabled, setPopupEnabled] = useState<boolean>(true);
  useEffect(() => {
    setPopupEnabled(readPopupPref());
  }, []);
  function togglePopupPref() {
    const next = !popupEnabled;
    setPopupEnabled(next);
    writePopupPref(next);
    toast.success(
      next ? "로그인 시 오늘의 할 일 팝업을 다시 표시합니다." : "팝업 표시를 껐습니다.",
    );
  }

  // ── 빠른 추가 다이얼로그 ──
  const [addOpen, setAddOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<AddCategory>("course");
  const [saving, setSaving] = useState(false);

  // 수업 추가 폼
  const [courseForm, setCourseForm] = useState({
    courseOfferingId: "",
    type: "assignment" as CourseTodoType,
    content: "",
    dueDate: "",
    sessionDate: "",
  });
  // 운영진 추가 폼
  const [staffForm, setStaffForm] = useState({
    title: "",
    description: "",
    priority: "medium" as "high" | "medium" | "low",
    dueDate: "",
  });
  // 학술활동 추가 폼 — admin_todos에 relatedActivity* 필드를 채워 양방향 연동
  const [activityForm, setActivityForm] = useState({
    activityId: "",
    title: "",
    description: "",
    priority: "medium" as "high" | "medium" | "low",
    dueDate: "",
  });

  // 수업 picker 옵션 — 본인 수강 과목 (이번 학기)
  const { year: curYear, semester: curSem } = inferCurrentSemester(new Date());
  const curTerm = curSem === "first" ? "spring" : "fall";
  const { data: enrollmentsRes } = useQuery({
    queryKey: ["my-enrollments-for-todo", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await courseEnrollmentsApi.listByUser(userId);
    },
    enabled: !!userId && addOpen && addCategory === "course",
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
    enabled: addOpen && addCategory === "course",
    staleTime: 5 * 60_000,
  });
  const pickerOfferings: CourseOffering[] = useMemo(() => {
    return ((pickerOfferingsRes?.data ?? []) as CourseOffering[]).filter((o) =>
      myEnrollmentCourseIds.includes(o.id),
    );
  }, [pickerOfferingsRes, myEnrollmentCourseIds]);

  function openAdd() {
    setAddCategory("course");
    setCourseForm({
      courseOfferingId: "",
      type: "assignment",
      content: "",
      dueDate: "",
      sessionDate: "",
    });
    setStaffForm({
      title: "",
      description: "",
      priority: "medium",
      dueDate: "",
    });
    setActivityForm({
      activityId: "",
      title: "",
      description: "",
      priority: "medium",
      dueDate: "",
    });
    setAddOpen(true);
  }

  async function saveAdd() {
    if (!user || !userId) return;
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
          createdByName: user.name ?? "활동 운영진",
          relatedActivityId: target.id,
          relatedActivityTitle: target.title,
          relatedActivityType: target.type,
        });
        await qc.invalidateQueries({ queryKey: ["admin-todos"] });
        await qc.invalidateQueries({ queryKey: ["activity-todos", target.id] });
        toast.success(
          `학술활동 "${target.title}"에 연동된 업무가 추가되었습니다 — /activities/${target.type}/${target.id} 와 /staff-admin/todos 양쪽에 표시됩니다.`,
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
          createdByName: user.name ?? "운영진",
        });
        await qc.invalidateQueries({ queryKey: ["admin-todos"] });
        toast.success("운영 업무에 추가되었습니다 — /staff-admin/todos 에도 표시됩니다.");
      }
      setAddOpen(false);
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  // ── 렌더 헬퍼 ──
  function CourseTodoItem({ t }: { t: CourseTodo }) {
    const info = courseInfoMap[t.courseOfferingId];
    const courseName = info?.name ?? "(과목)";
    const dueTime = info?.startMin != null ? fmtMin(info.startMin) : undefined;
    const sessionLabel = t.sessionDate
      ? (() => {
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t.sessionDate);
          if (!m) return null;
          return `${Number(m[2])}/${Number(m[3])} 수업`;
        })()
      : null;
    return (
      <li className="flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-[12px]">
        <input
          type="checkbox"
          checked={!!t.completed}
          onChange={() => toggleCourseTodo(t)}
          className="shrink-0"
          aria-label="완료 토글"
        />
        <Badge
          variant="secondary"
          className={cn("text-[10px]", COURSE_TODO_TYPE_COLORS[t.type])}
        >
          {COURSE_TODO_TYPE_LABELS[t.type]}
        </Badge>
        <Link
          href={`/courses/${t.courseOfferingId}/schedule`}
          className="truncate text-[10px] text-muted-foreground hover:text-primary"
          title={courseName}
        >
          {courseName}
        </Link>
        {sessionLabel && (
          <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
            {sessionLabel}
          </span>
        )}
        <span
          className={cn(
            "flex-1 truncate",
            t.completed && "text-muted-foreground line-through",
          )}
        >
          {t.content}
        </span>
        {t.dueDate &&
          (() => {
            const dd = formatDday(t.dueDate, dueTime);
            if (!dd) return null;
            const cls =
              dd.kind === "past"
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : dd.kind === "today"
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : dd.diffDays <= 3
                    ? "bg-orange-50 text-orange-700 border border-orange-200"
                    : "bg-muted/60 text-muted-foreground border";
            return (
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                  cls,
                )}
                title={`기한 ${t.dueDate}`}
              >
                {dd.label}
              </span>
            );
          })()}
      </li>
    );
  }

  function ResearchItem({ item }: { item: ResearchTodo }) {
    return (
      <li>
        <Link
          href={item.href}
          className="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-2 text-[12px] transition-colors hover:bg-muted/40"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{item.title}</p>
            {item.note && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">{item.note}</p>
            )}
          </div>
          <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
        </Link>
      </li>
    );
  }

  function ActivityItem({ a }: { a: ActivityFlat }) {
    const dd = a.date ? formatDday(a.date) : null;
    const ddCls = dd
      ? dd.kind === "past"
        ? "bg-rose-50 text-rose-700 border border-rose-200"
        : dd.kind === "today"
          ? "bg-amber-50 text-amber-800 border border-amber-200"
          : dd.diffDays <= 3
            ? "bg-orange-50 text-orange-700 border border-orange-200"
            : "bg-muted/60 text-muted-foreground border"
      : "";
    return (
      <li>
        <Link
          href={`${TYPE_ROUTE[a.type]}/${a.id}`}
          className="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-2 text-[12px] transition-colors hover:bg-muted/40"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {ACTIVITY_LABELS[a.type]}
              </Badge>
              <span className="truncate font-medium">{a.title}</span>
              {dd && (
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                    ddCls,
                  )}
                  title={`시작 ${a.date}`}
                >
                  {dd.label}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {a.date}
              {a.endDate && a.endDate !== a.date ? ` ~ ${a.endDate}` : ""}
              {a.status === "ongoing" ? " · 진행중" : " · 예정"}
            </p>
          </div>
          <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
        </Link>
      </li>
    );
  }

  function StaffItems() {
    if (!isStaff) return null;
    if (pendingMembers.length === 0 && unansweredInquiries.length === 0) {
      return (
        <p className="rounded-md bg-white px-3 py-2 text-[11px] text-muted-foreground">
          처리할 운영 항목이 없습니다.
        </p>
      );
    }
    return (
      <>
        {pendingMembers.length > 0 && (
          <li>
            <Link
              href="/console/members"
              className="flex items-center justify-between rounded-md bg-white px-2.5 py-2 text-[12px] hover:bg-amber-50"
            >
              <span className="font-medium">
                승인 대기 회원 {pendingMembers.length}명
              </span>
              <Badge className="bg-amber-100 text-amber-700">처리 필요</Badge>
            </Link>
          </li>
        )}
        {unansweredInquiries.length > 0 && (
          <li>
            <Link
              href="/console/inquiries"
              className="flex items-center justify-between rounded-md bg-white px-2.5 py-2 text-[12px] hover:bg-amber-50"
            >
              <span className="font-medium">
                미답변 문의 {unansweredInquiries.length}건
              </span>
              <Badge className="bg-amber-100 text-amber-700">답변 필요</Badge>
            </Link>
          </li>
        )}
      </>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListChecks size={18} className="text-primary" />
          <h2 className="font-bold">나의 할 일</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">전체 {totalCount}건</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            onClick={togglePopupPref}
            title={
              popupEnabled
                ? "로그인 시 오늘의 할 일 팝업을 표시합니다 — 클릭하여 끄기"
                : "로그인 시 팝업이 표시되지 않습니다 — 클릭하여 켜기"
            }
            aria-label={popupEnabled ? "팝업 끄기" : "팝업 켜기"}
          >
            {popupEnabled ? (
              <>
                <Bell size={12} className="mr-0.5" /> 팝업 ON
              </>
            ) : (
              <>
                <BellOff size={12} className="mr-0.5 text-muted-foreground" /> 팝업 OFF
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            onClick={openAdd}
          >
            <Plus size={12} className="mr-0.5" /> 추가
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mt-3">
        <TabsList
          className={cn(
            "grid w-full",
            isStaff ? "grid-cols-5" : "grid-cols-4",
          )}
        >
          <TabsTrigger value="all" className="text-[11px] sm:text-xs">
            전체 {totalCount > 0 && <span className="ml-1 text-muted-foreground">{totalCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="course" className="text-[11px] sm:text-xs">
            수업 {counts.course > 0 && <span className="ml-1 text-muted-foreground">{counts.course}</span>}
          </TabsTrigger>
          <TabsTrigger value="research" className="text-[11px] sm:text-xs">
            연구활동 {counts.research > 0 && <span className="ml-1 text-muted-foreground">{counts.research}</span>}
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-[11px] sm:text-xs">
            학술활동 {counts.activity > 0 && <span className="ml-1 text-muted-foreground">{counts.activity}</span>}
          </TabsTrigger>
          {isStaff && (
            <TabsTrigger value="staff" className="text-[11px] sm:text-xs">
              운영진 {counts.staff > 0 && <span className="ml-1 text-muted-foreground">{counts.staff}</span>}
            </TabsTrigger>
          )}
        </TabsList>

        {/* 전체 */}
        <TabsContent value="all" className="mt-3 space-y-4">
          {totalCount === 0 ? (
            <p className="rounded-md bg-muted/30 px-3 py-3 text-center text-[11px] text-muted-foreground">
              표시할 할 일이 없어요.
            </p>
          ) : (
            <>
              {incompleteCourseTodos.length > 0 && (
                <section>
                  <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <BookOpen size={12} /> 수업
                  </p>
                  <ul className="space-y-1">
                    {incompleteCourseTodos.slice(0, 5).map((t) => (
                      <CourseTodoItem key={t.id} t={t} />
                    ))}
                  </ul>
                </section>
              )}
              {researchTodos.length > 0 && (
                <section>
                  <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <Microscope size={12} /> 연구활동
                  </p>
                  <ul className="space-y-1">
                    {researchTodos.slice(0, 3).map((r) => (
                      <ResearchItem key={r.id} item={r} />
                    ))}
                  </ul>
                </section>
              )}
              {myActivityTodos.length > 0 && (
                <section>
                  <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <UsersIcon size={12} /> 학술활동
                  </p>
                  <ul className="space-y-1">
                    {myActivityTodos.slice(0, 5).map((a) => (
                      <ActivityItem key={a.id} a={a} />
                    ))}
                  </ul>
                </section>
              )}
              {isStaff && counts.staff > 0 && (
                <section>
                  <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <ShieldAlert size={12} /> 운영진
                  </p>
                  <ul className="space-y-1">
                    <StaffItems />
                  </ul>
                </section>
              )}
            </>
          )}
        </TabsContent>

        {/* 수업 */}
        <TabsContent value="course" className="mt-3">
          {incompleteCourseTodos.length === 0 ? (
            <p className="rounded-md bg-muted/30 px-3 py-3 text-center text-[11px] text-muted-foreground">
              수업 할 일이 없어요. 수업 일정에서 <ListChecks size={11} className="inline" /> 할 일 버튼으로 추가할 수 있어요.
            </p>
          ) : (
            <ul className="space-y-1">
              {incompleteCourseTodos.map((t) => (
                <CourseTodoItem key={t.id} t={t} />
              ))}
            </ul>
          )}
        </TabsContent>

        {/* 연구활동 */}
        <TabsContent value="research" className="mt-3">
          {researchTodos.length === 0 ? (
            <p className="rounded-md bg-muted/30 px-3 py-3 text-center text-[11px] text-muted-foreground">
              표시할 연구활동 할 일이 없어요.
            </p>
          ) : (
            <ul className="space-y-1">
              {researchTodos.map((r) => (
                <ResearchItem key={r.id} item={r} />
              ))}
            </ul>
          )}
        </TabsContent>

        {/* 학술활동 */}
        <TabsContent value="activity" className="mt-3">
          {myActivityTodos.length === 0 ? (
            <p className="rounded-md bg-muted/30 px-3 py-3 text-center text-[11px] text-muted-foreground">
              참여 중인 학술활동이 없어요.
            </p>
          ) : (
            <ul className="space-y-1">
              {myActivityTodos.map((a) => (
                <ActivityItem key={a.id} a={a} />
              ))}
            </ul>
          )}
        </TabsContent>

        {/* 운영진 (staff only) */}
        {isStaff && (
          <TabsContent value="staff" className="mt-3">
            <ul className="space-y-1">
              <StaffItems />
            </ul>
          </TabsContent>
        )}
      </Tabs>

      {/* 빠른 추가 Dialog — 카테고리별로 실제 컬렉션에 양방향 기록 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>할 일 추가</DialogTitle>
          </DialogHeader>

          <Tabs
            value={addCategory}
            onValueChange={(v) => setAddCategory(v as AddCategory)}
            className="mt-1"
          >
            <TabsList
              className={cn(
                "grid w-full",
                isStaff
                  ? myActivityTodos.length > 0
                    ? "grid-cols-3"
                    : "grid-cols-2"
                  : myActivityTodos.length > 0
                    ? "grid-cols-2"
                    : "grid-cols-1",
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
                  className="rounded-md border bg-white px-2 py-1.5 text-sm"
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
                  추가하면 <b>/staff-admin/todos</b> 운영 업무수행철과 해당 활동 상세 페이지 양쪽에 표시됩니다.
                </p>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">학술활동</span>
                  <select
                    value={activityForm.activityId}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, activityId: e.target.value })
                    }
                    className="rounded-md border bg-white px-2 py-1.5 text-sm"
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
                    className="w-full rounded-md border bg-white px-3 py-2 text-sm"
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
                      className="rounded-md border bg-white px-2 py-1.5 text-sm"
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
              <TabsContent value="staff" className="mt-3 space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  추가하면 <b>/staff-admin/todos</b> 운영 업무수행철에도 자동으로 등록됩니다.
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
                    className="w-full rounded-md border bg-white px-3 py-2 text-sm"
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
                      className="rounded-md border bg-white px-2 py-1.5 text-sm"
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
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              취소
            </Button>
            <Button onClick={saveAdd} disabled={saving}>
              {saving ? "저장 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
