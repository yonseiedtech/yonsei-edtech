import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { ROLE_HIERARCHY } from "@/lib/permissions";
import { getWorkflowById } from "@/features/yonsei-agents/workflows-config";
import { processWorkflowStage } from "@/lib/agent-workflow-engine";
import type { WorkflowRun } from "@/features/yonsei-agents/workflow-types";

export const maxDuration = 60;

const StartSchema = z.object({
  action: z.literal("start"),
  workflowId: z.string().min(1),
  userInput: z.string().min(1).max(2000),
});
const AdvanceSchema = z.object({
  action: z.literal("advance"),
  runId: z.string().min(1),
});
const RequestSchema = z.union([StartSchema, AdvanceSchema]);

export async function POST(req: NextRequest) {
  // 1. 인증 — 워크플로우는 staff 이상 전용
  const auth = await requireAuth(req, "staff");
  if (auth instanceof NextResponse) return auth;

  // 2. 레이트 리밋 (분당 10회 — stage advance 가 연속 호출되므로 약간 여유)
  const rateLimited = checkRateLimit(`agent-workflow_${auth.uid}`, {
    limit: 10,
    windowSec: 60,
  });
  if (rateLimited) return rateLimited;

  // 3. 입력 검증
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "action(start|advance) 과 필수 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const db = getAdminDb();

  // ── start: 새 워크플로우 run 생성 + 첫 stage 실행 ──
  if (body.action === "start") {
    const workflow = getWorkflowById(body.workflowId);
    if (!workflow) {
      return NextResponse.json(
        { error: "존재하지 않는 워크플로우입니다." },
        { status: 404 },
      );
    }
    if (ROLE_HIERARCHY[auth.role] < ROLE_HIERARCHY[workflow.minRole]) {
      return NextResponse.json(
        { error: `이 워크플로우는 ${workflow.minRole} 이상만 사용할 수 있습니다.` },
        { status: 403 },
      );
    }

    const now = new Date().toISOString();
    const runRef = await db.collection("agent_workflow_runs").add({
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowEmoji: workflow.emoji,
      userId: auth.uid,
      userName: auth.name ?? undefined,
      userInput: body.userInput,
      status: "running",
      currentStage: 0,
      totalStages: workflow.stages.length,
      stageResults: [],
      costUsd: 0,
      createdAt: now,
      startedAt: now,
    } satisfies Omit<WorkflowRun, "id">);

    // 첫 stage 실행
    const tick = await processWorkflowStage(db, runRef.id);
    return NextResponse.json({
      runId: runRef.id,
      ...tick,
    });
  }

  // ── advance: 기존 run 의 다음 stage 실행 ──
  // body.action === "advance"
  const runSnap = await db.collection("agent_workflow_runs").doc(body.runId).get();
  if (!runSnap.exists) {
    return NextResponse.json(
      { error: "워크플로우 run 을 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  const run = runSnap.data() as WorkflowRun;
  // 본인 run 만 advance 가능
  if (run.userId !== auth.uid) {
    return NextResponse.json(
      { error: "본인이 시작한 워크플로우만 진행할 수 있습니다." },
      { status: 403 },
    );
  }

  const tick = await processWorkflowStage(db, body.runId);
  return NextResponse.json({ runId: body.runId, ...tick });
}
