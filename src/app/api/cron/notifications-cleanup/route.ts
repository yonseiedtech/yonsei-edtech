import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * 알림 자동 정리 크론 (C-2, 2026-07-04) — 매일 1회.
 *
 * 배경: 알림 읽음률 0%(126/126 미읽음) — 오래된 알림이 무한 누적되면 벨 뱃지가
 * 영구 "99+"가 되어 오히려 신호 가치가 죽는다.
 *  - 읽은 알림: 30일 경과 시 삭제
 *  - 미읽음 알림: 90일 경과 시 삭제
 * 회당 최대 1,500건(배치 500) — 초과분은 다음 실행이 처리.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const cutoffRead = new Date(Date.now() - 30 * 86400000).toISOString();
    const cutoffUnread = new Date(Date.now() - 90 * 86400000).toISOString();

    // 주의: read(등호)+createdAt(범위) 복합 쿼리는 인덱스 필요 — 단일 범위 쿼리 후 메모리 필터
    // (30일 초과분만 스캔하므로 후보 자체가 적다)
    const snap = await db
      .collection("notifications")
      .where("createdAt", "<", cutoffRead)
      .limit(1500)
      .get();
    const targets = snap.docs.filter((doc) => {
      const x = doc.data() as { read?: boolean; createdAt?: string };
      return x.read === true || (x.createdAt ?? "") < cutoffUnread;
    });
    let deleted = 0;
    for (let i = 0; i < targets.length; i += 500) {
      const batch = db.batch();
      for (const doc of targets.slice(i, i + 500)) batch.delete(doc.ref);
      await batch.commit();
      deleted += Math.min(500, targets.length - i);
    }

    return Response.json({ ok: true, deleted });
  } catch (err) {
    console.error("[cron/notifications-cleanup]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
