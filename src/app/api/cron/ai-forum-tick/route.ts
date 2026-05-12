import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { processOneTick } from "@/lib/ai-forum-engine";

export const maxDuration = 60;

/**
 * AI Forum Tick Cron (Sprint 67-AR Phase 2)
 *
 * Vercel cron 이 매일 호출. 진행 중인 토론 1건을 1 step 진행.
 * 핵심 로직은 src/lib/ai-forum-engine.ts 에 추출됨 — 운영진 수동 advance 와 공유.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const db = getAdminDb();
    const result = await processOneTick(db);
    return Response.json(result, { status: result.status ?? 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
