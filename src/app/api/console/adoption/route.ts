import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { computeAdoption } from "@/features/insights/adoption-metrics";

/**
 * GET /api/console/adoption (C-5, 2026-07-04 · v6-H1 확장) — 기능 채택률 스냅샷 (staff 전용).
 *
 * scripts/usage-snapshot 의 핵심 지표를 콘솔 인사이트에 상시화한다.
 * v6-H1: 진단·암기카드·주간목표·멘토링·검수 큐 신규 루프까지 집계(computeAdoption).
 * 주간 시계열은 /api/cron/adoption-snapshot 이 adoption_snapshots 에 적재한다.
 * count() 집계 위주 저비용 · 60초 캐시.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "staff");
  if (auth instanceof NextResponse) return auth;

  try {
    const metrics = await computeAdoption(getAdminDb());
    return NextResponse.json(metrics, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (err) {
    console.error("[/api/console/adoption]", err);
    return NextResponse.json({ error: "집계에 실패했습니다." }, { status: 500 });
  }
}
