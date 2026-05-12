import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { processOneTick, type TickResult } from "@/lib/ai-forum-engine";

export const maxDuration = 60;

/** 1 cron tick 당 최대 step 수 — 6명 페르소나 × 1 라운드 가정 */
const MAX_STEPS_PER_TICK = 6;

/**
 * AI Forum Tick Cron (Sprint 67-AR Phase 2)
 *
 * Vercel cron 이 매일 호출. 한 토론을 최대 MAX_STEPS_PER_TICK 만큼 진행.
 * Hobby 플랜의 daily cron 한계를 보완하기 위해 한 호출에서 1 라운드 가량 처리.
 * 한 step 사이 같은 forum 또는 라운드 종료 → 다음 forum 으로 자동 전환.
 *
 * 비용 안전장치: processOneTick() 내부 MAX_FORUM_COST_USD 캡으로 forum 단위 제한.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const db = getAdminDb();
    const steps: TickResult[] = [];
    for (let i = 0; i < MAX_STEPS_PER_TICK; i++) {
      const r = await processOneTick(db);
      steps.push(r);
      // 진행할 토론이 없거나 에러면 중단
      if (!r.ok || r.message === "진행 중인 토론 없음") break;
    }
    return Response.json({
      ok: true,
      stepsExecuted: steps.length,
      results: steps,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
