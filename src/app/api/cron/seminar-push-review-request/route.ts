import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendPushToUsers, filterRecipientsByPreference } from "@/lib/push-admin";

/**
 * 세미나 D+1 후기 push 알림 — Seminar Push Review Request
 *
 * 매일 09:00 KST 실행.
 * 어제(KST) 진행된 세미나의 체크인 완료 참석자 중 후기 미작성자에게 push.
 * 기존 seminar-review-request 는 인앱 notification + 이메일만 → push 채널 추가로 채널 일관성.
 *
 * 중복 방지: push_logs/seminar_push_review_<seminarId>_<userId>
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function todayYmdKst(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

function yesterdayYmdKst(now: Date = new Date()): string {
  const today = todayYmdKst(now);
  const [y, m, d] = today.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d));
  prev.setUTCDate(prev.getUTCDate() - 1);
  return `${prev.getUTCFullYear()}-${pad2(prev.getUTCMonth() + 1)}-${pad2(prev.getUTCDate())}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    const yesterday = yesterdayYmdKst(now);

    const seminarSnap = await db
      .collection("seminars")
      .where("date", "==", yesterday)
      .get();

    let sentTotal = 0;
    let removedStaleTotal = 0;
    const matched: { seminarId: string; title: string; pendingCount: number; recipientCount: number }[] = [];

    for (const doc of seminarSnap.docs) {
      const s = doc.data() as { title?: string; status?: string };
      // cancelled 만 명시 제외 — completed/upcoming 모두 처리 (status cron 순서 의존성 회피)
      if (s.status === "cancelled") continue;

      // 체크인 완료 참석자
      const attendeesSnap = await db
        .collection("seminar_attendees")
        .where("seminarId", "==", doc.id)
        .where("checkedIn", "==", true)
        .get();
      const attendeeUserIds = attendeesSnap.docs
        .map((d) => (d.data() as { userId?: string }).userId)
        .filter((x): x is string => !!x);
      if (attendeeUserIds.length === 0) continue;

      // 이미 후기 작성한 사용자 제외
      const reviewsSnap = await db
        .collection("seminar_reviews")
        .where("seminarId", "==", doc.id)
        .get();
      const reviewedUserIds = new Set(
        reviewsSnap.docs
          .map((d) => (d.data() as { authorId?: string }).authorId)
          .filter((x): x is string => !!x),
      );
      const pendingUserIds = attendeeUserIds.filter((uid) => !reviewedUserIds.has(uid));
      if (pendingUserIds.length === 0) continue;

      // 사용자별 push_logs dedup 검사
      const eligibleUserIds: string[] = [];
      for (const uid of pendingUserIds) {
        const dupRef = db
          .collection("push_logs")
          .doc(`seminar_push_review_${doc.id}_${uid}`);
        const dupSnap = await dupRef.get();
        if (dupSnap.exists) continue;
        eligibleUserIds.push(uid);
      }
      if (eligibleUserIds.length === 0) continue;
      // Notif-Pref: 사용자 수신 선호도 필터
      const allowedUserIds = await filterRecipientsByPreference(eligibleUserIds, "seminar_push_review_request");
      if (allowedUserIds.length === 0) continue;

      const result = await sendPushToUsers(allowedUserIds, {
        title: "세미나 후기를 남겨주세요",
        body: `${s.title ?? "세미나"} — 어제 참석한 세미나 후기 부탁드립니다.`,
        link: `/seminars/${doc.id}/review`,
        tag: `seminar-review-request-${doc.id}`,
      });
      sentTotal += result.successful;
      removedStaleTotal += result.removedStale;
      matched.push({
        seminarId: doc.id,
        title: s.title ?? "",
        pendingCount: pendingUserIds.length,
        recipientCount: result.successful,
      });

      // dedup 기록 (보낸 사용자 단위) — 옵트아웃된 사용자는 기록 안 함
      const sentAt = new Date().toISOString();
      await Promise.all(
        allowedUserIds.map((uid) =>
          db
            .collection("push_logs")
            .doc(`seminar_push_review_${doc.id}_${uid}`)
            .set({
              kind: "seminar_push_review_request",
              seminarId: doc.id,
              userId: uid,
              date: yesterday,
              sentAt,
            }),
        ),
      );
    }

    return Response.json({
      ok: true,
      yesterday,
      sentTotal,
      removedStaleTotal,
      matchedCount: matched.length,
      matched,
    });
  } catch (err) {
    console.error("[cron/seminar-push-review-request]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
