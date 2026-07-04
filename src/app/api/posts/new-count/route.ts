import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * GET /api/posts/new-count?since=ISO (RT-1, 2026-07-04)
 *
 * "지난 방문 이후 새 글 N" 뱃지용 서버 집계.
 * posts 의 read 규칙이 카테고리 조건이라 클라이언트 createdAt 범위 쿼리는
 * 증명 불가(전면 거부) — 관리자 SDK count 집계로 대체 (개수만 반환, 60초 캐시).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const since = req.nextUrl.searchParams.get("since") ?? "";
  if (!since || Number.isNaN(new Date(since).getTime())) {
    return NextResponse.json({ error: "since(ISO) 가 필요합니다." }, { status: 400 });
  }

  try {
    const snap = await getAdminDb()
      .collection("posts")
      .where("createdAt", ">", since)
      .count()
      .get();
    return NextResponse.json(
      { count: snap.data().count },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (err) {
    console.error("[/api/posts/new-count]", err);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
