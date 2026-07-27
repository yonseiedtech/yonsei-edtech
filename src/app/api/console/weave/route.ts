import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { computeWeaveGuides } from "@/features/insights/weave-metrics";

/**
 * GET /api/console/weave (v17-H2) — v16 연결고리 러닝 가이드 진행/완독 집계 (staff 전용).
 *
 * firestore.rules 가 회원의 learning_guide_progress 전체 read 를 막으므로
 * Admin SDK 로 서버 집계한다. 수요→개설 전환·진단 후속행동은 클라이언트에서
 * 기존 staff 읽기 API(commQuestionsApi·diagnosticResultsApi)로 집계한다.
 * count 위주 저비용 · 60초 캐시.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "staff");
  if (auth instanceof NextResponse) return auth;

  try {
    const guides = await computeWeaveGuides(getAdminDb());
    return NextResponse.json(
      { guides },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (err) {
    console.error("[/api/console/weave]", err);
    return NextResponse.json({ error: "집계에 실패했습니다." }, { status: 500 });
  }
}
