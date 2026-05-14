"use client";

/**
 * 운영 콘솔 — 에이전트 작업 보드 (실시간 칸반 + 워크플로우 시각화) — Sprint 70.
 *
 * agent_jobs (단일 에이전트 작업) + agent_workflow_runs (워크플로우 run) 을 통합해
 * status 별 칸반으로 표시. Firestore onSnapshot 실시간 반영.
 * 워크플로우 run 은 stage 진행 다이어그램(가로 노드)으로 시각화.
 */

import { useMemo, useState } from "react";
import { LayoutGrid, Workflow, Bot, ChevronRight, Loader2 } from "lucide-react";
import ConsolePage from "@/components/admin/ConsolePage";
import EmptyState from "@/components/ui/empty-state";
import { useAgentJobs } from "@/features/yonsei-agents/useAgentJobs";
import { useWorkflowRuns } from "@/features/yonsei-agents/useWorkflowRuns";
import type { AgentJob } from "@/features/yonsei-agents/types";
import type { WorkflowRun, WorkflowStageStatus } from "@/features/yonsei-agents/workflow-types";

type BoardStatus = "pending" | "running" | "completed" | "failed";

interface BoardCard {
  id: string;
  kind: "job" | "workflow";
  emoji: string;
  title: string;
  subtitle: string;
  status: BoardStatus;
  createdAt: string;
  /** workflow 전용 */
  currentStage?: number;
  totalStages?: number;
}

const COLUMNS: { status: BoardStatus; label: string; color: string }[] = [
  { status: "pending", label: "대기", color: "border-t-slate-400" },
  { status: "running", label: "진행 중", color: "border-t-blue-500" },
  { status: "completed", label: "완료", color: "border-t-emerald-500" },
  { status: "failed", label: "실패", color: "border-t-rose-500" },
];

const STAGE_COLOR: Record<WorkflowStageStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200",
  skipped: "bg-muted text-muted-foreground",
};

