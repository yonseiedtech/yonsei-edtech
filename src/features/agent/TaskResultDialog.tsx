"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAgentStream } from "./useAgentStream";
import type { AgentTask, Agent } from "./agent-types";

export default function TaskResultDialog({
  task,
  agents,
  open,
  onClose,
}: {
  task: AgentTask | null;
  agents: Agent[];
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isRunning = task?.status === "running" || task?.status === "pending";
  const { statusMessage, currentTool, outputChunks, isStreaming } = useAgentStream(
    isRunning ? task?.id ?? null : null,
  );

  if (!task) return null;

  const agent = agents.find((a) => a.id === task.agent_id);
  const displayOutput = isStreaming ? outputChunks : task.output;

  function handleCopy() {
    if (displayOutput) {
      navigator.clipboard.writeText(displayOutput);
      setCopied(true);
      toast.success("복사되었습니다.");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {agent && <span>{agent.avatar}</span>}
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{task.description}</p>

        {/* 실행 중 상태 */}
        {(isStreaming || isRunning) && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <Loader2 size={14} className="animate-spin" />
            {currentTool ? `${currentTool} 실행 중...` : statusMessage || "처리 중..."}
          </div>
        )}

        {/* 에러 */}
        {task.status === "failed" && task.error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {task.error}
          </div>
        )}

        {/* 결과물 */}
        {displayOutput && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
              {displayOutput}
            </div>
          </div>
        )}

        {/* 액션 */}
        {displayOutput && !isStreaming && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
              {copied ? "복사됨" : "복사"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
