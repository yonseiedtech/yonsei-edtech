"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateTask, useAgents } from "./useAgentServer";
import { toast } from "sonner";
import type { Agent } from "./agent-types";

const TASK_TYPES = [
  { value: "content", label: "콘텐츠" },
  { value: "analysis", label: "분석" },
  { value: "automation", label: "자동화" },
  { value: "document", label: "문서" },
];

export default function TaskAssignForm({
  preselectedAgentId,
  onSubmitted,
}: {
  preselectedAgentId?: string;
  onSubmitted?: (taskId: string) => void;
}) {
  const { data: agents } = useAgents();
  const { mutate: createTask, isPending } = useCreateTask();
  const [agentId, setAgentId] = useState(preselectedAgentId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("content");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agentId || !title.trim() || !description.trim()) return;

    createTask(
      { agent_id: agentId, title: title.trim(), description: description.trim(), type },
      {
        onSuccess: (task) => {
          toast.success(`"${title}" 작업이 할당되었습니다.`);
          setTitle("");
          setDescription("");
          onSubmitted?.(task.id);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold">새 작업 할당</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">에이전트</label>
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
          >
            <option value="">선택...</option>
            {agents?.map((a) => (
              <option key={a.id} value={a.id} disabled={a.status === "running"}>
                {a.avatar} {a.name} {a.status === "running" ? "(실행 중)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">유형</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
          >
            {TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs text-muted-foreground">제목</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 3월 세미나 보도자료" />
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs text-muted-foreground">설명 (지시사항)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="에이전트에게 전달할 상세 지시사항..."
          className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm"
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="submit" disabled={isPending || !agentId || !title.trim()}>
          <Send size={14} className="mr-1.5" />
          작업 할당
        </Button>
      </div>
    </form>
  );
}
