"use client";

import { useState } from "react";
import { Plus, Bot } from "lucide-react";
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
      <ServerConnectionCard />

      {!connected ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
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
              <div className="rounded-xl border bg-white divide-y">
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
