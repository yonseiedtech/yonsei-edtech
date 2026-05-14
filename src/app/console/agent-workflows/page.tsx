"use client";

/**
 * 운영 콘솔 — 에이전트 워크플로우 (다단계 stage 파이프라인) — Sprint 70.
 *
 * 여러 yonsei-agent 를 stage 로 묶은 워크플로우를 실행. 앞 stage output 이
 * 다음 stage input 으로 연결됨. start → advance 연쇄로 전 stage 자동 진행.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Workflow, Play, Loader2, ChevronRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import { auth as firebaseAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ConsolePage from "@/components/admin/ConsolePage";
import EmptyState from "@/components/ui/empty-state";
import { AGENT_WORKFLOWS } from "@/features/yonsei-agents/workflows-config";
import { useWorkflowRuns } from "@/features/yonsei-agents/useWorkflowRuns";
import type { WorkflowRun, WorkflowStageStatus } from "@/features/yonsei-agents/workflow-types";

const STAGE_STATUS_META: Record<
  WorkflowStageStatus,
  { icon: React.ElementType; color: string; label: string }
> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "대기" },
  running: { icon: Loader2, color: "text-blue-600", label: "진행 중" },
  completed: { icon: CheckCircle2, color: "text-emerald-600", label: "완료" },
  failed: { icon: XCircle, color: "text-rose-600", label: "실패" },
  skipped: { icon: Clock, color: "text-muted-foreground", label: "건너뜀" },
};

export default function AgentWorkflowsConsolePage() {
  const { runs, isLoading } = useWorkflowRuns();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>(AGENT_WORKFLOWS[0]?.id ?? "");
  const [userInput, setUserInput] = useState("");
  const [running, setRunning] = useState(false);

  const selected = AGENT_WORKFLOWS.find((w) => w.id === selectedId);

  async function postWorkflow(payload: Record<string, unknown>) {
    const token = await firebaseAuth.currentUser?.getIdToken();
    const res = await fetch("/api/ai/agent-workflow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
    return data as { runId: string; ok: boolean; done?: boolean; error?: string };
  }

  async function handleRun() {
    if (!selected || !userInput.trim()) {
      toast.error("워크플로우와 입력 내용을 확인해주세요.");
      return;
    }
    setRunning(true);
    try {
      // start — 첫 stage 실행
      let data = await postWorkflow({
        action: "start",
        workflowId: selected.id,
        userInput: userInput.trim(),
      });
      const runId = data.runId;
      // 남은 stage 자동 advance 연쇄 (1 stage = 1 request, maxDuration 회피)
      let guard = 0;
      while (data.ok && !data.done && guard < 10) {
        guard += 1;
        data = await postWorkflow({ action: "advance", runId });
      }
      if (data.ok && data.done) {
        toast.success("워크플로우가 완료되었습니다.");
      } else if (!data.ok) {
        toast.error(`워크플로우 중단: ${data.error ?? "알 수 없는 오류"}`);
      }
      setUserInput("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "워크플로우 실행 실패");
    } finally {
      setRunning(false);
      queryClient.invalidateQueries({ queryKey: ["console", "workflow-runs"] });
    }
  }

  return (
    <ConsolePage
      icon={Workflow}
      title="에이전트 워크플로우"
      description="여러 AI 에이전트를 stage 로 묶어 순차 실행합니다. 앞 단계 결과가 다음 단계 입력으로 연결됩니다."
    >
      {/* 워크플로우 선택 + 실행 */}
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold">워크플로우 실행</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {AGENT_WORKFLOWS.map((w) => {
            const isSel = w.id === selectedId;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedId(w.id)}
                className={`rounded-2xl border-2 p-4 text-left transition-colors ${
                  isSel
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{w.emoji}</span>
                  <span className="text-sm font-bold">{w.name}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {w.shortDescription}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                  {w.stages.map((s, i) => (
                    <span key={s.index} className="inline-flex items-center gap-1">
                      {i > 0 && <ChevronRight size={9} />}
                      <span className="rounded bg-muted px-1.5 py-0.5">{s.label}</span>
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="mt-4 space-y-2">
            <label className="block text-xs font-medium">
              입력 내용
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                (예: {selected.examplePrompts[0]})
              </span>
            </label>
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={selected.examplePrompts.join(" / ")}
              rows={3}
              disabled={running}
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                총 {selected.stages.length} 단계 — 자동 순차 진행
              </p>
              <Button onClick={handleRun} disabled={running || !userInput.trim()} className="gap-1.5">
                {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {running ? "실행 중…" : "워크플로우 시작"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 실행 이력 */}
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold">실행 이력 ({runs.length})</h2>
        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">불러오는 중…</div>
        ) : runs.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title="실행한 워크플로우가 없습니다"
            description="위에서 워크플로우를 선택하고 실행하면 진행 상황이 여기 표시됩니다."
          />
        ) : (
          <ul className="space-y-3">
            {runs.map((run) => (
              <WorkflowRunCard key={run.id} run={run} />
            ))}
          </ul>
        )}
      </div>
    </ConsolePage>
  );
}

function WorkflowRunCard({ run }: { run: WorkflowRun }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor =
    run.status === "completed"
      ? "text-emerald-600"
      : run.status === "failed"
        ? "text-rose-600"
        : "text-blue-600";

  return (
    <li className="rounded-2xl border bg-background p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{run.workflowEmoji}</span>
          <div>
            <p className="text-sm font-semibold">{run.workflowName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{run.userInput}</p>
          </div>
        </div>
        <div className="shrink-0 text-right text-[11px]">
          <p className={`font-bold ${statusColor}`}>
            {run.status === "completed" ? "완료" : run.status === "failed" ? "실패" : "진행 중"}
          </p>
          <p className="text-muted-foreground tabular-nums">
            {run.currentStage} / {run.totalStages} 단계
          </p>
        </div>
      </button>

      {/* stage 진행 막대 */}
      <div className="mt-2 flex gap-1">
        {Array.from({ length: run.totalStages }).map((_, i) => {
          const result = run.stageResults[i];
          const st = result?.status ?? "pending";
          const bg =
            st === "completed"
              ? "bg-emerald-500"
              : st === "failed"
                ? "bg-rose-500"
                : st === "running"
                  ? "bg-blue-500"
                  : "bg-muted";
          return <div key={i} className={`h-1.5 flex-1 rounded-full ${bg}`} />;
        })}
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {run.stageResults.map((r) => {
            const meta = STAGE_STATUS_META[r.status];
            const Icon = meta.icon;
            return (
              <div key={r.index} className="rounded-xl bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <Icon
                    size={13}
                    className={`${meta.color} ${r.status === "running" ? "animate-spin" : ""}`}
                  />
                  <span className="text-xs font-semibold">
                    {r.agentEmoji} {r.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">· {r.agentName}</span>
                  {r.durationMs != null && (
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                      {(r.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                {r.output && (
                  <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">
                    {r.output}
                  </p>
                )}
                {r.error && (
                  <p className="mt-2 text-[11px] text-rose-600">오류: {r.error}</p>
                )}
                {r.steps && r.steps.length > 0 && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {r.steps.join(" · ")}
                  </p>
                )}
              </div>
            );
          })}
          {run.error && (
            <p className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
              {run.error}
            </p>
          )}
          {run.costUsd != null && run.costUsd > 0 && (
            <p className="text-right text-[10px] text-muted-foreground">
              비용 ≈ ${run.costUsd.toFixed(4)}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
