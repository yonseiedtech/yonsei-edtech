import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * GET /api/stats/advisors (P1-1b, 2026-07-04)
 *
 * 홈 신뢰 지표용 지도교수 수 — users list 를 staff 로 좁히면서
 * 공개 랜딩의 getCountFromServer(users) 카운트가 거부되므로 서버 집계로 대체.
 * 개인 데이터는 반환하지 않고 개수만 — 10분 CDN 캐시.
 */
export async function GET() {
  try {
    const snap = await getAdminDb()
      .collection("users")
      .where("role", "==", "advisor")
      .where("approved", "==", true)
      .count()
      .get();
    return NextResponse.json(
      { count: snap.data().count },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } },
    );
  } catch (err) {
    console.error("[/api/stats/advisors]", err);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
