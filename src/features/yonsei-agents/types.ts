import type { UserRole } from "@/types";

/** 학회 도메인 에이전트 정의 (정적) */
export interface YonseiAgentDefinition {
  id: string;
  name: string;
  emoji: string;
  category: "discovery" | "research" | "operations";
  description: string;
  /** 사용자에게 보여줄 짧은 설명 */
  shortDescription: string;
  /** AI에 전달할 system prompt */
  systemPrompt: string;
  /** ai-tools.ts에서 사용할 도구 이름 */
  toolNames: string[];
  /** 모델 선택 — fast(Gemini Flash) 또는 quality(GPT-4o-mini) */
  model: "fast" | "quality";
  /** 최소 권한 */
  minRole: UserRole;
  /** 사용자 입력 예시 */
  examplePrompts: string[];
}

/** Firestore agent_jobs 도큐먼트 */
export interface AgentJob {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  userId: string;
  userName?: string;
  /** 사용자 입력 첫 줄 (목록 표시용) */
  title: string;
  /** 사용자 자연어 입력 */
  prompt: string;
  status: "pending" | "running" | "completed" | "failed";
  /** 실행 단계 로그 (도구 호출 등) */
  steps?: string[];
  /** 최종 결과 (markdown) */
  output?: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

export type AgentJobStatus = AgentJob["status"];
