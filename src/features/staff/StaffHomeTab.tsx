"use client";

/**
 * 운영진 홈(대시보드) 탭 (2026-07-27)
 * 진입 시 "지금 뭘 해야 하는지"를 한눈에: 내 할당 업무·팀 스냅샷·고정 공지.
 * DB/rules 무변경 — 기존 store 집계만 조합.
 */

import { useMemo } from "react";
import {
  ListTodo,
  FolderKanban,
  Pin,
  AlertTriangle,
  CircleCheck,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import Link from "next/link";
import {
  useStaffProjects,
  useAllStaffTasks,
  useStaffNotices,
  getDueDateStatus,
  TASK_STATUS_LABELS,
  TASK_STATUS_CHIP,
  type StaffTask,
} from "./staff-store";
import { useStaffReviewQueue } from "./useStaffReviewQueue";

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
  const { data: projects = [] } = useStaffProjects();
  const { data: allTasks = [] } = useAllStaffTasks();
  const { data: notices = [] } = useStaffNotices();
  const reviewItems = useStaffReviewQueue(!!user);
  const reviewPending = reviewItems.filter((r) => r.count > 0);

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

      {/* 전체 완료율 바 */}
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

      {/* ── 처리 대기 (콘솔 검수 큐 실데이터) ── */}
      {reviewPending.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <AlertTriangle size={15} className="text-warning" /> 처리 대기
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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

      {/* ── 내 할당 업무 ── */}
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
                    onClick={() => onGoTab("projects")}
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

      {/* ── 고정 공지 ── */}
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
