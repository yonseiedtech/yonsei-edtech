/**
 * 에이전트 워크플로우 실행 엔진 (Sprint 70).
 *
 * 1 호출 = 1 stage 실행 (AI 포럼 processOneTick 패턴 — maxDuration 60초 timeout 회피).
 * Vercel cron 또는 운영진 수동 advance 양쪽에서 호출.
 *
 * 동작:
 * - run 의 currentStage 에 해당하는 stage 1개 실행
 * - 해당 stage 의 agent 정의 + tools + generateText 로 AI 실행
 * - promptTemplate 치환: 직전 stage output / 특정 stage output / userInput
 * - stageResults append + currentStage++
 * - 마지막 stage 완료 시 run status=completed
 * - stage 실패 시 run status=failed (이후 stage 미실행)
 */

import { generateText, stepCountIs, type ToolSet } from "ai";
import type { Firestore } from "firebase-admin/firestore";
import { models } from "@/lib/ai";
import { publicTools, staffTools } from "@/lib/ai-tools";
import { getAgentById } from "@/features/yonsei-agents/agents-config";
import { getWorkflowById } from "@/features/yonsei-agents/workflows-config";
import {
  resolveStagePrompt,
  type WorkflowRun,
  type WorkflowStageResult,
} from "@/features/yonsei-agents/workflow-types";

// Gemini 2.5 Flash 대략 비용 — 입력 $0.075/1M, 출력 $0.30/1M
const COST_PER_TOKEN_IN = 0.000000075;
const COST_PER_TOKEN_OUT = 0.0000003;

export interface StageTickResult {
  ok: boolean;
  runId?: string;
  /** 이번 tick 에 실행한 stage index */
  stageIndex?: number;
  /** 워크플로우 전체 완료 여부 */
  done?: boolean;
  message?: string;
  error?: string;
  status?: number;
}

/**
 * 워크플로우 run 을 1 stage 만큼 진행.
 * 진행 중인 stage 가 없으면 (모두 완료) done=true 반환.
 */
export async function processWorkflowStage(
  db: Firestore,
  runId: string,
): Promise<StageTickResult> {
  // 1. run 조회
  const runRef = db.collection("agent_workflow_runs").doc(runId);
  const runSnap = await runRef.get();
  if (!runSnap.exists) {
    return { ok: false, error: "워크플로우 run 을 찾을 수 없음", status: 404 };
  }
  const run = { id: runSnap.id, ...runSnap.data() } as WorkflowRun;

  // 2. 이미 종료된 run
  if (run.status === "completed" || run.status === "failed") {
    return { ok: true, runId, done: true, message: "이미 종료된 워크플로우" };
  }

  // 3. 워크플로우 정의
  const workflow = getWorkflowById(run.workflowId);
  if (!workflow) {
    await runRef.update({
      status: "failed",
      error: "워크플로우 정의를 찾을 수 없음",
      completedAt: new Date().toISOString(),
    });
    return { ok: false, error: "워크플로우 정의 없음", status: 404 };
  }

  // 4. 현재 stage 결정
  const idx = run.currentStage;
  if (idx >= workflow.stages.length) {
    await runRef.update({
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    return { ok: true, runId, done: true, message: "모든 stage 완료" };
  }
  const stageDef = workflow.stages[idx];

  // 5. agent 정의 조회
  const agent = getAgentById(stageDef.agentId);
  if (!agent) {
    const failResult: WorkflowStageResult = {
      index: idx,
      agentId: stageDef.agentId,
      agentName: "(미상)",
      agentEmoji: "⚠️",
      label: stageDef.label,
      status: "failed",
      error: `에이전트 정의 없음: ${stageDef.agentId}`,
      completedAt: new Date().toISOString(),
    };
    await runRef.update({
      stageResults: [...run.stageResults, failResult],
      status: "failed",
      error: `stage ${idx} 에이전트 정의 없음`,
      completedAt: new Date().toISOString(),
    });
    return { ok: false, runId, error: "에이전트 정의 없음", status: 404 };
  }

  // 6. prompt 템플릿 치환
  const stageOutputs = run.stageResults.map((r) => r.output);
  const resolvedPrompt = resolveStagePrompt(stageDef.promptTemplate, {
    userInput: run.userInput,
    stageOutputs,
    currentIndex: idx,
  });

  // 7. 도구 선택 (워크플로우는 staff 전용 — staffTools 포함)
  const allTools: Record<string, unknown> = { ...publicTools, ...staffTools };
  const selectedTools: ToolSet = {};
  for (const name of agent.toolNames) {
    if (allTools[name]) {
      (selectedTools as Record<string, unknown>)[name] = allTools[name];
    }
  }

  // 8. AI 실행
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  try {
    const result = await generateText({
      model: agent.model === "quality" ? models.quality : models.fast,
      system: agent.systemPrompt,
      prompt: resolvedPrompt,
      tools: selectedTools,
      stopWhen: stepCountIs(5),
    });

    // 도구 호출 로그
    const steps: string[] = [];
    for (const step of result.steps ?? []) {
      const calls = (step.toolCalls ?? []) as Array<{ toolName?: string }>;
      for (const call of calls) {
        if (call.toolName) steps.push(`도구 호출: ${call.toolName}`);
      }
    }

    // 비용 추정
    type Usage = {
      promptTokens?: number;
      completionTokens?: number;
      inputTokens?: number;
      outputTokens?: number;
    };
    const usage = ((result as unknown as { usage?: Usage }).usage ?? {}) as Usage;
    const tokensIn = usage.promptTokens ?? usage.inputTokens ?? 0;
    const tokensOut = usage.completionTokens ?? usage.outputTokens ?? 0;
    const cost = tokensIn * COST_PER_TOKEN_IN + tokensOut * COST_PER_TOKEN_OUT;

    const completedAt = new Date().toISOString();
    const stageResult: WorkflowStageResult = {
      index: idx,
      agentId: agent.id,
      agentName: agent.name,
      agentEmoji: agent.emoji,
      label: stageDef.label,
      status: "completed",
      resolvedPrompt,
      output: result.text || "(도구 호출 결과만 있고 텍스트 응답은 없습니다)",
      steps,
      startedAt,
      completedAt,
      durationMs: Date.now() - startMs,
    };

    const nextStage = idx + 1;
    const isLast = nextStage >= workflow.stages.length;
    await runRef.update({
      stageResults: [...run.stageResults, stageResult],
      currentStage: nextStage,
      status: isLast ? "completed" : "running",
      costUsd: (run.costUsd ?? 0) + cost,
      ...(isLast ? { completedAt } : {}),
    });

    return { ok: true, runId, stageIndex: idx, done: isLast };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const stageResult: WorkflowStageResult = {
      index: idx,
      agentId: agent.id,
      agentName: agent.name,
      agentEmoji: agent.emoji,
      label: stageDef.label,
      status: "failed",
      resolvedPrompt,
      error: errMsg,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
    };
    await runRef.update({
      stageResults: [...run.stageResults, stageResult],
      status: "failed",
      error: `stage ${idx} (${stageDef.label}) 실행 실패: ${errMsg}`,
      completedAt: new Date().toISOString(),
    });
    return { ok: false, runId, stageIndex: idx, error: errMsg, status: 500 };
  }
}
