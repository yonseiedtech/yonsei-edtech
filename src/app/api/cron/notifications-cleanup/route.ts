import { NextRequest } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
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
async function _handler(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const cutoffRead = new Date(Date.now() - 30 * 86400000).toISOString();
    const cutoffUnread = new Date(Date.now() - 90 * 86400000).toISOString();

    // 주의: read(등호)+createdAt(범위) 복합 쿼리는 인덱스 필요 — 단일 범위 쿼리 후 메모리 필터
    // (30일 초과분만 스캔하므로 후보 자체가 적다)
    // ⚠ createdAt 타입 혼재(QA v3): 서버 fan-out=ISO 문자열, 클라이언트 dataApi.create=Timestamp.
    //   Timestamp는 문자열보다 앞에 정렬되어 범위 쿼리에 전부 걸리므로, 실제 나이 판정은
    //   반드시 ISO 로 정규화한 메모리 필터에서 수행한다 (미정규화 시 신규 알림까지 삭제됨).
    const toIso = (v: unknown): string => {
      if (typeof v === "string") return v;
      if (v && typeof (v as { toDate?: () => Date }).toDate === "function") {
        return (v as { toDate: () => Date }).toDate().toISOString();
      }
      return "";
    };
    // QA-v3 M: 단일 창(암묵 createdAt 오름차순 1,500건)은 30~90일 미읽음이 창을 독점하면
    // 그보다 새로운 "읽음 30일 초과"가 영영 못 들어오는 기아 발생 — 읽음/미읽음 쿼리 분리.
    // (read+createdAt 복합 인덱스 필요 — firestore.indexes.json 등재)
    const [readSnap, unreadWindowSnap] = await Promise.all([
      db.collection("notifications")
        .where("read", "==", true)
        .where("createdAt", "<", cutoffRead)
        .limit(750)
        .get(),
      db.collection("notifications")
        .where("createdAt", "<", cutoffUnread)
        .limit(750)
        .get(),
    ]);
    const seenIds = new Set<string>();
    const candidates = [...readSnap.docs, ...unreadWindowSnap.docs].filter((d) => {
      if (seenIds.has(d.id)) return false;
      seenIds.add(d.id);
      return true;
    });
    const targets = candidates.filter((doc) => {
      const x = doc.data() as { read?: boolean; createdAt?: unknown };
      const created = toIso(x.createdAt);
      if (!created) return false;
      return (x.read === true && created < cutoffRead) || created < cutoffUnread;
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

export const GET = withCronLog("notifications-cleanup", _handler);
