import { NextRequest } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendPushToUsers, filterRecipientsByPreference } from "@/lib/push-admin";
import { fanOutNotificationAdmin } from "@/lib/notifications-bridge";
import { todayYmdKst } from "@/lib/dday";

/**
 * 암기카드 복습 알림 push — 2차 백로그 v2-R1
 *
 * 매일 09:00 KST 실행 (vercel.json schedule "0 0 * * *" = UTC 0:00 = KST 09:00).
 * 사용자별 flashcards 중 dueAt <= todayKST 인 카드가 임계(REVIEW_THRESHOLD) 이상이면
 * 1일 1회 push + 인앱 알림 "오늘 복습할 암기카드 N장".
 *
 * 발송 정책(보수적):
 *  - 기본값 OFF — notificationPrefs.pushFlashcardReview === true 인 사용자에게만 발송.
 *    (v2 §5 발송정책 운영진 결정 전까지 알림 피로 방지를 위해 opt-in.
 *     운영진 결정 후 기본 ON 으로 전환하려면 filterRecipientsByPreference 기본동작에 맡기면 됨.)
 *  - 임계: 1장 이상(REVIEW_THRESHOLD). 운영진 결정 항목.
 *
 * 중복 방지: push_logs/flashcard_review_reminder_<userId>_<todayKST> (1일 1회)
 *
 * flashcards 컬렉션은 Firestore 기반(dataApi=Firestore client) → Admin SDK 로 직접 조회.
 * dueAt 은 "YYYY-MM-DD"(KST) 문자열 → 문자열 비교 <= todayKST 로 due 판정.
 */

/** 복습 알림 발송 임계(due 카드 수). 운영진 결정 항목 — 기본 1장. */
const REVIEW_THRESHOLD = 1;

async function _handler(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const todayYmd = todayYmdKst();

    // 오늘 복습 대상(dueAt <= todayKST) 카드 전수 조회 후 사용자별 집계.
    // dueAt 은 YYYY-MM-DD 문자열 → 사전식 비교가 날짜 비교와 일치.
    const dueSnap = await db
      .collection("flashcards")
      .where("dueAt", "<=", todayYmd)
      .get();

    // 사용자별 due 카드 수 집계
    const countByUser = new Map<string, number>();
    for (const doc of dueSnap.docs) {
      const d = doc.data() as { userId?: string };
      if (!d.userId) continue;
      countByUser.set(d.userId, (countByUser.get(d.userId) ?? 0) + 1);
    }

    // 임계 이상인 사용자만 후보
    const candidates = Array.from(countByUser.entries()).filter(
      ([, n]) => n >= REVIEW_THRESHOLD,
    );
    if (candidates.length === 0) {
      return Response.json({ ok: true, todayYmd, candidates: 0, sentTotal: 0 });
    }

    // 수신 선호도 필터 (보수적: pushFlashcardReview === true 인 사용자만 — opt-in)
    const candidateIds = candidates.map(([uid]) => uid);
    const allowedIds = await filterRecipientsByPreference(
      candidateIds,
      "flashcard_review_reminder",
    );
    const allowedSet = new Set(allowedIds);

    let sentTotal = 0;
    let removedStaleTotal = 0;
    let skippedDup = 0;
    let notified = 0;

    for (const [userId, count] of candidates) {
      if (!allowedSet.has(userId)) continue;

      // 중복 방지: 1일 1회
      const dupId = `flashcard_review_reminder_${userId}_${todayYmd}`;
      const dupRef = db.collection("push_logs").doc(dupId);
      const dupSnap = await dupRef.get();
      if (dupSnap.exists) {
        skippedDup++;
        continue;
      }

      const title = "오늘 복습할 암기카드";
      const body = `복습할 암기카드 ${count}장이 있어요.`;
      const link = "/flashcards";

      const result = await sendPushToUsers([userId], {
        title,
        body,
        link,
        tag: "flashcard-review-reminder",
      });
      sentTotal += result.successful;
      removedStaleTotal += result.removedStale;

      // 인앱 알림 동시 적재 (push 실패와 무관하게 수행)
      await fanOutNotificationAdmin([userId], {
        type: "flashcard_review_reminder",
        title,
        body,
        relatedLink: link,
        metadata: { sourceId: dupId, dueCount: count },
      });
      notified++;

      await dupRef.set({
        kind: "flashcard_review_reminder",
        userId,
        date: todayYmd,
        dueCount: count,
        attempted: result.attempted,
        successful: result.successful,
        sentAt: new Date().toISOString(),
      });
    }

    return Response.json({
      ok: true,
      todayYmd,
      candidates: candidates.length,
      allowed: allowedIds.length,
      notified,
      sentTotal,
      removedStaleTotal,
      skippedDup,
    });
  } catch (err) {
    console.error("[cron/flashcard-review-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export const GET = withCronLog("flashcard-review-reminder", _handler);
