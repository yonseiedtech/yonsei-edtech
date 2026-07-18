import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import type { AdoptionSnapshot } from "@/features/insights/adoption-metrics";

/**
 * GET /api/console/adoption/history (v6-H1) — 최근 N주 채택 추세 (staff 전용).
 *
 * adoption_snapshots 컬렉션(주 1회 cron 적재)만 읽어 저비용으로 시계열을 반환한다.
 * 즉석 집계 없음 — 콘솔 추세 표·스파크라인 전용.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "staff");
  if (auth instanceof NextResponse) return auth;

  const weeks = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get("weeks") ?? "8", 10) || 8, 1),
    26,
  );

  try {
    const snap = await getAdminDb()
      .collection("adoption_snapshots")
      .orderBy("weekKey", "desc")
      .limit(weeks)
      .get();
    // 오래된 주 → 최신 주 순으로 정렬해 추세를 그대로 그릴 수 있게 반환
    const rows = snap.docs
      .map((d) => d.data() as AdoptionSnapshot)
      .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
    return NextResponse.json(
      { rows },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch (err) {
    console.error("[/api/console/adoption/history]", err);
    return NextResponse.json({ error: "추세 조회에 실패했습니다." }, { status: 500 });
  }
}
