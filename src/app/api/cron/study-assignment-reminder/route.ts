import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendPushToUsers, filterRecipientsByPreference } from "@/lib/push-admin";

/**
 * 스터디/프로젝트 과제 마감 D-1 알림 (미제출자) — Study Enhancement (Sprint 6)
 *
 * 매일 09:00 KST 실행.
 * dueAt 가 현재 ~ +48h 사이인 active 과제를 찾아서, 아직 status=completed 가 아닌
 * 참여자(study/project 의 leader/participants)에게 "마감 임박" 푸시 1회.
 *
 * 중복 방지: push_logs/study_assignment_reminder_<assignmentId>_<userId>
 */

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    const nowIso = now.toISOString();
    const horizon = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

    // active=true 만 (dueAt range query 와 active 동시 필터는 firestore 복합 인덱스 필요 → 일단 active 만 필터하고 클라이언트에서 dueAt 검사)
    const assignSnap = await db
      .collection("study_assignments")
      .where("active", "==", true)
      .get();

    let sentTotal = 0;
    let removedStaleTotal = 0;
    const matched: { assignmentId: string; activityId: string; title: string; pendingCount: number; recipientCount: number }[] = [];

    for (const doc of assignSnap.docs) {
      const a = doc.data() as {
        activityId?: string;
        activityProgressId?: string;
        title?: string;
        dueAt?: string;
        required?: boolean;
      };
      if (!a.activityId || !a.dueAt) continue;
      if (a.dueAt <= nowIso || a.dueAt > horizon) continue; // 24~48h 윈도우만

      // 활동 → study/project 만 + 참여자
      const actDoc = await db.collection("activities").doc(a.activityId).get();
      if (!actDoc.exists) continue;
      const act = actDoc.data() as {
        type?: string;
        title?: string;
        participants?: string[];
        leaderId?: string;
      };
      if (act.type !== "study" && act.type !== "project") continue;

      const candidates = new Set<string>();
      (act.participants ?? []).forEach((uid) => {
        if (uid && !uid.startsWith("guest_")) candidates.add(uid);
      });
      if (act.leaderId) candidates.add(act.leaderId);

      if (candidates.size === 0) continue;

      // 제출자 조회 — 이미 제출한 userId 제외
      const subSnap = await db
        .collection("study_assignment_submissions")
        .where("assignmentId", "==", doc.id)
        .get();
      const submittedUserIds = new Set<string>();
      subSnap.docs.forEach((s) => {
        const d = s.data() as { userId?: string; status?: string };
        if (d.userId && d.status === "completed") submittedUserIds.add(d.userId);
      });

      const pendingUserIds = Array.from(candidates).filter(
        (uid) => !submittedUserIds.has(uid),
      );
      if (pendingUserIds.length === 0) continue;

      // 사용자별 중복 가드 — 과제+사용자 단위로 1회만
      const eligibleUserIds: string[] = [];
      for (const uid of pendingUserIds) {
        const dupId = `study_assignment_reminder_${doc.id}_${uid}`;
        const dupRef = db.collection("push_logs").doc(dupId);
        const dupSnap = await dupRef.get();
        if (dupSnap.exists) continue;
        eligibleUserIds.push(uid);
      }
      if (eligibleUserIds.length === 0) continue;
      // Notif-Pref: 사용자 수신 선호도 필터
      const allowedUserIds = await filterRecipientsByPreference(eligibleUserIds, "study_assignment_reminder");
      if (allowedUserIds.length === 0) continue;

      const due = new Date(a.dueAt);
      const dueLabel = due.toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const requiredTag = a.required ? "[필수] " : "";

      const result = await sendPushToUsers(allowedUserIds, {
        title: `${requiredTag}과제 마감 임박 — ${dueLabel}`,
        body: `${act.title ?? "활동"} — ${a.title ?? "과제"} 가 곧 마감됩니다.`,
        link: `/activities/${act.type === "study" ? "studies" : "projects"}/${a.activityId}?tab=progress`,
        tag: `study-assignment-reminder-${doc.id}`,
      });
      sentTotal += result.successful;
      removedStaleTotal += result.removedStale;
      matched.push({
        assignmentId: doc.id,
        activityId: a.activityId,
        title: a.title ?? "",
        pendingCount: pendingUserIds.length,
        recipientCount: result.successful,
      });

      // 발송 완료된 사용자들에 대해 push_log 기록 (개별) — 옵트아웃된 사용자는 dedup 로그 안 남김 (다음 cron 에서 prefs 재변경 시 다시 시도 가능)
      const sentAt = new Date().toISOString();
      const writes = allowedUserIds.map((uid) => {
        const dupRef = db.collection("push_logs").doc(`study_assignment_reminder_${doc.id}_${uid}`);
        return dupRef.set({
          kind: "study_assignment_reminder",
          assignmentId: doc.id,
          activityId: a.activityId,
          userId: uid,
          dueAt: a.dueAt,
          sentAt,
        });
      });
      await Promise.all(writes);
    }

    return Response.json({
      ok: true,
      windowStart: nowIso,
      windowEnd: horizon,
      sentTotal,
      removedStaleTotal,
      matchedCount: matched.length,
      matched,
    });
  } catch (err) {
    console.error("[cron/study-assignment-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
