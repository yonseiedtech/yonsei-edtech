"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ListChecks,
  BookOpen,
  Microscope,
  Users as UsersIcon,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import {
  courseTodosApi,
  courseOfferingsApi,
  researchProposalsApi,
  researchReportsApi,
  activitiesApi,
} from "@/lib/bkend";
import { usePendingMembers } from "@/features/member/useMembers";
import { useInquiries } from "@/features/inquiry/useInquiry";
import {
  COURSE_TODO_TYPE_LABELS,
  COURSE_TODO_TYPE_COLORS,
  type CourseTodo,
  type CourseOffering,
  type ResearchProposal,
  type ResearchReport,
  type Activity,
  type ActivityType,
} from "@/types";
import { cn } from "@/lib/utils";

type TabKey = "all" | "course" | "research" | "activity" | "staff";

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

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const today = todayYmd();
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

  const { data: courseNameMap = {} } = useQuery({
    queryKey: ["my-course-todo-names", todoCourseIds.sort().join(",")],
    queryFn: async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        todoCourseIds.map(async (id) => {
          try {
            const c = (await courseOfferingsApi.get(id)) as unknown as CourseOffering;
            if (c) map[id] = c.courseName;
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

  if (!user) return null;

  // ── 렌더 헬퍼 ──
  function CourseTodoItem({ t }: { t: CourseTodo }) {
    const courseName = courseNameMap[t.courseOfferingId] ?? "(과목)";
    const isOverdue = !t.completed && !!t.dueDate && t.dueDate < today;
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
        {t.dueDate && (
          <span
            className={cn(
              "shrink-0 text-[10px]",
              isOverdue ? "font-semibold text-rose-600" : "text-muted-foreground",
            )}
          >
            ~{t.dueDate}
            {isOverdue && " (지남)"}
          </span>
        )}
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
        <span className="text-[11px] text-muted-foreground">전체 {totalCount}건</span>
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
    </div>
  );
}
