"use client";

import { Check, Loader2, AlertCircle, Clock } from "lucide-react";
import type { AgentTask, Agent } from "./agent-types";
import { formatDistanceToNow } from "@/lib/utils";

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "대기" },
  running: { icon: Loader2, color: "text-blue-600", label: "실행 중", animate: true },
  completed: { icon: Check, color: "text-green-600", label: "완료" },
  failed: { icon: AlertCircle, color: "text-red-500", label: "실패" },
};

export default function TaskListItem({
  task,
  agents,
  onClick,
}: {
  task: AgentTask;
  agents: Agent[];
  onClick: () => void;
}) {
  const agent = agents.find((a) => a.id === task.agent_id);
  const config = STATUS_CONFIG[task.status];
  const Icon = config.icon;
  const timeAgo = task.completed_at || task.started_at || task.created_at;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-muted/50"
    >
      <Icon
        size={16}
        className={`shrink-0 ${config.color} ${"animate" in config ? "animate-spin" : ""}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {agent && <span className="text-sm">{agent.avatar}</span>}
          <span className="truncate text-sm font-medium">{task.title}</span>
        </div>
        {task.error && (
          <p className="mt-0.5 truncate text-xs text-red-500">{task.error}</p>
        )}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {timeAgo ? formatDistanceToNow(timeAgo) : config.label}
      </span>
    </button>
  );
}
