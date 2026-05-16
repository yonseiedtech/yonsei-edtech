import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendPushToUsers } from "@/lib/push-admin";

/**
 * 스터디/프로젝트 회차 D-1 알림 — Study Enhancement (Sprint 6)
 *
 * 매일 09:00 KST (UTC 00:00) 실행.
 * 내일(KST) 진행될 study/project 활동 회차(activity_progress.date == tomorrow)의
 * 참여자 + 발제자에게 "내일 ○○ 회차가 있어요" 푸시 1회.
 *
 * 중복 방지: push_logs/study_session_reminder_<progressId>
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

function tomorrowYmdKst(now: Date = new Date()): string {
  const today = todayYmdKst(now);
  const [y, m, d] = today.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    const tomorrow = tomorrowYmdKst(now);

    // 내일 진행 예정 회차 (completed 제외)
    const progressSnap = await db
      .collection("activity_progress")
      .where("date", "==", tomorrow)
      .get();

    let sentTotal = 0;
    let removedStaleTotal = 0;
    const matched: { progressId: string; activityId: string; title: string; recipientCount: number }[] = [];

    for (const doc of progressSnap.docs) {
      const p = doc.data() as {
        activityId?: string;
        title?: string;
        startTime?: string;
        status?: string;
        presenterUserIds?: string[];
        week?: number;
      };
      if (!p.activityId) continue;
      if (p.status === "completed") continue;

      // 활동 조회 → study/project 만 + 참여자 추출
      const actDoc = await db.collection("activities").doc(p.activityId).get();
      if (!actDoc.exists) continue;
      const act = actDoc.data() as {
        type?: string;
        title?: string;
        participants?: string[];
        leaderId?: string;
      };
      if (act.type !== "study" && act.type !== "project") continue;

      const recipients = new Set<string>();
      (act.participants ?? []).forEach((uid) => {
        // guest_ 로 시작하는 비회원은 push 불가
        if (uid && !uid.startsWith("guest_")) recipients.add(uid);
      });
      if (act.leaderId) recipients.add(act.leaderId);
      (p.presenterUserIds ?? []).forEach((uid) => {
        if (uid) recipients.add(uid);
      });
      const userIds = Array.from(recipients);
      if (userIds.length === 0) continue;

      // 중복 방지 (회차당 1회)
      const dupId = `study_session_reminder_${doc.id}`;
      const dupRef = db.collection("push_logs").doc(dupId);
      const dupSnap = await dupRef.get();
      if (dupSnap.exists) continue;

      const startTime = p.startTime ?? "";
      const presenterTag = (p.presenterUserIds ?? []).length > 0
        ? ` · 발제 ${(p.presenterUserIds ?? []).length}명 지정`
        : "";
      const title = `내일 ${act.type === "study" ? "스터디" : "프로젝트"} 회차 ${p.week ? `Week ${p.week} ` : ""}`;
      const body = `${act.title ?? "활동"} — ${p.title ?? ""}${startTime ? ` ${startTime} 시작` : ""}${presenterTag}`;

      const result = await sendPushToUsers(userIds, {
        title,
        body,
        link: `/activities/${act.type === "study" ? "studies" : "projects"}/${p.activityId}?tab=progress`,
        tag: `study-session-reminder-${doc.id}`,
      });
      sentTotal += result.successful;
      removedStaleTotal += result.removedStale;
      matched.push({
        progressId: doc.id,
        activityId: p.activityId,
        title: p.title ?? "",
        recipientCount: result.successful,
      });

      await dupRef.set({
        kind: "study_session_reminder",
        activityProgressId: doc.id,
        activityId: p.activityId,
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
    console.error("[cron/study-session-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
