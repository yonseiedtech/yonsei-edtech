"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, BookOpen, Users as UsersIcon, X, BellOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  courseTodosApi,
  courseOfferingsApi,
  activitiesApi,
} from "@/lib/bkend";
import {
  COURSE_TODO_TYPE_LABELS,
  COURSE_TODO_TYPE_COLORS,
  type CourseTodo,
  type CourseOffering,
  type Activity,
  type ActivityType,
} from "@/types";
import { formatDday, todayYmdLocal } from "@/lib/dday";
import { parseSchedule, fmtMin } from "@/lib/courseSchedule";
import { cn } from "@/lib/utils";
import {
  canShowNotification,
  publishActiveModal,
  subscribeActiveModalChange,
} from "@/features/dashboard/notification-orchestrator";

const POPUP_PREF_KEY = "dashboard_today_popup_enabled";
const SESSION_GATE_PREFIX = "dashboard_today_popup_shown_";

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

function readPopupPref(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(POPUP_PREF_KEY) !== "false";
}

function writePopupPref(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(POPUP_PREF_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new Event("dashboard-popup-pref-changed"));
}

function shownThisSession(ymd: string): boolean {
  if (typeof window === "undefined") return true;
  return window.sessionStorage.getItem(SESSION_GATE_PREFIX + ymd) === "1";
}

function markShownThisSession(ymd: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_GATE_PREFIX + ymd, "1");
}

export default function TodayTodosPopup() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const userId = user?.id;
  const [open, setOpen] = useState(false);
  const [decided, setDecided] = useState(false);
  const [slotTick, setSlotTick] = useState(0);
  const today = todayYmdLocal();

  // Sprint 2: 다른 modal 이 닫히면 재평가 (NotificationOrchestrator)
  useEffect(() => {
    return subscribeActiveModalChange(() => setSlotTick((t) => t + 1));
  }, []);

  // 수업 할 일
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

  // 학술활동
  const { data: allActivities = [] } = useQuery({
    queryKey: ["my-activities-todos"],
    queryFn: async () => {
      const res = await activitiesApi.list();
      return res.data as ActivityFlat[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // 오늘이 마감인 수업 할 일 (미완료)
  const todayCourseTodos = useMemo(
    () =>
      courseTodos.filter(
        (t) => !t.completed && t.dueDate === today,
      ),
    [courseTodos, today],
  );

  // 오늘 시작/마감 학술활동
  const todayActivities = useMemo(() => {
    if (!user) return [] as ActivityFlat[];
    return allActivities.filter(
      (a) =>
        isUserInvolved(a, user.id) &&
        a.status !== "completed" &&
        (a.date === today || a.endDate === today),
    );
  }, [allActivities, user, today]);

  // 과목명 매핑
  const todoCourseIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of todayCourseTodos)
      if (t.courseOfferingId) set.add(t.courseOfferingId);
    return Array.from(set);
  }, [todayCourseTodos]);

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

  const totalCount = todayCourseTodos.length + todayActivities.length;

  // 오픈 결정 — 한 번만
  useEffect(() => {
    if (decided) return;
    if (!user) return;
    // 초기 fetch가 끝났을 때(전체 0이라도 결정)만 평가
    if (courseTodosRes === undefined) return;
    if (allActivities === undefined) return;

    const enabled = readPopupPref();
    if (!enabled) {
      setDecided(true);
      return;
    }
    if (shownThisSession(today)) {
      setDecided(true);
      return;
    }
    // Sprint 2: NotificationOrchestrator — 더 높은 우선순위 modal(undergrad-info, site-popup)이
    // 활성이면 보류. decided=false 유지 → 다른 modal 이 닫힌 뒤 slotTick 으로 재평가됨.
    if (!canShowNotification("today-todos")) {
      return;
    }
    if (totalCount === 0) {
      // 표시할 게 없으면 게이트만 체크해두고 닫음
      markShownThisSession(today);
      setDecided(true);
      return;
    }
    setOpen(true);
    markShownThisSession(today);
    setDecided(true);
  }, [user, courseTodosRes, allActivities, totalCount, today, decided, slotTick]);

  // Sprint 2: open 상태를 NotificationOrchestrator 에 발행 (다른 알림 자동 보류)
  useEffect(() => {
    publishActiveModal(open ? "today-todos" : null);
    return () => {
      publishActiveModal(null);
    };
  }, [open]);

  async function toggleCourseTodo(t: CourseTodo) {
    if (!userId) return;
    try {
      await courseTodosApi.update(t.id, {
        completed: !t.completed,
        completedAt: !t.completed ? new Date().toISOString() : undefined,
      });
      await qc.refetchQueries({ queryKey: ["my-course-todos", userId], type: "active" });
      toast.success(!t.completed ? "완료 처리했습니다." : "완료를 취소했습니다.");
    } catch (e) {
      toast.error(`변경 실패: ${(e as Error).message}`);
    }
  }

  function handleDisablePermanently() {
    writePopupPref(false);
    setOpen(false);
    toast.success("로그인 시 팝업을 더 이상 표시하지 않습니다 — 나의 할 일에서 다시 켤 수 있어요.");
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            오늘의 할 일 — {today}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-1 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {todayCourseTodos.length > 0 && (
            <section>
              <p className="mb-1.5 flex items-center gap-1 text-[12px] font-semibold text-muted-foreground">
                <BookOpen size={12} /> 수업 할 일 ({todayCourseTodos.length})
              </p>
              <ul className="space-y-1">
                {todayCourseTodos.map((t) => {
                  const info = courseInfoMap[t.courseOfferingId];
                  const courseName = info?.name ?? "(과목)";
                  const dueTime = info?.startMin != null ? fmtMin(info.startMin) : undefined;
                  const dd = formatDday(t.dueDate ?? today, dueTime);
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-2 text-[12px]"
                    >
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
                      <span
                        className={cn(
                          "flex-1 truncate",
                          t.completed && "text-muted-foreground line-through",
                        )}
                      >
                        {t.content}
                      </span>
                      {dd && (
                        <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          {dd.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {todayActivities.length > 0 && (
            <section>
              <p className="mb-1.5 flex items-center gap-1 text-[12px] font-semibold text-muted-foreground">
                <UsersIcon size={12} /> 학술활동 ({todayActivities.length})
              </p>
              <ul className="space-y-1">
                {todayActivities.map((a) => {
                  const dd = a.date ? formatDday(a.date) : null;
                  return (
                    <li key={a.id}>
                      <Link
                        href={`${TYPE_ROUTE[a.type]}/${a.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-2 text-[12px] transition-colors hover:bg-muted/40"
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
                          </p>
                        </div>
                        {dd && (
                          <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                            {dd.label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {totalCount === 0 && (
            <p className="rounded-md bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              오늘 마감인 할 일이 없습니다.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisablePermanently}
            className="text-[11px] text-muted-foreground"
          >
            <BellOff size={12} className="mr-1" /> 다시 보지 않기
          </Button>
          <Button onClick={() => setOpen(false)}>
            <X size={14} className="mr-1" /> 닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
