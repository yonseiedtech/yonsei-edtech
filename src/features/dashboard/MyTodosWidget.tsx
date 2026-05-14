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
  Mic,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronLeft,
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
  courseReviewsApi,
  todosApi,
  researchProposalsApi,
  researchReportsApi,
  activitiesApi,
  seminarsApi,
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
  type CourseCategory,
  type SemesterTerm,
  type ResearchProposal,
  type ResearchReport,
  type Activity,
  type ActivityType,
  type CourseEnrollment,
  type Seminar,
} from "@/types";
import { cn } from "@/lib/utils";

type AddCategory = "course" | "activity" | "seminar" | "staff";

type StatusFilter = "all" | "open" | "done";

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [editingCourseTodoId, setEditingCourseTodoId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

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
  const completedCourseTodos = useMemo(
    () =>
      courseTodos
        .filter((t) => t.completed)
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [courseTodos],
  );
  const filteredCourseTodos =
    statusFilter === "done"
      ? completedCourseTodos
      : statusFilter === "open"
        ? incompleteCourseTodos
        : [...incompleteCourseTodos, ...completedCourseTodos];

  const todoCourseIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of courseTodos) if (t.courseOfferingId) set.add(t.courseOfferingId);
    return Array.from(set);
  }, [courseTodos]);

  const { data: courseInfoMap = {} } = useQuery({
    queryKey: ["my-course-todo-info", todoCourseIds.sort().join(",")],
    queryFn: async () => {
      const map: Record<
        string,
        {
          name: string;
          startMin: number | null;
          year?: number;
          term?: SemesterTerm;
          category?: CourseCategory;
          professor?: string;
        }
      > = {};
      await Promise.all(
        todoCourseIds.map(async (id) => {
          try {
            const c = (await courseOfferingsApi.get(id)) as unknown as CourseOffering;
            if (c) {
              const parsed = parseSchedule(c.schedule);
              map[id] = {
                name: c.courseName,
                startMin: parsed.startMin,
                year: c.year,
                term: c.term,
                category: c.category,
                professor: c.professor,
              };
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
      await qc.invalidateQueries({
        queryKey: ["course-todos", t.courseOfferingId, userId],
      });
    } catch (e) {
      toast.error(`변경 실패: ${(e as Error).message}`);
    }
  }

  function startEditCourseTodo(t: CourseTodo) {
    setEditingCourseTodoId(t.id);
    setEditingContent(t.content);
  }

  function cancelEditCourseTodo() {
    setEditingCourseTodoId(null);
    setEditingContent("");
  }

  async function saveEditCourseTodo(t: CourseTodo) {
    if (!userId) return;
    const next = editingContent.trim();
    if (!next) {
      toast.error("내용을 입력하세요.");
      return;
    }
    if (next === t.content) {
      cancelEditCourseTodo();
      return;
    }
    try {
      await courseTodosApi.update(t.id, { content: next });
      await qc.refetchQueries({ queryKey: ["my-course-todos", userId], type: "active" });
      await qc.invalidateQueries({
        queryKey: ["course-todos", t.courseOfferingId, userId],
      });
      cancelEditCourseTodo();
      toast.success("수정되었습니다.");
    } catch (e) {
      toast.error(`수정 실패: ${(e as Error).message}`);
    }
  }

  async function deleteCourseTodo(t: CourseTodo) {
    if (!userId) return;
    if (!confirm(`"${t.content}" 할 일을 삭제할까요?`)) return;
    try {
      await courseTodosApi.delete(t.id);
      await qc.refetchQueries({ queryKey: ["my-course-todos", userId], type: "active" });
      await qc.invalidateQueries({
        queryKey: ["course-todos", t.courseOfferingId, userId],
      });
      toast.success("삭제되었습니다.");
    } catch (e) {
      toast.error(`삭제 실패: ${(e as Error).message}`);
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

  const myActivitiesAll = useMemo(() => {
    if (!user) return [] as ActivityFlat[];
    const today = new Date().toISOString().slice(0, 10);
    return allActivities
      .filter((a) => isUserInvolved(a, user.id))
      .filter((a) => {
        // 종료일(없으면 시작일)이 오늘 이후인 활동만 표시 — 이미 지난 활동 제외
        const endish = a.endDate ?? a.date;
        if (!endish) return true;
        return endish >= today;
      })
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  }, [allActivities, user]);
  const myActivityTodos = useMemo(
    () => myActivitiesAll.filter((a) => a.status !== "completed"),
    [myActivitiesAll],
  );
  const myCompletedActivities = useMemo(
    () => myActivitiesAll.filter((a) => a.status === "completed"),
    [myActivitiesAll],
  );
  const filteredActivityList =
    statusFilter === "done"
      ? myCompletedActivities
      : statusFilter === "open"
        ? myActivityTodos
        : myActivitiesAll;

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
  // F5 (Sprint 2): 모바일 다이얼로그 단계화 — picker(컨텍스트 선택) → form(선택 폼)
  const [mobileStep, setMobileStep] = useState<"picker" | "form">("picker");
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
  // 세미나 추가 폼 — admin_todos에 relatedSeminar* 필드 양방향 연동
  const [seminarForm, setSeminarForm] = useState({
    seminarId: "",
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

  // 세미나 picker — staff: 전체, 호스트: 본인 호스트 세미나만. 미래·최근 30일 이내 우선
  const { data: seminarsListRes } = useQuery({
    queryKey: ["seminars-for-todo-picker"],
    queryFn: () => seminarsApi.list({ limit: 100 }),
    enabled: addOpen && addCategory === "seminar",
    staleTime: 5 * 60_000,
  });
  const pickerSeminars: Seminar[] = useMemo(() => {
    const all = ((seminarsListRes?.data ?? []) as Seminar[]).slice();
    if (!user) return [];
    const filtered = isStaff
      ? all
      : all.filter((s) => (s.hostUserIds ?? []).includes(user.id));
    // 미래 → 최근 과거 순 정렬, 30일 초과 과거는 컷
    const today = new Date().toISOString().slice(0, 10);
    return filtered
      .filter((s) => {
        if (!s.date) return true;
        const days = (new Date(today).getTime() - new Date(s.date).getTime()) / 86400000;
        return days <= 30; // 30일 초과 과거 제외
      })
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [seminarsListRes, isStaff, user]);

  function openAdd() {
    setMobileStep("picker");
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
    setSeminarForm({
      seminarId: "",
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
          createdByName: user.name ?? "운영진",
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
          createdByName: user.name ?? "운영진",
        });
        await qc.invalidateQueries({ queryKey: ["admin-todos"] });
        toast.success("운영 업무에 추가되었습니다 — /console/todos 에도 표시됩니다.");
      }
      setAddOpen(false);
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  // ── 강의 후기 인라인 폼 (Sprint 52) ──
  function LectureReviewItem({
    t,
    courseName,
    sessionLabel,
    info,
  }: {
    t: CourseTodo;
    courseName: string;
    sessionLabel: string | null;
    info?: {
      name: string;
      startMin: number | null;
      year?: number;
      term?: SemesterTerm;
      category?: CourseCategory;
      professor?: string;
    };
  }) {
    const [rating, setRating] = useState<number>(4);
    const [comment, setComment] = useState<string>("");
    const [submitting, setSubmitting] = useState<boolean>(false);

    async function submitReview() {
      if (!userId) return;
      const trimmed = comment.trim();
      if (trimmed.length < 5) {
        toast.error("후기를 5자 이상 입력해주세요.");
        return;
      }
      if (!info?.year || !info?.term) {
        toast.error("강의 정보 로드 중입니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      setSubmitting(true);
      try {
        const nowIso = new Date().toISOString();
        await courseReviewsApi.create({
          courseOfferingId: t.courseOfferingId,
          courseName: info.name,
          professor: info.professor,
          category: info.category,
          authorId: userId,
          authorName: user?.name ?? "",
          anonymous: false,
          rating,
          comment: trimmed,
          recommend: rating >= 3,
          year: info.year,
          term: info.term,
          helpfulCount: 0,
          helpfulBy: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        await courseTodosApi.update(t.id, {
          completed: true,
          completedAt: nowIso,
        });
        await qc.refetchQueries({
          queryKey: ["my-course-todos", userId],
          type: "active",
        });
        toast.success("후기 등록 완료! 동기들에게 큰 도움이 됩니다.");
      } catch (e) {
        toast.error(`후기 등록 실패: ${(e as Error).message}`);
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <li className="rounded-md border border-rose-200 bg-rose-50/40 px-2.5 py-2">
        <div className="flex items-center gap-2 text-[12px]">
          <input
            type="checkbox"
            checked={false}
            onChange={() => toggleCourseTodo(t)}
            className="shrink-0"
            aria-label="완료 토글"
            title="후기 없이 완료 처리"
          />
          <Badge
            variant="secondary"
            className={cn("text-[10px]", COURSE_TODO_TYPE_COLORS.lecture_review)}
          >
            수업 후기
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
          <span className="ml-auto truncate text-[11px] font-semibold text-rose-700">
            한 줄 후기 작성
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div
            className="flex shrink-0 items-center gap-1"
            role="radiogroup"
            aria-label="평점 (1~5)"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={cn(
                  "h-7 w-7 rounded-full text-xs font-bold transition-colors",
                  rating >= n
                    ? "bg-amber-400 text-white shadow-sm"
                    : "bg-card text-muted-foreground hover:bg-amber-50",
                )}
                aria-pressed={rating === n}
                aria-label={`${n}점`}
                disabled={submitting}
              >
                {n}
              </button>
            ))}
          </div>
          <Input
            placeholder="이번 수업 어땠나요? 한 줄로 남겨주세요"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitReview();
              }
            }}
            className="h-9 flex-1 text-[12px]"
            disabled={submitting}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => void submitReview()}
            disabled={submitting || comment.trim().length < 5}
            className="h-9 shrink-0 px-3 text-[12px]"
          >
            {submitting ? "전송…" : "제출"}
          </Button>
        </div>
      </li>
    );
  }

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

    // Sprint 52: 미완료 lecture_review 는 인라인 후기 폼으로 렌더
    if (t.type === "lecture_review" && !t.completed) {
      return (
        <LectureReviewItem
          t={t}
          courseName={courseName}
          sessionLabel={sessionLabel}
          info={info}
        />
      );
    }

    const isEditing = editingCourseTodoId === t.id;
    return (
      <li className="group flex items-center gap-2 rounded-md bg-card px-2.5 py-1.5 text-[12px]">
        <input
          type="checkbox"
          checked={!!t.completed}
          onChange={() => toggleCourseTodo(t)}
          className="shrink-0"
          aria-label="완료 토글"
          disabled={isEditing}
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
        {isEditing ? (
          <Input
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void saveEditCourseTodo(t);
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelEditCourseTodo();
              }
            }}
            autoFocus
            className="h-6 flex-1 px-2 py-0 text-[12px]"
          />
        ) : (
          <span
            className={cn(
              "flex-1 truncate",
              t.completed && "text-muted-foreground line-through",
            )}
          >
            {t.content}
          </span>
        )}
        {!isEditing && t.dueDate &&
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
        {isEditing ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => void saveEditCourseTodo(t)}
              className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
              title="저장 (Enter)"
              aria-label="저장"
            >
              <Check size={12} />
            </button>
            <button
              type="button"
              onClick={cancelEditCourseTodo}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              title="취소 (Esc)"
              aria-label="취소"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            <button
              type="button"
              onClick={() => startEditCourseTodo(t)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary"
              title="수정"
              aria-label="수정"
            >
              <Pencil size={11} />
            </button>
            <button
              type="button"
              onClick={() => void deleteCourseTodo(t)}
              className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
              title="삭제"
              aria-label="삭제"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </li>
    );
  }

  function ResearchItem({ item }: { item: ResearchTodo }) {
    return (
      <li>
        <Link
          href={item.href}
          className="flex items-center justify-between gap-2 rounded-md bg-card px-2.5 py-2 text-[12px] transition-colors hover:bg-muted/40"
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
          className="flex items-center justify-between gap-2 rounded-md bg-card px-2.5 py-2 text-[12px] transition-colors hover:bg-muted/40"
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
        <p className="rounded-md bg-card px-3 py-2 text-[11px] text-muted-foreground">
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
              className="flex items-center justify-between rounded-md bg-card px-2.5 py-2 text-[12px] hover:bg-amber-50"
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
              className="flex items-center justify-between rounded-md bg-card px-2.5 py-2 text-[12px] hover:bg-amber-50"
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
    <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListChecks size={18} className="text-primary" />
          <h2 className="text-lg font-bold sm:text-xl">나의 할 일</h2>
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
            // 모바일: 가로 스크롤 — 텍스트 압축 방지 (375px 5탭 → 11px 줄어드는 문제 해결)
            "flex w-full overflow-x-auto whitespace-nowrap pb-0.5 sm:overflow-visible",
            // 데스크톱: 균등 분할 그리드
            isStaff ? "sm:grid sm:grid-cols-5" : "sm:grid sm:grid-cols-4",
          )}
        >
          <TabsTrigger value="all" className="shrink-0 text-xs sm:text-xs">
            전체 {totalCount > 0 && <span className="ml-1 text-muted-foreground">{totalCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="course" className="shrink-0 text-xs sm:text-xs">
            수업 {counts.course > 0 && <span className="ml-1 text-muted-foreground">{counts.course}</span>}
          </TabsTrigger>
          <TabsTrigger value="research" className="shrink-0 text-xs sm:text-xs">
            연구활동 {counts.research > 0 && <span className="ml-1 text-muted-foreground">{counts.research}</span>}
          </TabsTrigger>
          <TabsTrigger value="activity" className="shrink-0 text-xs sm:text-xs">
            학술활동 {counts.activity > 0 && <span className="ml-1 text-muted-foreground">{counts.activity}</span>}
          </TabsTrigger>
          {isStaff && (
            <TabsTrigger value="staff" className="shrink-0 text-xs sm:text-xs">
              운영진 {counts.staff > 0 && <span className="ml-1 text-muted-foreground">{counts.staff}</span>}
            </TabsTrigger>
          )}
        </TabsList>

        {/* 상태 필터 — 카테고리 탭 하위에 위치 (전체/수업/연구활동/학술활동/운영진 공통) */}
        <div className="mt-2 flex items-center gap-1 rounded-md bg-muted/40 p-0.5 text-[11px]">
          {(
            [
              { v: "all", label: "전체" },
              { v: "open", label: "예정·진행중" },
              { v: "done", label: "완료" },
            ] as { v: StatusFilter; label: string }[]
          ).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setStatusFilter(opt.v)}
              className={cn(
                "flex-1 rounded px-2 py-1 transition-colors",
                statusFilter === opt.v
                  ? "bg-card font-semibold text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 전체 */}
        <TabsContent value="all" className="mt-3 space-y-4">
          {filteredCourseTodos.length === 0 &&
          (statusFilter !== "open" || researchTodos.length === 0) &&
          filteredActivityList.length === 0 &&
          (!isStaff || statusFilter === "done" || counts.staff === 0) ? (
            <p className="rounded-md bg-muted/30 px-3 py-3 text-center text-[11px] text-muted-foreground">
              {statusFilter === "done"
                ? "완료된 항목이 없어요."
                : "표시할 할 일이 없어요."}
            </p>
          ) : (
            <>
              {filteredCourseTodos.length > 0 && (
                <section>
                  <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <BookOpen size={12} /> 수업
                  </p>
                  <ul className="space-y-1">
                    {filteredCourseTodos.slice(0, 5).map((t) => (
                      <CourseTodoItem key={t.id} t={t} />
                    ))}
                  </ul>
                </section>
              )}
              {statusFilter !== "done" && researchTodos.length > 0 && (
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
              {filteredActivityList.length > 0 && (
                <section>
                  <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <UsersIcon size={12} /> 학술활동
                  </p>
                  <ul className="space-y-1">
                    {filteredActivityList.slice(0, 5).map((a) => (
                      <ActivityItem key={a.id} a={a} />
                    ))}
                  </ul>
                </section>
              )}
              {isStaff && statusFilter !== "done" && counts.staff > 0 && (
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
          {filteredCourseTodos.length === 0 ? (
            <p className="rounded-md bg-muted/30 px-3 py-3 text-center text-[11px] text-muted-foreground">
              {statusFilter === "done"
                ? "완료한 수업 할 일이 없어요."
                : (
                  <>
                    수업 할 일이 없어요. 수업 일정에서 <ListChecks size={11} className="inline" /> 할 일 버튼으로 추가할 수 있어요.
                  </>
                )}
            </p>
          ) : (
            <ul className="space-y-1">
              {filteredCourseTodos.map((t) => (
                <CourseTodoItem key={t.id} t={t} />
              ))}
            </ul>
          )}
        </TabsContent>

        {/* 연구활동 */}
        <TabsContent value="research" className="mt-3">
          {researchTodos.length === 0 || statusFilter === "done" ? (
            <p className="rounded-md bg-muted/30 px-3 py-3 text-center text-[11px] text-muted-foreground">
              {statusFilter === "done"
                ? "완료 상태로 표기된 연구활동 항목이 없어요."
                : "표시할 연구활동 할 일이 없어요."}
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
          {filteredActivityList.length === 0 ? (
            <p className="rounded-md bg-muted/30 px-3 py-3 text-center text-[11px] text-muted-foreground">
              {statusFilter === "done"
                ? "완료된 학술활동이 없어요."
                : "참여 중인 학술활동이 없어요."}
            </p>
          ) : (
            <ul className="space-y-1">
              {filteredActivityList.map((a) => (
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

          {/* F5 (Sprint 2): 모바일 picker — 카테고리 큰 버튼으로 단계화 (sm:hidden) */}
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
                <BookOpen size={20} className="text-blue-600" />
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
                  <UsersIcon size={20} className="text-emerald-600" />
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
                  <Mic size={20} className="text-violet-600" />
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
                  <ShieldAlert size={20} className="text-amber-600" />
                  운영 업무
                </button>
              )}
            </div>
          )}

          {/* F5: 모바일 form 단계의 back 버튼 (sm:hidden) */}
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
            // F5: 모바일 picker 단계에서는 Tabs 자체 숨김 (form 으로 진입 시 다시 노출)
            className={cn(
              "mt-1",
              mobileStep === "picker" && "hidden sm:block",
            )}
          >
            <TabsList
              className={cn(
                // F5: TabsList 는 데스크톱 전용 (모바일은 picker 가 대체)
                "hidden w-full sm:grid",
                (() => {
                  let n = 1; // 수업
                  if (myActivityTodos.length > 0) n++;
                  if (isStaff) n += 2; // 세미나 + 운영 업무
                  // Tailwind JIT 정적 추출용 룩업
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
