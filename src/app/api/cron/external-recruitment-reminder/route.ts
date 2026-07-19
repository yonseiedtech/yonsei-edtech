import { NextRequest } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendPushToUsers, filterRecipientsByPreference } from "@/lib/push-admin";
import { fanOutNotificationAdmin } from "@/lib/notifications-bridge";
import { tomorrowYmdKst } from "@/lib/dday";

/**
 * 대외 학술대회 모집 시작/마감 D-1 push 알림 — 매일 09:00 KST (UTC 00:00) 실행.
 *
 * - 내일(KST 기준) 모집이 시작되는 external 활동 → 참여자/운영진에게 push
 * - 내일(KST 기준) 모집이 마감되는 external 활동 → 참여자/운영진에게 push
 *
 * 중복 방지:
 *   push_logs/external_recruit_start_<activityId>
 *   push_logs/external_recruit_end_<activityId>
 *
 * 옵트아웃: users.notificationPrefs.pushExternalRecruitment === false 인 사용자 제외.
 */

/** ISO 문자열(또는 datetime-local 문자열)을 ms 로 파싱. 실패 시 null. */
function parseMs(value: unknown): number | null {
  if (typeof value !== "string" || !value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/** 타임스탬프 ms 가 내일(KST) 에 해당하는지 확인 — YYYY-MM-DD 문자열과 비교. */
function isOnTomorrowKst(ms: number, tomorrow: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(ms)) === tomorrow;
}

async function _handler(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    const tomorrow = tomorrowYmdKst(now);

    // external 활동 전체 조회 (completed/cancelled 포함해 필터링은 아래서 진행)
    const snap = await db
      .collection("activities")
      .where("type", "==", "external")
      .get();

    let sentTotal = 0;
    let removedStaleTotal = 0;
    const matched: {
      activityId: string;
      title: string;
      kind: "start" | "end";
      recipientCount: number;
    }[] = [];

    for (const doc of snap.docs) {
      const data = doc.data() as {
        title?: string;
        status?: string;
        recruitmentStartAt?: string;
        recruitmentEndAt?: string;
        recruitmentStatusOverride?: boolean;
        participants?: string[];
        leaderId?: string;
        members?: string[];
      };

      // completed/cancelled 활동은 skip
      if (data.status === "completed" || data.status === "cancelled") continue;

      // recruitmentStatusOverride === true 면 수동 고정 상태 → 자동 알림 불필요
      if (data.recruitmentStatusOverride === true) continue;

      const startMs = parseMs(data.recruitmentStartAt);
      const endMs = parseMs(data.recruitmentEndAt);

      const sendStart = startMs !== null && isOnTomorrowKst(startMs, tomorrow);
      const sendEnd = endMs !== null && isOnTomorrowKst(endMs, tomorrow);

      if (!sendStart && !sendEnd) continue;

      // 수신 대상: participants + leaderId + members (guest_ 제외)
      const recipientSet = new Set<string>();
      (data.participants ?? []).forEach((uid) => {
        if (uid && !uid.startsWith("guest_")) recipientSet.add(uid);
      });
      (data.members ?? []).forEach((uid) => {
        if (uid && !uid.startsWith("guest_")) recipientSet.add(uid);
      });
      if (data.leaderId) recipientSet.add(data.leaderId);

      const rawUserIds = Array.from(recipientSet);

      // ── 모집 시작 D-1 ──
      if (sendStart) {
        const dupId = `external_recruit_start_${doc.id}`;
        const dupRef = db.collection("push_logs").doc(dupId);
        const dupSnap = await dupRef.get();

        if (!dupSnap.exists) {
          const userIds =
            rawUserIds.length > 0
              ? await filterRecipientsByPreference(rawUserIds, "external_recruitment")
              : [];

          // 수신자가 없어도 push_logs 는 남겨 중복 방지
          let attempted = 0;
          let successful = 0;
          let removedStale = 0;

          if (userIds.length > 0) {
            const result = await sendPushToUsers(userIds, {
              title: `대외 학술대회 모집 시작 D-1 — ${data.title ?? "활동"}`,
              body: "내일부터 모집이 시작됩니다. 신청을 준비하세요.",
              link: `/activities/external/${doc.id}`,
              tag: `external-recruit-start-${doc.id}`,
            });
            attempted = result.attempted;
            successful = result.successful;
            removedStale = result.removedStale;
            sentTotal += successful;
            removedStaleTotal += removedStale;
            matched.push({
              activityId: doc.id,
              title: data.title ?? "",
              kind: "start",
              recipientCount: successful,
            });

            // 인앱 알림 동시 적재 (push_logs 와 독립적으로 수행)
            await fanOutNotificationAdmin(userIds, {
              type: "notice",
              title: `대외 학술대회 모집 시작 D-1 — ${data.title ?? "활동"}`,
              body: "내일부터 모집이 시작됩니다. 신청을 준비하세요.",
              relatedLink: `/activities/external/${doc.id}`,
            });
          }

          await dupRef.set({
            kind: "external_recruit_start",
            activityId: doc.id,
            date: tomorrow,
            attempted,
            successful,
            sentAt: new Date().toISOString(),
          });
        }
      }

      // ── 모집 마감 D-1 ──
      if (sendEnd) {
        const dupId = `external_recruit_end_${doc.id}`;
        const dupRef = db.collection("push_logs").doc(dupId);
        const dupSnap = await dupRef.get();

        if (!dupSnap.exists) {
          const userIds =
            rawUserIds.length > 0
              ? await filterRecipientsByPreference(rawUserIds, "external_recruitment")
              : [];

          let attempted = 0;
          let successful = 0;
          let removedStale = 0;

          if (userIds.length > 0) {
            const result = await sendPushToUsers(userIds, {
              title: `대외 학술대회 모집 마감 D-1 — ${data.title ?? "활동"}`,
              body: "내일 모집이 마감됩니다. 아직 신청하지 않으셨다면 서두르세요.",
              link: `/activities/external/${doc.id}`,
              tag: `external-recruit-end-${doc.id}`,
            });
            attempted = result.attempted;
            successful = result.successful;
            removedStale = result.removedStale;
            sentTotal += successful;
            removedStaleTotal += removedStale;
            matched.push({
              activityId: doc.id,
              title: data.title ?? "",
              kind: "end",
              recipientCount: successful,
            });

            // 인앱 알림 동시 적재
            await fanOutNotificationAdmin(userIds, {
              type: "notice",
              title: `대외 학술대회 모집 마감 D-1 — ${data.title ?? "활동"}`,
              body: "내일 모집이 마감됩니다. 아직 신청하지 않으셨다면 서두르세요.",
              relatedLink: `/activities/external/${doc.id}`,
            });
          }

          await dupRef.set({
            kind: "external_recruit_end",
            activityId: doc.id,
            date: tomorrow,
            attempted,
            successful,
            sentAt: new Date().toISOString(),
          });
        }
      }
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
    console.error("[cron/external-recruitment-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export const GET = withCronLog("external-recruitment-reminder", _handler);
