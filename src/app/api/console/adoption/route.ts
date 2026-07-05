import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * GET /api/console/adoption (C-5, 2026-07-04) — 기능 채택률 스냅샷 (staff 전용).
 *
 * scripts/usage-snapshot 의 핵심 지표를 콘솔 인사이트에 상시화한다.
 * count() 집계 위주 저비용 · 60초 캐시. 다음 사이클 KPI(개강 후 활성·매트릭스
 * 사용·알림 읽음률) 판정의 단일 기준.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "staff");
  if (auth instanceof NextResponse) return auth;

  const db = getAdminDb();
  const iso = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
  const cnt = async (q: FirebaseFirestore.Query): Promise<number> => {
    try {
      return (await q.count().get()).data().count;
    } catch {
      return -1;
    }
  };
  const col = (n: string) => db.collection(n);
  // QA-v3 H3: dataApi.create 는 createdAt 을 Timestamp 로, 서버 경로는 ISO 문자열로 기록 —
  // 타입 브래키팅 때문에 한쪽 비교만 하면 상시 0. 두 타입을 각각 세어 합산한다.
  const tsCut = (d: number) => Timestamp.fromDate(new Date(Date.now() - d * 86400000));
  const cnt2 = async (name: string, field: string, days: number): Promise<number> => {
    const [a, b] = await Promise.all([
      cnt(col(name).where(field, ">", iso(days))),
      cnt(col(name).where(field, ">", tsCut(days))),
    ]);
    return Math.max(a, 0) + Math.max(b, 0);
  };

  try {
    const [
      approved,
      active7d,
      active30d,
      papersUpdated30d,
      reportsUpdated30d,
      modelsTotal,
      matrixFilled,
      readingLogs30d,
      sessions30d,
      posts30d,
      comments30d,
      notifTotal,
      notifUnread,
      studioDocs,
      dmTotal,
      rsvpTotal,
      checkins,
    ] = await Promise.all([
      cnt(col("users").where("approved", "==", true)),
      cnt(col("users").where("lastVisitAt", ">", iso(7))),
      cnt(col("users").where("lastVisitAt", ">", iso(30))),
      cnt(col("writing_papers").where("lastSavedAt", ">", iso(30))),
      cnt(col("research_reports").where("lastSavedAt", ">", iso(30))),
      cnt(col("research_models")),
      cnt(col("research_papers").where("methodology", ">", "")),
      cnt2("paper_reading_logs", "createdAt", 30),
      cnt2("study_sessions", "createdAt", 30),
      cnt2("posts", "createdAt", 30),
      cnt2("comments", "createdAt", 30),
      cnt(col("notifications")),
      cnt(col("notifications").where("read", "==", false)),
      cnt(col("design_documents")),
      cnt(col("direct_messages")),
      cnt(col("networking_rsvps")),
      cnt(col("seminar_attendees").where("checkedIn", "==", true)),
    ]);

    // streak_events 타입 분포 (신규 기능 사용 신호 — matrix/model/studio/mirror)
    const evSnap = await col("streak_events").limit(5000).get();
    const eventsByType: Record<string, number> = {};
    for (const d of evSnap.docs) {
      const t = (d.data() as { type?: string }).type ?? "?";
      eventsByType[t] = (eventsByType[t] ?? 0) + 1;
    }

    return NextResponse.json(
      {
        at: new Date().toISOString(),
        members: { approved, active7d, active30d },
        research: {
          papersUpdated30d,
          reportsUpdated30d,
          modelsTotal,
          matrixFilled,
          readingLogs30d,
          sessions30d,
        },
        community: { posts30d, comments30d, dmTotal, rsvpTotal, checkins },
        notifications: {
          total: notifTotal,
          unread: notifUnread,
          readRate: notifTotal > 0 ? Math.round(((notifTotal - notifUnread) / notifTotal) * 100) : null,
        },
        studioDocs,
        eventsByType,
      },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (err) {
    console.error("[/api/console/adoption]", err);
    return NextResponse.json({ error: "집계에 실패했습니다." }, { status: 500 });
  }
}
