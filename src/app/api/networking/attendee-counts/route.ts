import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * GET /api/networking/attendee-counts
 *
 * 모임·행사 목록 카드의 "참여 N명" 표시용 집계 (2026-07-19 목록/상세 분리 개편).
 * 목록은 비로그인 방문자도 열람 가능하고 RSVP 원본은 프라이버시상 본인·staff 만 읽을 수 있어
 * (firestore.rules networking_rsvps read 제한), 클라이언트가 직접 셀 수 없다.
 * 따라서 서버가 PII 없이 이벤트별 참석 인원 수(참석 확정 + 동반인)만 집계해 반환한다.
 *
 * 반환값은 개인정보를 포함하지 않는 순수 집계 수치이므로 인증 없이 공개한다(목록과 동일 공개 범위).
 * 집계 로직은 참석(attending) RSVP 인원 + 동반인 합 — 대기자·불참·미정은 제외.
 */
export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("networking_rsvps")
      .where("status", "==", "attending")
      .get();

    const counts: Record<string, number> = {};
    for (const doc of snap.docs) {
      const d = doc.data() as { eventId?: string; companions?: number };
      if (!d.eventId) continue;
      const add = 1 + (typeof d.companions === "number" && d.companions > 0 ? d.companions : 0);
      counts[d.eventId] = (counts[d.eventId] ?? 0) + add;
    }

    // 목록 표시용 집계라 실시간 정밀도가 불필요 — CDN 60초 캐시로 방문자당 전체 RSVP 읽기 방지
    return NextResponse.json(
      { counts },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("[/api/networking/attendee-counts]", err);
    return NextResponse.json({ counts: {} }, { status: 200 });
  }
}
