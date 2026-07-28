"use client";

/**
 * 운영진 홈(대시보드) 탭 (2026-07-27)
 * 진입 시 "지금 뭘 해야 하는지"를 한눈에: 내 할당 업무·팀 스냅샷·고정 공지.
 * DB/rules 무변경 — 기존 store 집계만 조합.
 */

import { useMemo, useState } from "react";
import {
  ListTodo,
  FolderKanban,
  Pin,
  AlertTriangle,
  CircleCheck,
  ArrowRight,
  TrendingUp,
  Heart,
  Rocket,
  Users,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import Link from "next/link";
import { currentSemesterKey, semesterLabelFromKey } from "@/lib/semester";
import { useOrgChart, type OrgRole } from "@/features/admin/settings/useOrgChart";
import { useEffectiveSemesterKey } from "@/features/site-settings/useCurrentSemester";
import { useAllMembers } from "@/features/member/useMembers";
import { isAdminOrSysadmin } from "@/lib/permissions";
import { ROLE_LABELS, type UserRole } from "@/types";
import {
  useStaffProjects,
  useAllStaffTasks,
  useStaffNotices,
  useStaffUiStore,
  matchesSemester,
  getDueDateStatus,
  TASK_STATUS_LABELS,
  TASK_STATUS_CHIP,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_CHIP,
  type StaffTask,
} from "./staff-store";
import { useStaffReviewQueue } from "./useStaffReviewQueue";
import { useOpeningDemands, type OpeningDemandStage } from "./useOpeningDemands";
import WidgetBoundary from "@/components/ui/widget-boundary";

/** 개설 대기 단계 라벨 — demand/page.tsx 에서 로컬 복사 */
const OPENING_STAGE_LABELS: Record<OpeningDemandStage, string> = {
  reviewing: "검토중",
  leader: "모임장",
  designing: "설계중",
};

/** 개설 대기 단계 뱃지 — 브랜드 시맨틱 토큰만 사용 */
const OPENING_STAGE_BADGE: Record<OpeningDemandStage, string> = {
  reviewing: "bg-primary/10 text-primary",
  leader: "bg-primary/10 text-primary",
  designing: "bg-primary/10 text-primary",
};

/** 조직도 role 표시 순서 (학회장 우선). 미지정 role 은 뒤로. */
const ORG_ROLE_ORDER: Record<OrgRole, number> = {
  president: 0,
  vice_president: 1,
  direct_aide: 2,
  team_member: 3,
  advisor: 4,
  professor: 5,
};

/** 조직도 role 짧은 라벨 — 배지용 */
const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  president: "학회장",
  vice_president: "부학회장",
  direct_aide: "직속",
  team_member: "팀원",
  advisor: "자문",
  professor: "교수",
};

/** 콘솔 접근 권한자 role 배지 — 시맨틱 토큰만 */
const ACCESS_ROLE_BADGE: Partial<Record<UserRole, string>> = {
  sysadmin: "bg-destructive/10 text-destructive",
  admin: "bg-warning/10 text-warning",
  president: "bg-primary/10 text-primary",
  staff: "bg-muted text-muted-foreground",
};