export default function AgentBoardConsolePage() {
  const { jobs, isLoading: jobsLoading } = useAgentJobs();
  const { runs, isLoading: runsLoading } = useWorkflowRuns();
  const [view, setView] = useState<"kanban" | "workflow">("kanban");

  const cards = useMemo<BoardCard[]>(() => {
    const jobCards: BoardCard[] = jobs.map((j: AgentJob) => ({
      id: `job-${j.id}`,
      kind: "job",
      emoji: j.agentEmoji,
      title: j.title,
      subtitle: j.agentName,
      status: j.status,
      createdAt: j.createdAt,
    }));
    const runCards: BoardCard[] = runs.map((r: WorkflowRun) => ({
      id: `wf-${r.id}`,
      kind: "workflow",
      emoji: r.workflowEmoji,
      title: r.userInput,
      subtitle: r.workflowName,
      status: r.status,
      createdAt: r.createdAt,
      currentStage: r.currentStage,
      totalStages: r.totalStages,
    }));
    return [...jobCards, ...runCards].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
  }, [jobs, runs]);

  const byStatus = useMemo(() => {
    const map: Record<BoardStatus, BoardCard[]> = {
      pending: [],
      running: [],
      completed: [],
      failed: [],
    };
    for (const c of cards) map[c.status].push(c);
    return map;
  }, [cards]);

  const loading = jobsLoading || runsLoading;
  const activeRuns = runs.filter((r) => r.status === "running" || r.status === "pending");

  return (
    <ConsolePage
      icon={LayoutGrid}
      title="에이전트 작업 보드"
      description="단일 에이전트 작업과 워크플로우 run 을 실시간 칸반·진행 다이어그램으로 모니터링합니다."
    >
      {/* 뷰 전환 */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
        <button
          type="button"
          onClick={() => setView("kanban")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            view === "kanban" ? "bg-card shadow-sm" : "text-muted-foreground"
          }`}
        >
          <LayoutGrid size={13} /> 칸반 보드
        </button>
        <button
          type="button"
          onClick={() => setView("workflow")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            view === "workflow" ? "bg-card shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Workflow size={13} /> 워크플로우 진행
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-xs text-muted-foreground">
          실시간 작업 불러오는 중…
        </div>
      ) : view === "kanban" ? (
        /* ── 칸반 보드 ── */
        cards.length === 0 ? (
          <div className="rounded-2xl border bg-card p-5">
            <EmptyState
              icon={LayoutGrid}
              title="진행 중인 에이전트 작업이 없습니다"
              description="에이전트 또는 워크플로우를 실행하면 본 보드에 실시간 표시됩니다."
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {COLUMNS.map((col) => (
              <div
                key={col.status}
                className={`rounded-2xl border border-t-4 bg-card p-3 ${col.color}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold">{col.label}</h3>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                    {byStatus[col.status].length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {byStatus[col.status].map((c) => (
                    <li
                      key={c.id}
                      className={`rounded-xl border bg-background p-2.5 ${
                        c.status === "running" ? "animate-pulse" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{c.emoji}</span>
                        <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-semibold text-muted-foreground">
                          {c.kind === "workflow" ? "워크플로우" : "에이전트"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] font-medium">{c.title}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{c.subtitle}</p>
                      {c.kind === "workflow" && c.totalStages != null && (
                        <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                          {c.currentStage} / {c.totalStages} 단계
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── 워크플로우 진행 다이어그램 ── */
        runs.length === 0 ? (
          <div className="rounded-2xl border bg-card p-5">
            <EmptyState
              icon={Workflow}
              title="실행한 워크플로우가 없습니다"
              description="워크플로우를 실행하면 stage 진행 다이어그램이 여기 표시됩니다."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {activeRuns.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                <Loader2 size={11} className="mr-1 inline animate-spin" />
                진행 중 {activeRuns.length}건 — 실시간 갱신
              </p>
            )}
            {runs.map((run) => (
              <WorkflowDiagram key={run.id} run={run} />
            ))}
          </div>
        )
      )}
    </ConsolePage>
  );
}

/** 워크플로우 stage 진행 가로 다이어그램 (순수 CSS 노드+화살표) */
function WorkflowDiagram({ run }: { run: WorkflowRun }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base">{run.workflowEmoji}</span>
        <span className="text-sm font-bold">{run.workflowName}</span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            run.status === "completed"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
              : run.status === "failed"
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
                : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200"
          }`}
        >
          {run.status === "completed" ? "완료" : run.status === "failed" ? "실패" : "진행 중"}
        </span>
      </div>
      <p className="mb-3 truncate text-[11px] text-muted-foreground">{run.userInput}</p>

      {/* stage 노드 + 화살표 */}
      <div className="flex flex-wrap items-stretch gap-1">
        {Array.from({ length: run.totalStages }).map((_, i) => {
          const result = run.stageResults[i];
          const st: WorkflowStageStatus = result?.status ?? "pending";
          const isRunning = st === "running" || (run.status === "running" && i === run.currentStage);
          return (
            <div key={i} className="flex items-stretch">
              {i > 0 && (
                <ChevronRight size={14} className="self-center text-muted-foreground/40" />
              )}
              <div
                className={`min-w-[110px] rounded-xl px-2.5 py-2 ${STAGE_COLOR[isRunning ? "running" : st]} ${
                  isRunning ? "animate-pulse" : ""
                }`}
              >
                <p className="text-[10px] font-bold">
                  {result?.agentEmoji ?? "◯"} Stage {i + 1}
                </p>
                <p className="truncate text-[10px]">
                  {result?.label ?? "대기 중"}
                </p>
                {result?.durationMs != null && (
                  <p className="text-[9px] tabular-nums opacity-70">
                    {(result.durationMs / 1000).toFixed(1)}s
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {run.error && (
        <p className="mt-2 rounded-lg bg-rose-50 p-2 text-[10px] text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
          {run.error}
        </p>
      )}
    </div>
  );
}
