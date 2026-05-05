import { NextRequest, NextResponse } from "next/server";
import { generateText, stepCountIs, type ToolSet } from "ai";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { models } from "@/lib/ai";
import { publicTools, staffTools } from "@/lib/ai-tools";
import { getAgentById } from "@/features/yonsei-agents/agents-config";
import { ROLE_HIERARCHY } from "@/lib/permissions";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const RequestSchema = z.object({
  agentId: z.string().min(1),
  prompt: z.string().min(1).max(2000),
});

const STAFF_ROLES = new Set(["sysadmin", "admin", "staff", "president"]);

export async function POST(req: NextRequest) {
  // 1. 인증 (회원 이상만 사용)
  const auth = await requireAuth(req, "member");
  if (auth instanceof NextResponse) return auth;

  // 2. 레이트 리밋 (분당 5회)
  const rateLimited = checkRateLimit(`yonsei-agent_${auth.uid}`, {
    limit: 5,
    windowSec: 60,
  });
  if (rateLimited) return rateLimited;

  // 3. 입력 검증
  let body: { agentId: string; prompt: string };
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "agentId와 prompt가 필요합니다." },
      { status: 400 },
    );
  }

  // 4. 에이전트 정의 조회 + 권한 검증
  const agent = getAgentById(body.agentId);
  if (!agent) {
    return NextResponse.json(
      { error: "존재하지 않는 에이전트입니다." },
      { status: 404 },
    );
  }
  if (ROLE_HIERARCHY[auth.role] < ROLE_HIERARCHY[agent.minRole]) {
    return NextResponse.json(
      { error: `이 에이전트는 ${agent.minRole} 이상만 사용할 수 있습니다.` },
      { status: 403 },
    );
  }

  // 5. 도구 선택 (역할에 따라 staff 도구도 포함)
  const allToolsAvailable: Record<string, unknown> = { ...publicTools };
  if (STAFF_ROLES.has(auth.role)) {
    Object.assign(allToolsAvailable, staffTools);
  }
  const selectedTools: ToolSet = {};
  for (const name of agent.toolNames) {
    if (allToolsAvailable[name]) {
      (selectedTools as Record<string, unknown>)[name] =
        allToolsAvailable[name];
    }
  }

  // 6. agent_jobs 도큐먼트 생성 (pending → running)
  const db = getAdminDb();
  const now = new Date().toISOString();
  const jobRef = await db.collection("agent_jobs").add({
    agentId: agent.id,
    agentName: agent.name,
    agentEmoji: agent.emoji,
    userId: auth.uid,
    userName: auth.name ?? null,
    title: body.prompt.slice(0, 80),
    prompt: body.prompt,
    status: "pending",
    steps: [],
    createdAt: now,
  });

  const startedAt = new Date().toISOString();
  await jobRef.update({ status: "running", startedAt });

  // 7. AI 실행
  const startMs = Date.now();
  try {
    const result = await generateText({
      model: agent.model === "quality" ? models.quality : models.fast,
      system: agent.systemPrompt,
      prompt: body.prompt,
      tools: selectedTools,
      stopWhen: stepCountIs(5),
    });

    // 단계 로그 (도구 호출 추적)
    const steps: string[] = [];
    for (const step of result.steps ?? []) {
      const calls = (step.toolCalls ?? []) as Array<{ toolName?: string }>;
      for (const call of calls) {
        if (call.toolName) steps.push(`도구 호출: ${call.toolName}`);
      }
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;
    await jobRef.update({
      status: "completed",
      output: result.text || "(도구 호출 결과만 있고 텍스트 응답은 없습니다)",
      steps,
      completedAt,
      durationMs,
    });

    return NextResponse.json({
      jobId: jobRef.id,
      output: result.text,
      steps,
      durationMs,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[yonsei-agent]", errMsg);
    await jobRef.update({
      status: "failed",
      error: errMsg,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
    });
    return NextResponse.json(
      { error: "에이전트 실행에 실패했습니다.", detail: errMsg, jobId: jobRef.id },
      { status: 500 },
    );
  }
}
