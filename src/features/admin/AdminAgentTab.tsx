"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Bot, Workflow, LayoutGrid, Sparkles, ChevronRight, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import ServerConnectionCard from "@/features/agent/ServerConnectionCard";
import AgentCard from "@/features/agent/AgentCard";
import AgentEditDialog from "@/features/agent/AgentEditDialog";
import TaskAssignForm from "@/features/agent/TaskAssignForm";
import TaskListItem from "@/features/agent/TaskListItem";
import TaskResultDialog from "@/features/agent/TaskResultDialog";
import { useAgents, useTasks, useServerHealth, useCreateAgent } from "@/features/agent/useAgentServer";
import { toast } from "sonner";
import type { Agent, AgentTask } from "@/features/agent/agent-types";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { YONSEI_AGENTS } from "@/features/yonsei-agents/agents-config";
import { AGENT_WORKFLOWS } from "@/features/yonsei-agents/workflows-config";

export default function AdminAgentTab() {
  const { data: health } = useServerHealth();
  const { data: agents = [] } = useAgents();
  const { data: tasks = [] } = useTasks();
  const { mutate: createAgent } = useCreateAgent();
  const connected = !!health?.status;

  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [assignAgentId, setAssignAgentId] = useState<string | undefined>();
  const [viewTask, setViewTask] = useState<AgentTask | null>(null);

  function handleAddAgent() {
    createAgent(
      { name: "새 에이전트", role: "역할을 입력하세요", avatar: "🤖", system_prompt: "당신은 연세교육공학회의 AI 에이전트입니다.", tools: [], model: "fast" },
      {
        onSuccess: (agent) => {
          toast.success("에이전트가 추가되었습니다.");
          setEditAgent(agent);
        },
      },
    );
  }

  function getTaskCount(agentId: string) {
    return tasks.filter((t) => t.agent_id === agentId && t.status === "completed").length;
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={Bot}
        title="AI 에이전트"
        description="학회 도메인 에이전트는 바로 사용할 수 있고, 외부 에이전트 서버는 별도 연결이 필요합니다."
      />

      {/* ── 학회 AI 에이전트 (서버 불필요 — 바로 사용) ── */}
      <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h3 className="text-sm font-bold">학회 AI 에이전트</h3>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
            서버 불필요 · 바로 사용
          </span>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          학회 운영에 특화된 {YONSEI_AGENTS.length}개 에이전트가 별도 설정 없이 즉시 동작합니다.
          여러 에이전트를 묶은 워크플로우와 실시간 작업 보드도 함께 제공됩니다.
        </p>
        {/* 학회 에이전트 목록 */}
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {YONSEI_AGENTS.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-xl border bg-card px-2.5 py-2"
            >
              <span className="text-base">{a.emoji}</span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold">{a.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {a.shortDescription}
                </p>
              </div>
            </div>
          ))}
        </div>
        {/* 진입 링크 */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/agents"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-card px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Bot size={13} /> 에이전트 실행
          </Link>
          <Link
            href="/console/agent-workflows"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-card px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Workflow size={13} /> 워크플로우 ({AGENT_WORKFLOWS.length})
          </Link>
          <Link
            href="/console/agent-board"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-card px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <LayoutGrid size={13} /> 작업 보드
          </Link>
        </div>
      </div>

      {/* ── 외부 에이전트 서버 (고급 — 로컬 서버 연결 필요) ── */}
      <div className="flex items-center gap-2 pt-2">
        <Server size={15} className="text-muted-foreground" />
        <h3 className="text-sm font-bold">외부 에이전트 서버</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          고급 · 로컬 서버 연결 필요
        </span>
      </div>
      <p className="-mt-3 text-xs leading-relaxed text-muted-foreground">
        커스텀 에이전트 서버를 운영하는 경우에만 사용합니다. 아래 가이드대로 로컬 서버를 실행하고 토큰을 입력하세요.
      </p>
      <ServerConnectionCard />

      {!connected ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
          <Bot size={40} className="mx-auto text-muted-foreground/40" />
          <p className="mt-3 font-medium text-muted-foreground">에이전트 서버에 연결하면 AI 에이전트를 관리할 수 있습니다</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            위 가이드를 따라 로컬 서버를 실행하고 토큰을 입력해주세요
          </p>
        </div>
      ) : (
        <>
          {/* 에이전트 카드 */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">에이전트</h3>
              <Button size="sm" variant="outline" onClick={handleAddAgent}>
                <Plus size={14} className="mr-1" /> 추가
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  taskCount={getTaskCount(agent.id)}
                  onEdit={() => setEditAgent(agent)}
                  onAssign={() => setAssignAgentId(agent.id)}
                />
              ))}
            </div>
          </div>

          {/* 작업 할당 */}
          <TaskAssignForm
            preselectedAgentId={assignAgentId}
            onSubmitted={() => setAssignAgentId(undefined)}
          />

          {/* 최근 작업 */}
          <div>
            <h3 className="mb-3 font-semibold">최근 작업</h3>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">아직 작업이 없습니다. 에이전트에 작업을 할당해보세요.</p>
            ) : (
              <div className="rounded-2xl border bg-card divide-y">
                {tasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    agents={agents}
                    onClick={() => setViewTask(task)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <AgentEditDialog agent={editAgent} open={!!editAgent} onClose={() => setEditAgent(null)} />
      <TaskResultDialog task={viewTask} agents={agents} open={!!viewTask} onClose={() => setViewTask(null)} />
    </div>
  );
}
