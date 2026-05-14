"use client";

import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { auth as firebaseAuth } from "@/lib/firebase";
import { runYonseiAgent } from "./useAgentJobs";
import type { YonseiAgentDefinition } from "./types";

export default function AgentRunDialog({
  agent,
  open,
  onClose,
}: {
  agent: YonseiAgentDefinition | null;
  open: boolean;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  function handleClose() {
    if (isRunning) return; // 실행 중에는 닫기 차단
    setPrompt("");
    setOutput("");
    setError("");
    onClose();
  }

  async function handleRun() {
    if (!prompt.trim() || !agent) return;
    setIsRunning(true);
    setOutput("");
    setError("");

    try {
      const fbUser = firebaseAuth.currentUser;
      if (!fbUser) {
        const msg = "로그인이 필요합니다.";
        setError(msg);
        toast.error(msg);
        setIsRunning(false);
        return;
      }
      const idToken = await fbUser.getIdToken();

      const result = await runYonseiAgent({
        agentId: agent.id,
        prompt: prompt.trim(),
        idToken,
      });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOutput(result.output ?? "");
        toast.success("작업 완료");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "실행 실패";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  }

  if (!agent) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <span className="text-2xl">{agent.emoji}</span>
            {agent.name}
          </DialogTitle>
          <DialogDescription className="text-left">
            {agent.description}
          </DialogDescription>
        </DialogHeader>

        {/* 예시 프롬프트 */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            예시 질문
          </p>
          <div className="flex flex-wrap gap-1.5">
            {agent.examplePrompts.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                disabled={isRunning}
                className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* 입력창 */}
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="자연어로 질문하세요. 예: 다음 주 세미나 알려줘"
          disabled={isRunning}
          rows={3}
          className="resize-none"
        />

        {/* 실행 버튼 */}
        <Button
          onClick={handleRun}
          disabled={!prompt.trim() || isRunning}
          className="w-full"
        >
          {isRunning ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <Send size={16} className="mr-2" />
          )}
          {isRunning ? "에이전트 실행 중…" : "실행"}
        </Button>

        {/* 결과 영역 */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {output && (
          <div className="rounded-2xl border bg-muted/30 p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles size={12} className="text-primary" />
              결과
            </div>
            <div className="mt-2 max-h-[40vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
              {output}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
