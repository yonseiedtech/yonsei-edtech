import { NextRequest } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { fanOutNotificationAdmin } from "@/lib/notifications-bridge";
import {
  HACKATHON_CONTEXT_ID,
  HACKATHON_SUBMISSION_DEADLINE,
} from "@/features/hackathon/config";

/**
 * 해커톤 산출물 제출 마감 리마인더 Cron (매일 0시) — v9-H3
 *
 * 참가 신청(comm_boards/comm_questions, contextId=HACKATHON_CONTEXT_ID)은 했으나
 * 산출물(hackathon_submissions)을 제출하지 않은 팀/개인에게 마감 임박 알림을 발송한다.
 *
 * 발송 시점: 마감 D-3 · D-1 · D-0 (당일) — 그 외 날은 스킵.
 * 마감(HACKATHON_SUBMISSION_DEADLINE) 이후에는 자동으로 비활성(스킵).
 *
 * 스팸 방지:
 *  - 일별 dedup: push_logs/{hackathon_submission_reminder_{userId}_{dayKey}} — 1일 1회
 *  - 참가 신청자 0명이면 스킵
 *  - 전원 제출 완료면 스킵
 *  - 대상일(D-3/D-1/D-0)이 아니면 스킵
 */

/** 1회 발송 안전 상한 */
const MAX_RECIPIENTS = 100;

/** 리마인더를 발송할 D-N 목록 */
const TARGET_DDAYS = [3, 1, 0] as const;

/** KST 기준 오늘 날짜 문자열 (YYYY-MM-DD) */
function kstDateKey(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/**
 * HACKATHON_SUBMISSION_DEADLINE(YYYY-MM-DDTHH:mm) 기준 D-N 계산.
 * 마감 당일 = 0, 마감 전 N일 = N, 마감 이후 = 음수.
 */
function daysUntilDeadline(now: Date): number {
  const deadlineYmd = HACKATHON_SUBMISSION_DEADLINE.slice(0, 10); // "2026-08-22"
  const kstToday = kstDateKey(now);
  const todayMs = new Date(kstToday).getTime();
  const deadlineMs = new Date(deadlineYmd).getTime();
  return Math.round((deadlineMs - todayMs) / (24 * 60 * 60 * 1000));
}

async function _handler(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const dayKey = kstDateKey(now);
    const dDiff = daysUntilDeadline(now);

    // 마감 이후(D+1 이상 경과)이면 자동 비활성
    if (dDiff < 0) {
      return Response.json({ ok: true, dayKey, dDiff, sent: 0, reason: "past-deadline" });
    }

    // D-3 / D-1 / D-0 이 아닌 날은 스킵
    if (!(TARGET_DDAYS as readonly number[]).includes(dDiff)) {
      return Response.json({ ok: true, dayKey, dDiff, sent: 0, reason: "not-target-day" });
    }

    const db = getAdminDb();

    // ── 1. 참가 신청자 조회 (comm_boards → comm_questions) ───────────
    const boardsSnap = await db
      .collection("comm_boards")
      .where("contextType", "==", "hackathon")
      .where("contextId", "==", HACKATHON_CONTEXT_ID)
      .get();

    const participantIds = new Set<string>();
    for (const b of boardsSnap.docs) {
      const qSnap = await db
        .collection("comm_questions")
        .where("boardId", "==", b.id)
        .get();
      for (const q of qSnap.docs) {
        const data = q.data() as { authorId?: string };
        if (data.authorId) participantIds.add(data.authorId);
      }
    }

    if (participantIds.size === 0) {
      return Response.json({
        ok: true,
        dayKey,
        dDiff,
        participants: 0,
        sent: 0,
        reason: "no-participants",
      });
    }

    // ── 2. 제출 완료자 조회 (hackathon_submissions) ──────────────────
    const submissionsSnap = await db
      .collection("hackathon_submissions")
      .where("contextId", "==", HACKATHON_CONTEXT_ID)
      .get();

    const submittedOwnerIds = new Set<string>();
    for (const s of submissionsSnap.docs) {
      const data = s.data() as { ownerId?: string };
      if (data.ownerId) submittedOwnerIds.add(data.ownerId);
    }

    // ── 3. 미제출 참가자 필터 ────────────────────────────────────────
    const unsubmitted = [...participantIds].filter((id) => !submittedOwnerIds.has(id));
    if (unsubmitted.length === 0) {
      return Response.json({
        ok: true,
        dayKey,
        dDiff,
        participants: participantIds.size,
        submitted: submittedOwnerIds.size,
        sent: 0,
        reason: "all-submitted",
      });
    }

    // ── 4. 일별 dedup: 오늘 이미 발송된 사용자 제외 ──────────────────
    const toNotify: string[] = [];
    for (const userId of unsubmitted.slice(0, MAX_RECIPIENTS)) {
      const dupId = `hackathon_submission_reminder_${userId}_${dayKey}`;
      const dupSnap = await db.collection("push_logs").doc(dupId).get();
      if (!dupSnap.exists) toNotify.push(userId);
    }

    if (toNotify.length === 0) {
      return Response.json({
        ok: true,
        dayKey,
        dDiff,
        participants: participantIds.size,
        unsubmitted: unsubmitted.length,
        sent: 0,
        reason: "all-deduped",
      });
    }

    // ── 5. 알림 메시지 구성 (D-N 별 다른 톤) ──────────────────────────
    const { title, body } = buildMessage(dDiff);

    await fanOutNotificationAdmin(toNotify, {
      type: "hackathon_submission_reminder",
      title,
      body,
      relatedLink: "/hackathon",
      metadata: { dayKey, dDiff, contextId: HACKATHON_CONTEXT_ID },
    });

    // ── 6. dedup 기록 (push_logs) ─────────────────────────────────────
    const sentAt = new Date().toISOString();
    for (const userId of toNotify) {
      try {
        await db
          .collection("push_logs")
          .doc(`hackathon_submission_reminder_${userId}_${dayKey}`)
          .set({
            kind: "hackathon_submission_reminder",
            userId,
            dayKey,
            dDiff,
            sentAt,
            contextId: HACKATHON_CONTEXT_ID,
          });
      } catch (e) {
        console.error(
          `[hackathon-submission-reminder] push_logs write error user=${userId}`,
          e,
        );
      }
    }

    return Response.json({
      ok: true,
      dayKey,
      dDiff,
      participants: participantIds.size,
      unsubmitted: unsubmitted.length,
      sent: toNotify.length,
    });
  } catch (err) {
    console.error("[cron/hackathon-submission-reminder]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

function buildMessage(dDiff: number): { title: string; body: string } {
  if (dDiff === 0) {
    return {
      title: "에듀테크 해커톤 산출물 제출 — 오늘 마감",
      body: "오늘(21:30)이 제출 마감입니다. 팀 산출물을 제출하고 해커톤을 완주해 보세요!",
    };
  }
  if (dDiff === 1) {
    return {
      title: "에듀테크 해커톤 산출물 제출 D-1",
      body: "내일이 마감입니다. 팀 산출물을 잊지 말고 제출해주세요.",
    };
  }
  return {
    title: "에듀테크 해커톤 산출물 제출 D-3",
    body: "해커톤 산출물 제출 마감이 3일 남았습니다. 팀원들과 함께 준비해 보세요.",
  };
}

export const GET = withCronLog("hackathon-submission-reminder", _handler);
