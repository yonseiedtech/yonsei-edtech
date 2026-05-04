import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * Stale push_tokens 정리 cron — Sprint 53
 *
 * 매주 일요일 03:00 KST (= UTC 18:00 토요일).
 * lastUsedAt 또는 createdAt 이 90일 이전인 토큰 일괄 삭제.
 * 일반적인 발송 실패 시에도 push-admin 에서 실시간 정리되지만,
 * 휴면 회원/장기 비활성 토큰을 백그라운드로 청소.
 */

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffIso = cutoff.toISOString();

    const snap = await db.collection("push_tokens").get();
    let deleted = 0;
    let kept = 0;
    for (const doc of snap.docs) {
      const data = doc.data() as { lastUsedAt?: string; createdAt?: string };
      const last = data.lastUsedAt ?? data.createdAt ?? "";
      if (last && last < cutoffIso) {
        await doc.ref.delete();
        deleted++;
      } else {
        kept++;
      }
    }

    return Response.json({ ok: true, cutoffIso, deleted, kept });
  } catch (err) {
    console.error("[cron/push-token-cleanup]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
