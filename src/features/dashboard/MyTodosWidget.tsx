"use client";

/**
 * MyTodosWidget — 대시보드 "나의 할 일" 통합 위젯 (수업·연구활동·학술활동·운영진).
 *
 * Phase B 단순 분할:
 * - AddTodoDialog        → src/features/dashboard/todos/AddTodoDialog.tsx
 * - LectureReviewItem    → src/features/dashboard/todos/LectureReviewItem.tsx
 * - CourseTodoItem       → src/features/dashboard/todos/CourseTodoItem.tsx
 * - ResearchItem         → src/features/dashboard/todos/ResearchItem.tsx
 * - ActivityItem         → src/features/dashboard/todos/ActivityItem.tsx
 * - StaffItems           → src/features/dashboard/todos/StaffItems.tsx
 * - 공통 타입·헬퍼       → src/features/dashboard/todos/types.ts
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ListChecks,
  BookOpen,
  Microscope,
  Users as UsersIcon,
  ShieldAlert,
  Plus,
  Bell,
  BellOff,
} from "lucide-react";
import { parseSchedule } from "@/lib/courseSchedule";
import { Button } from "@/components/ui/button";
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
  type CourseTodo,
  type CourseOffering,
  type CourseCategory,
  type SemesterTerm,
  type ResearchProposal,
  type ResearchReport,
} from "@/types";
import { cn } from "@/lib/utils";
import { AddTodoDialog } from "./todos/AddTodoDialog";
import { CourseTodoItem, type CourseInfo } from "./todos/CourseTodoItem";
import { ResearchItem } from "./todos/ResearchItem";
import { ActivityItem } from "./todos/ActivityItem";
import { StaffItems } from "./todos/StaffItems";
import {
  isUserInvolved,
  readPopupPref,
  writePopupPref,
  type ActivityFlat,
  type ResearchTodo,
  type StatusFilter,
  type TabKey,
} from "./todos/types";

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

  const { data: courseInfoMap = {} } = useQuery<Record<string, CourseInfo>>({
    queryKey: ["my-course-todo-info", todoCourseIds.sort().join(",")],
    queryFn: async () => {
      const map: Record<string, CourseInfo> = {};
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
                term: c.term as SemesterTerm,
                category: c.category as CourseCategory,
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

  const researchTodos: ResearchTodo[] = useMemo(() => {
    const list: ResearchTodo[] = [];
    if (proposals.length === 0) {
      list.push({
        id: "no-proposal",
        title: "연구 계획서 작성하기",
        href: "/mypage/research?tab=proposal",
        note: "아직 작성된 연구 계획서가 없어요",
      });
    } else {
      const latest = [...proposals].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
      )[0];
      list.push({
        id: latest.id,
        title: latest.titleKo || latest.titleEn || "연구 계획서 이어 작성",
        href: "/mypage/research?tab=proposal",
        note: "마지막 저장 후 이어 작성",
      });
    }
    if (reports.length === 0) {
      list.push({
        id: "no-report",
        title: "연구 보고서 시작하기",
        href: "/mypage/research?tab=reportdoc",
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
        href: "/mypage/research?tab=reportdoc",
        note: "마지막 저장 후 이어 작성",
      });
    }
    return list;
  }, [proposals, reports]);

  // ── 3) 학술활동 ──
  const { data: allActivitiesRes } = useQuery({
    queryKey: ["activities", "all"],
    queryFn: async () => activitiesApi.list(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const allActivities = useMemo(
    () => ((allActivitiesRes?.data ?? []) as ActivityFlat[]),
    [allActivitiesRes],
  );

  const myActivitiesAll = useMemo(() => {
    if (!user) return [] as ActivityFlat[];
    const today = new Date().toISOString().slice(0, 10);
    return allActivities
      .filter((a) => isUserInvolved(a, user.id))
      .filter((a) => {
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

  // ── 빠른 추가 다이얼로그 open 상태 ──
  const [addOpen, setAddOpen] = useState(false);

  if (!user) return null;

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
            onClick={() => setAddOpen(true)}
          >
            <Plus size={12} className="mr-0.5" /> 추가
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mt-3">
        <TabsList
          className={cn(
            "flex w-full overflow-x-auto whitespace-nowrap pb-0.5 sm:overflow-visible",
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

        {/* 상태 필터 — 카테고리 탭 하위에 위치 */}
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
                      <CourseTodoItem
                        key={t.id}
                        t={t}
                        info={courseInfoMap[t.courseOfferingId]}
                        userId={user.id}
                        userName={user.name}
                        editingCourseTodoId={editingCourseTodoId}
                        editingContent={editingContent}
                        onEditingContentChange={setEditingContent}
                        onToggle={toggleCourseTodo}
                        onStartEdit={startEditCourseTodo}
                        onCancelEdit={cancelEditCourseTodo}
                        onSaveEdit={saveEditCourseTodo}
                        onDelete={deleteCourseTodo}
                      />
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
                    <StaffItems
                      pendingMembersCount={pendingMembers.length}
                      unansweredInquiriesCount={unansweredInquiries.length}
                    />
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
                <CourseTodoItem
                  key={t.id}
                  t={t}
                  info={courseInfoMap[t.courseOfferingId]}
                  userId={user.id}
                  userName={user.name}
                  editingCourseTodoId={editingCourseTodoId}
                  editingContent={editingContent}
                  onEditingContentChange={setEditingContent}
                  onToggle={toggleCourseTodo}
                  onStartEdit={startEditCourseTodo}
                  onCancelEdit={cancelEditCourseTodo}
                  onSaveEdit={saveEditCourseTodo}
                  onDelete={deleteCourseTodo}
                />
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
              <StaffItems
                pendingMembersCount={pendingMembers.length}
                unansweredInquiriesCount={unansweredInquiries.length}
              />
            </ul>
          </TabsContent>
        )}
      </Tabs>

      <AddTodoDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={user.id}
        userName={user.name}
        isStaff={isStaff}
        myActivityTodos={myActivityTodos}
      />
    </div>
  );
}
