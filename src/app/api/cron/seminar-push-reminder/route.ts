import { NextRequest } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendPushToUsers, filterRecipientsByPreference } from "@/lib/push-admin";
import { fanOutNotificationAdmin } from "@/lib/notifications-bridge";
import { tomorrowYmdKst } from "@/lib/dday";

/**
 * 세미나 D-1 push 알림 — Seminar Push (Sprint 6 extension)
 *
 * 매일 09:00 KST 실행.
 * 내일(KST) 진행될 세미나(date == tomorrow, status ∈ {upcoming, ongoing})의
 * attendee + speaker(hostUserIds) 에게 push.
 *
 * 기존 seminar-reminder cron 은 이메일만 보냄 → 일관성을 위해 push 알림 채널 추가.
 * 중복 방지: push_logs/seminar_push_reminder_<seminarId>
 */

async function _handler(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    const tomorrow = tomorrowYmdKst(now);

    // 내일 진행 세미나 (upcoming/ongoing 만, cancelled/completed 제외)
    const seminarSnap = await db
      .collection("seminars")
      .where("date", "==", tomorrow)
      .get();

    let sentTotal = 0;
    let removedStaleTotal = 0;
    const matched: { seminarId: string; title: string; recipientCount: number }[] = [];

    for (const doc of seminarSnap.docs) {
      const s = doc.data() as {
        title?: string;
        status?: string;
        startTime?: string;
        hostUserIds?: string[];
        speaker?: string;
        location?: string;
      };
      if (s.status === "cancelled" || s.status === "completed") continue;

      // 중복 방지
      const dupId = `seminar_push_reminder_${doc.id}`;
      const dupRef = db.collection("push_logs").doc(dupId);
      const dupSnap = await dupRef.get();
      if (dupSnap.exists) continue;

      // attendees 의 userId 수집 (가입회원만 push 가능)
      const attendeeSnap = await db
        .collection("seminar_attendees")
        .where("seminarId", "==", doc.id)
        .get();
      const recipients = new Set<string>();
      attendeeSnap.docs.forEach((a) => {
        const d = a.data() as { userId?: string };
        if (d.userId) recipients.add(d.userId);
      });
      // 호스트(speaker) 도 추가 — 본인 진행 일정 리마인드
      (s.hostUserIds ?? []).forEach((uid) => {
        if (uid) recipients.add(uid);
      });

      const rawUserIds = Array.from(recipients);
      if (rawUserIds.length === 0) continue;
      const userIds = await filterRecipientsByPreference(rawUserIds, "seminar_push_reminder");
      if (userIds.length === 0) continue;

      const startTime = s.startTime ?? "";
      const locationTag = s.location ? ` · ${s.location}` : "";
      const result = await sendPushToUsers(userIds, {
        title: `내일 세미나 안내 — ${s.title ?? "세미나"}`,
        body: `${startTime ? `${startTime} 시작` : "내일 진행"}${locationTag}`,
        link: `/seminars/${doc.id}`,
        tag: `seminar-push-reminder-${doc.id}`,
      });
      sentTotal += result.successful;
      removedStaleTotal += result.removedStale;
      matched.push({
        seminarId: doc.id,
        title: s.title ?? "",
        recipientCount: result.successful,
      });

      // 인앱 알림 동시 적재 (push 실패와 무관하게 수행)
      await fanOutNotificationAdmin(userIds, {
        type: "seminar_reminder",
        title: `내일 세미나 안내 — ${s.title ?? "세미나"}`,
        body: `${startTime ? `${startTime} 시작` : "내일 진행"}${locationTag}`,
        relatedLink: `/seminars/${doc.id}`,
        metadata: { sourceId: `seminar_push_reminder_${doc.id}`, seminarId: doc.id },
      });

      await dupRef.set({
        kind: "seminar_push_reminder",
        seminarId: doc.id,
        date: tomorrow,
        attempted: result.attempted,
        successful: result.successful,
        sentAt: new Date().toISOString(),
      });
    }

    return Response.json({
      ok: true,
      tomorrow,
      sentTotal,
      removedStaleTotal,
      matchedCount: matched.length,
      matched,
    });
  } catch (err) {
    console.error("[cron/seminar-push-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export const GET = withCronLog("seminar-push-reminder", _handler);
