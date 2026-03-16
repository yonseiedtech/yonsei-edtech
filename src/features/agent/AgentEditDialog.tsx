"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateAgent, useDeleteAgent } from "./useAgentServer";
import { toast } from "sonner";
import type { Agent } from "./agent-types";

const ALL_TOOLS = ["firestore_read", "firestore_write", "generate_text"];

export default function AgentEditDialog({
  agent,
  open,
  onClose,
}: {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [avatar, setAvatar] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [model, setModel] = useState<"fast" | "quality">("fast");

  const { mutate: updateAgent } = useUpdateAgent();
  const { mutate: deleteAgent } = useDeleteAgent();

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setRole(agent.role);
      setAvatar(agent.avatar);
      setSystemPrompt(agent.system_prompt);
      setTools(agent.tools);
      setModel(agent.model);
    }
  }, [agent]);

  if (!agent) return null;

  function handleSave() {
    updateAgent(
      { id: agent!.id, name: agent!.is_preset ? undefined : name, role, avatar, system_prompt: systemPrompt, tools, model },
      { onSuccess: () => { toast.success("저장되었습니다."); onClose(); } },
    );
  }

  function handleDelete() {
    if (!confirm(`"${agent!.name}" 에이전트를 삭제하시겠습니까?`)) return;
    deleteAgent(agent!.id, {
      onSuccess: () => { toast.success("삭제되었습니다."); onClose(); },
      onError: (e) => toast.error(e.message),
    });
  }

  function toggleTool(tool: string) {
    setTools((prev) => prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{agent.avatar} {agent.name} 설정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!agent.is_preset && (
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">아바타</label>
                <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} className="w-16 text-center text-xl" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">이름</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">역할</label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">시스템 프롬프트</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">도구</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TOOLS.map((tool) => (
                <button
                  key={tool}
                  onClick={() => toggleTool(tool)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    tools.includes(tool)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {tool}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">모델</label>
            <div className="flex gap-2">
              {(["fast", "quality"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    model === m ? "border-primary bg-primary/10 text-primary" : "border-border"
                  }`}
                >
                  {m === "fast" ? "Fast (빠른 응답)" : "Quality (고품질)"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {!agent.is_preset && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>삭제</Button>
          )}
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
