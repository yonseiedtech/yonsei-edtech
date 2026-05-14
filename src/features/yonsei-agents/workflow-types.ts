import type { UserRole } from "@/types";

/**
 * 에이전트 워크플로우 (다단계 stage 파이프라인) — Sprint 70.
 *
 * 단독 에이전트 실행(agent_jobs)과 달리, 여러 에이전트를 stage 로 묶어 순차 실행.
 * 앞 stage 의 output 이 다음 stage 의 prompt 입력으로 연결된다.
 *
 * 실행 단위: 1 tick = 1 stage (AI 포럼 processOneTick 패턴 — maxDuration 60초 timeout 회피).
 */

/** 워크플로우 정의 (정적 — workflows-config.ts) */
export interface AgentWorkflowDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** 사용자에게 보여줄 짧은 설명 */
  shortDescription: string;
  /** 최소 권한 */
  minRole: UserRole;
  /** 사용자 입력 예시 */
  examplePrompts: string[];
  /** 순차 실행될 stage 목록 (index 오름차순) */
  stages: WorkflowStageDefinition[];
}

/** 워크플로우의 한 stage 정의 */
export interface WorkflowStageDefinition {
  /** stage 순서 — 0부터 */
  index: number;
  /** 이 stage 를 실행할 에이전트 id (agents-config.ts) */
  agentId: string;
  /** stage 라벨 (UI 표시) */
  label: string;
  /**
   * 이 stage 의 prompt 템플릿. 다음 placeholder 가 실행 시 치환됨:
   * - `{{userInput}}` — 사용자 최초 입력
   * - `{{prevOutput}}` — 직전 stage 의 output
   * - `{{stage0}}`, `{{stage1}}` … — 특정 index stage 의 output
   */
  promptTemplate: string;
}

export type WorkflowRunStatus = "pending" | "running" | "completed" | "failed";

export type WorkflowStageStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

/** 워크플로우 실행 인스턴스 (Firestore `agent_workflow_runs`) */
export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowEmoji: string;
  userId: string;
  userName?: string;
  /** 사용자 최초 자연어 입력 */
  userInput: string;
  status: WorkflowRunStatus;
  /** 현재 진행 중(또는 다음 실행할) stage index. 완료 시 stages.length 와 같음 */
  currentStage: number;
  /** 전체 stage 수 (정의 snapshot — 정의 변경에도 run 안정성 유지) */
  totalStages: number;
  /** stage 별 실행 결과 */
  stageResults: WorkflowStageResult[];
  /** run 전체 비용 누적 (USD, 대략) */
  costUsd?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

/** 워크플로우 한 stage 의 실행 결과 */
export interface WorkflowStageResult {
  index: number;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  label: string;
  status: WorkflowStageStatus;
  /** 템플릿 치환 후 실제로 LLM 에 들어간 prompt */
  resolvedPrompt?: string;
  /** stage output (markdown) */
  output?: string;
  /** 도구 호출 로그 */
  steps?: string[];
  error?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

/**
 * stage promptTemplate 의 placeholder 를 실제 값으로 치환.
 * - {{userInput}} → 사용자 최초 입력
 * - {{prevOutput}} → 직전 stage output (index 0 이면 userInput 으로 fallback)
 * - {{stageN}} → index N stage output (없으면 빈 문자열)
 */
export function resolveStagePrompt(
  template: string,
  ctx: {
    userInput: string;
    stageOutputs: (string | undefined)[];
    currentIndex: number;
  },
): string {
  let out = template;
  out = out.replaceAll("{{userInput}}", ctx.userInput);
  const prev =
    ctx.currentIndex > 0
      ? ctx.stageOutputs[ctx.currentIndex - 1] ?? ""
      : ctx.userInput;
  out = out.replaceAll("{{prevOutput}}", prev);
  // {{stageN}} 치환 — 정의된 모든 index
  out = out.replace(/\{\{stage(\d+)\}\}/g, (_m, n: string) => {
    const idx = Number(n);
    return ctx.stageOutputs[idx] ?? "";
  });
  return out;
}
