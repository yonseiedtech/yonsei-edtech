"use client";

import type { Agent } from "./agent-types";

const STATUS_STYLES = {
  idle: "bg-green-100 text-green-700",
  running: "bg-blue-100 text-blue-700 animate-pulse",
  error: "bg-red-100 text-red-700",
};

const STATUS_LABELS = { idle: "대기 중", running: "실행 중", error: "에러" };

export default function AgentCard({
  agent,
  taskCount,
  onEdit,
  onAssign,
}: {
  agent: Agent;
  taskCount: number;
  onEdit: () => void;
  onAssign: () => void;
}) {
  return (
    <div
      className="cursor-pointer rounded-2xl border bg-card p-4 transition hover:shadow-md"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl">{agent.avatar}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[agent.status]}`}>
          {STATUS_LABELS[agent.status]}
        </span>
      </div>
      <h3 className="mt-2 font-semibold">{agent.name}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{agent.role}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">완료 {taskCount}건</span>
        <button
          onClick={(e) => { e.stopPropagation(); onAssign(); }}
          className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
        >
          작업 할당
        </button>
      </div>
    </div>
  );
}