interface Props {
  onGoTab: (tab: string) => void;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getMonth() + 1}. ${d.getDate()}.`;
}

export default function StaffHomeTab({ onGoTab }: Props) {
  const { user } = useAuthStore();
  const { setFocusProjectId, selectedSemester } = useStaffUiStore();
  const { data: rawProjects = [] } = useStaffProjects();
  const { data: rawTasks = [] } = useAllStaffTasks();
  const { data: notices = [] } = useStaffNotices();
  const reviewItems = useStaffReviewQueue(!!user);
  const reviewPending = reviewItems.filter((r) => r.count > 0);
  const openingDemands = useOpeningDemands(!!user);

  // 조직도 운영진 — 학기 셀렉터 연동: "전체"(빈 문자열)면 현재(effective) 학기, 아니면 선택 학기.
  const effectiveKey = useEffectiveSemesterKey();
  const orgSemesterKey = selectedSemester || effectiveKey;
  const { positions: orgPositions } = useOrgChart(orgSemesterKey);

  // 접근 권한자 (admin 전용)
  const isAdmin = isAdminOrSysadmin(user);
  const { members: allMembers } = useAllMembers();
  const [accessOpen, setAccessOpen] = useState(false);

  const currentKey = useMemo(() => currentSemesterKey(), []);

  // 배정된 운영진만(userName 또는 userId 존재) role 순 정렬
  const roster = useMemo(() => {
    const assigned = (orgPositions ?? []).filter(
      (p) => (p.userName && p.userName.trim()) || p.userId,
    );
    return [...assigned].sort((a, b) => {
      const ra = a.role ? ORG_ROLE_ORDER[a.role] : 99;
      const rb = b.role ? ORG_ROLE_ORDER[b.role] : 99;
      if (ra !== rb) return ra - rb;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [orgPositions]);

  // role in [staff, president, admin, sysadmin], 이름 오름차순
  const accessMembers = useMemo(() => {
    if (!isAdmin) return [];
    const roles = new Set<UserRole>(["staff", "president", "admin", "sysadmin"]);
    return (allMembers ?? [])
      .filter((m) => roles.has(m.role))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [allMembers, isAdmin]);

  // 학기 필터(폴백 A) — 프로젝트를 먼저 필터하고, 태스크는 필터된 프로젝트에 속한 것만.
  const projects = useMemo(
    () => (rawProjects ?? []).filter((p) => matchesSemester(p.semester, selectedSemester, currentKey)),
    [rawProjects, selectedSemester, currentKey],
  );
  const allTasks = useMemo(() => {
    const ids = new Set(projects.map((p) => p.id));
    return (rawTasks ?? []).filter((t) => ids.has(t.projectId));
  }, [rawTasks, projects]);

  const projectName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of projects) m[p.id] = p.name;
    return m;
  }, [projects]);

  // 내 할당 업무 (완료 제외, 마감 임박/지남 우선)
  const myTasks = useMemo(() => {
    if (!user) return [];
    const rank = (t: StaffTask) => {
      const s = getDueDateStatus(t.dueDate);
      return s === "overdue" ? 0 : s === "warn" ? 1 : 2;
    };
    return allTasks
      .filter((t) => t.assigneeId === user.id && t.status !== "done")
      .sort((a, b) => {
        const rd = rank(a) - rank(b);
        if (rd !== 0) return rd;
        return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      });
  }, [allTasks, user]);

  // 준비·진행 중인 프로젝트 (planning + active) — 운영진이 지금 준비·진행 중인 프로젝트를 한눈에.
  // 진행 중(active)을 먼저, 이후 기획 중(planning)을 표시. 각 프로젝트의 태스크 진척(있으면)을 함께 요약.
  const preparingProjects = useMemo(() => {
    const active = projects.filter((p) => p.status === "active");
    const planning = projects.filter((p) => p.status === "planning");
    return [...active, ...planning].map((p) => {
      const tasks = (allTasks ?? []).filter((t) => t.projectId === p.id);
      const done = tasks.filter((t) => t.status === "done").length;
      return { project: p, taskTotal: tasks.length, taskDone: done };
    });
  }, [projects, allTasks]);

  // 팀 스냅샷
  const snapshot = useMemo(() => {
    const active = projects.filter((p) => p.status === "active").length;
    const total = allTasks.length;
    const done = allTasks.filter((t) => t.status === "done").length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const dueSoon = allTasks.filter(
      (t) => t.status !== "done" && getDueDateStatus(t.dueDate) !== null,
    ).length;
    return { projectCount: projects.length, active, total, done, pct, dueSoon };
  }, [projects, allTasks]);

  const pinned = useMemo(() => notices.filter((n) => n.pinned).slice(0, 3), [notices]);

  const greeting = user?.name ? `${user.name}님` : "운영진";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">안녕하세요, {greeting} 👋</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          오늘의 운영 현황을 확인하세요.
        </p>
      </div>

      {/* ── 팀 스냅샷 ── */}
      <WidgetBoundary label="staff-snapshot">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "프로젝트", value: `${snapshot.projectCount}`, sub: `진행중 ${snapshot.active}`, cls: "text-foreground" },
          { label: "전체 완료율", value: `${snapshot.pct}%`, sub: `${snapshot.done}/${snapshot.total}`, cls: "text-primary" },
          { label: "내 할 일", value: `${myTasks.length}`, sub: "미완료", cls: "text-foreground" },
          { label: "마감 임박", value: `${snapshot.dueSoon}`, sub: "3일 이내·지남", cls: snapshot.dueSoon > 0 ? "text-warning" : "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card px-3 py-3">
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className={cn("mt-0.5 text-2xl font-bold tabular-nums", s.cls)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>
      </WidgetBoundary>

      {/* 전체 완료율 바 */}
      <WidgetBoundary label="staff-progress">
      {snapshot.total > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <CircleCheck size={13} className="text-success" /> 팀 전체 진척
            </span>
            <span className="tabular-nums text-muted-foreground">{snapshot.done}/{snapshot.total} · {snapshot.pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${snapshot.pct}%` }} />
          </div>
        </div>
      )}
      </WidgetBoundary>

      {/* ── 처리 대기 (콘솔 검수 큐 실데이터) ── */}
      <WidgetBoundary label="staff-review-queue">
      {reviewPending.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <AlertTriangle size={15} className="text-warning" /> 처리 대기
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {reviewPending.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="flex items-center justify-between rounded-xl border border-warning/25 bg-warning/5 px-3 py-3 transition-colors hover:bg-warning/10"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{r.label}</span>
                  <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                    처리하기 <ArrowRight size={11} />
                  </span>
                </span>
                <span className="ml-2 shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-sm font-bold tabular-nums text-warning">
                  {r.count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      </WidgetBoundary>

      {/* ── 개설 대기 수요 미니 리스트 ── */}
      <WidgetBoundary label="staff-opening-demands">
      {openingDemands.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <TrendingUp size={15} className="text-primary" /> 개설 대기 수요
            </h3>
            <Link
              href="/console/demand"
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              전체 보기 <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="space-y-1.5">
            {openingDemands.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link
                  href="/console/demand"
                  className="flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      OPENING_STAGE_BADGE[item.status],
                    )}
                  >
                    {OPENING_STAGE_LABELS[item.status]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {item.body}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-muted-foreground">
                    <Heart size={11} />
                    {item.likeCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      </WidgetBoundary>

      {/* ── 준비·진행 중인 프로젝트 (planning + active) ── */}
      <WidgetBoundary label="staff-preparing-projects">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Rocket size={15} className="text-primary" /> 준비·진행 중인 프로젝트
          </h3>
          <button
            type="button"
            onClick={() => onGoTab("projects")}
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
          >
            프로젝트 운영 <ArrowRight size={12} />
          </button>
        </div>
        {preparingProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            지금 준비·진행 중인 프로젝트가 없습니다.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {preparingProjects.map(({ project: p, taskTotal, taskDone }) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setFocusProjectId(p.id);
                    onGoTab("projects");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
                >
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      PROJECT_STATUS_CHIP[p.status],
                    )}
                  >
                    {PROJECT_STATUS_LABELS[p.status]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{p.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {p.ownerName || "담당 미정"}
                      {taskTotal > 0 && ` · 준비 업무 ${taskDone}/${taskTotal}`}
                    </span>
                  </span>
                  {p.dueDate && (
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-0.5 text-[11px] tabular-nums",
                        getDueDateStatus(p.dueDate) === "overdue"
                          ? "text-destructive"
                          : getDueDateStatus(p.dueDate) === "warn"
                            ? "text-warning"
                            : "text-muted-foreground",
                      )}
                    >
                      {getDueDateStatus(p.dueDate) && <AlertTriangle size={11} />}
                      {formatDate(p.dueDate)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      </WidgetBoundary>

      {/* ── 이번 학기 운영진 (조직도 연동) ── */}
      <WidgetBoundary label="staff-roster">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Users size={15} className="text-primary" /> 이번 학기 운영진
          </h3>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {semesterLabelFromKey(orgSemesterKey)}
          </span>
        </div>
        {roster.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            이번 학기 조직도가 아직 설정되지 않았습니다.
            <Link
              href="/console/settings/org-chart"
              className="mt-1 flex items-center justify-center gap-0.5 text-primary hover:underline"
            >
              조직도 설정하기 <ArrowRight size={12} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {roster.map((p) => {
              const photo = typeof p.userPhoto === "string" ? p.userPhoto : "";
              const inner = (
                <>
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {photo ? (
                      <Image src={photo} alt="" fill className="object-cover" />
                    ) : (
                      (p.userName ?? "?").charAt(0)
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {p.userName ?? "미배정"}
                      </span>
                      {p.role && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {ORG_ROLE_LABELS[p.role]}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {p.title}
                      {p.duty ? ` · ${p.duty}` : ""}
                    </span>
                  </span>
                </>
              );
              return p.userId ? (
                <Link
                  key={p.id}
                  href={`/profile/${p.userId}`}
                  className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:bg-muted/30"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        )}
      </section>
      </WidgetBoundary>

      {/* ── 내 할당 업무 ── */}
      <WidgetBoundary label="staff-my-tasks">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ListTodo size={15} className="text-primary" /> 내 할당 업무
          </h3>
          <button
            type="button"
            onClick={() => onGoTab("projects")}
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
          >
            프로젝트 <ArrowRight size={12} />
          </button>
        </div>
        {myTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            {user ? "나에게 배정된 미완료 업무가 없습니다." : "로그인이 필요합니다."}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {myTasks.slice(0, 6).map((t) => {
              const due = getDueDateStatus(t.dueDate);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setFocusProjectId(t.projectId);
                      onGoTab("projects");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
                  >
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0", TASK_STATUS_CHIP[t.status])}>
                      {TASK_STATUS_LABELS[t.status]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{t.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {projectName[t.projectId] ?? "프로젝트"}
                      </span>
                    </span>
                    {t.dueDate && (
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-0.5 text-[11px] tabular-nums",
                          due === "overdue" ? "text-destructive" : due === "warn" ? "text-warning" : "text-muted-foreground",
                        )}
                      >
                        {due && <AlertTriangle size={11} />}
                        {formatDate(t.dueDate)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      </WidgetBoundary>

      {/* ── 고정 공지 ── */}
      <WidgetBoundary label="staff-notices">
      {pinned.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Pin size={14} className="text-primary" /> 고정 공지
            </h3>
            <button
              type="button"
              onClick={() => onGoTab("notices")}
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              전체 공지 <ArrowRight size={12} />
            </button>
          </div>
          <ul className="space-y-1.5">
            {pinned.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onGoTab("notices")}
                  className="w-full rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-left transition-colors hover:bg-primary/10"
                >
                  <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.body}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      </WidgetBoundary>

      {/* ── 콘솔 접근 권한자 (admin 전용, 기본 접힘) ── */}
      {isAdmin && (
        <WidgetBoundary label="staff-access-list">
        <section>
          <button
            type="button"
            onClick={() => setAccessOpen((v) => !v)}
            aria-expanded={accessOpen}
            className="flex w-full items-center justify-between rounded-xl border border-dashed bg-muted/40 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldCheck size={15} className="text-muted-foreground" /> 콘솔 접근 권한자 ({accessMembers.length}명)
            </span>
            <ChevronDown
              size={16}
              className={cn("shrink-0 text-muted-foreground transition-transform", accessOpen && "rotate-180")}
            />
          </button>
          {accessOpen && (
            <div className="mt-2 rounded-xl border bg-card p-2">
              {accessMembers.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  콘솔 접근 권한자가 없습니다.
                </p>
              ) : (
                <ul className="divide-y">
                  {accessMembers.map((m) => (
                    <li key={m.id} className="flex items-center justify-between px-2 py-2">
                      <span className="truncate text-sm text-foreground">{m.name}</span>
                      <span
                        className={cn(
                          "ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          ACCESS_ROLE_BADGE[m.role] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {ROLE_LABELS[m.role]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/console/members"
                className="mt-1 flex items-center justify-end gap-0.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                회원 관리 <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </section>
        </WidgetBoundary>
      )}

      {/* ── 빠른 이동 ── */}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <FolderKanban size={15} className="text-primary" /> 빠른 이동
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "프로젝트 운영", tab: "projects" },
            { label: "운영진 공지", tab: "notices" },
            { label: "콘솔 바로가기", tab: "console" },
          ].map((q) => (
            <button
              key={q.tab}
              type="button"
              onClick={() => onGoTab(q.tab)}
              className="rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {q.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
