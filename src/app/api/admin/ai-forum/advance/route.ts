import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { processOneTick } from "@/lib/ai-forum-engine";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

export const maxDuration = 60;

/**
 * 운영진 수동 라운드 진행 API (Sprint 67-AR Phase 2)
 *
 * 콘솔에서 "다음 라운드 진행" 버튼이 호출. 본인이 cron 을 기다리지 않고 즉시
 * 1 step 만큼 진행할 수 있다. 페르소나 1명 발언 또는 라운드 전환이 1회 일어남.
 *
 * 권한: staff 이상
 * Body: { forumId?: string } — 미지정 시 가장 오래된 in_progress 자동 선택
 * Rate limit: 분당 5회 (비용 폭주 방지)
 */
export async function POST(req: NextRequest) {
  // 1. 인증 + 권한
  const authUser = await verifyAuth(req).catch(() => null);
  if (!authUser) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const allowedRoles = ["staff", "president", "admin", "sysadmin"];
  if (!allowedRoles.includes(authUser.role ?? "")) {
    return Response.json(
      { error: "운영진(staff 이상)만 사용 가능합니다." },
      { status: 403 },
    );
  }

  // 2. Rate limit — 분당 5회 (비용 폭주 방지)
  const rateLimited = checkRateLimit(getClientId(req, authUser.id), {
    limit: 5,
    windowSec: 60,
  });
  if (rateLimited) return rateLimited;

  // 3. body 파싱
  let forumId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.forumId === "string" && body.forumId.length > 0) {
      forumId = body.forumId;
    }
  } catch {
    // ignore - forumId optional
  }

  // 4. 실행
  try {
    const db = getAdminDb();
    const result = await processOneTick(db, forumId);
    return Response.json(result, { status: result.status ?? 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
