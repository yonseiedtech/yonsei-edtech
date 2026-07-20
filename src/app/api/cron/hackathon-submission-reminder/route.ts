import { NextRequest } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { fanOutNotificationAdmin } from "@/lib/notifications-bridge";
import {
  HACKATHON_CONTEXT_ID,
  HACKATHON_SUBMISSION_DEADLINE,
  HACKATHON_AWARDS_ANNOUNCE_DATE,
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

/** 심사 정체 넛지 대상 D-N (수상 발표일 기준) — 심사 미완 시 심사위원 독려 (R4, 2026-07-21) */
const JUDGING_NUDGE_DDAYS = [2, 1] as const;

/** 심사위원 후보 역할 (staff+) — 심사 입력 권한 보유 */
const JUDGE_ROLES = new Set(["admin", "sysadmin", "president", "staff"]);

/** 심사 넛지 1회 발송 안전 상한 */
const MAX_JUDGES = 30;

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

    // 마감 이후(D+1 이상 경과)이면 제출 리마인더는 자동 비활성.
    // 단, 심사 기간(마감 이후 ~ 수상 발표 전)에는 심사 정체 넛지를 병합 발동한다 (R4).
    if (dDiff < 0) {
      const judging = await runJudgingStallNudge(getAdminDb(), now, dayKey);
      return Response.json({ ok: true, dayKey, dDiff, sent: 0, reason: "past-deadline", judging });
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

/**
 * 심사 정체 넛지 (R4, 2026-07-21) — 신규 cron 없이 본 cron 에 병합.
 *
 * 수상 발표일(HACKATHON_AWARDS_ANNOUNCE_DATE) D-2·D-1 시점에 심사 진행률이 100% 미만이면
 * 심사위원(staff+)에게 인앱 넛지를 1일 1회 발송한다. 심사 미완인 채 수상 발표 단계로
 * 자동 전환되어 빈 발표가 되는 사고를 선행 해소한다.
 *
 * 스팸 방지:
 *  - 대상일(D-2/D-1)이 아니면 스킵
 *  - 제출물 0건이면 스킵(심사할 대상 없음)
 *  - 심사 진행률 100%면 스킵
 *  - 일별 dedup: push_logs/{hackathon_judging_nudge_{judgeId}_{dayKey}}
 */
async function runJudgingStallNudge(
  db: FirebaseFirestore.Firestore,
  now: Date,
  dayKey: string,
): Promise<{ sent: number; reason?: string; judged?: number; total?: number }> {
  const announceYmd = HACKATHON_AWARDS_ANNOUNCE_DATE.slice(0, 10); // "2026-08-29"
  const todayMs = new Date(kstDateKey(now)).getTime();
  const announceMs = new Date(announceYmd).getTime();
  const dToAward = Math.round((announceMs - todayMs) / (24 * 60 * 60 * 1000));

  if (!(JUDGING_NUDGE_DDAYS as readonly number[]).includes(dToAward)) {
    return { sent: 0, reason: "not-judging-nudge-day" };
  }

  // ── 제출물·심사 진행률 집계 ──
  const submissionsSnap = await db
    .collection("hackathon_submissions")
    .where("contextId", "==", HACKATHON_CONTEXT_ID)
    .get();
  const total = submissionsSnap.size;
  if (total === 0) return { sent: 0, reason: "no-submissions" };

  const judgingsSnap = await db
    .collection("hackathon_judgings")
    .where("contextId", "==", HACKATHON_CONTEXT_ID)
    .get();
  const judgedSubIds = new Set<string>();
  for (const j of judgingsSnap.docs) {
    const d = j.data() as { submissionId?: string };
    if (d.submissionId) judgedSubIds.add(d.submissionId);
  }
  const judged = submissionsSnap.docs.filter((s) => judgedSubIds.has(s.id)).length;
  if (judged >= total) return { sent: 0, reason: "judging-complete", judged, total };

  // ── 심사위원(staff+) 조회 ──
  const usersSnap = await db.collection("users").where("approved", "==", true).get();
  const judgeIds = usersSnap.docs
    .filter((d) => {
      const role = (d.data() as { role?: string }).role;
      return role && JUDGE_ROLES.has(role);
    })
    .map((d) => d.id)
    .slice(0, MAX_JUDGES);
  if (judgeIds.length === 0) return { sent: 0, reason: "no-judges", judged, total };

  // ── 일별 dedup ──
  const toNotify: string[] = [];
  for (const judgeId of judgeIds) {
    const dupId = `hackathon_judging_nudge_${judgeId}_${dayKey}`;
    const dupSnap = await db.collection("push_logs").doc(dupId).get();
    if (!dupSnap.exists) toNotify.push(judgeId);
  }
  if (toNotify.length === 0) return { sent: 0, reason: "all-deduped", judged, total };

  const remaining = total - judged;
  const pct = Math.round((judged / total) * 100);
  await fanOutNotificationAdmin(toNotify, {
    type: "admin_nudge",
    title: `해커톤 심사 D-${dToAward} — 미완 ${remaining}건`,
    body: `수상 발표까지 ${dToAward}일 남았습니다. 심사 진행률 ${pct}% (${judged}/${total}) — 남은 산출물 심사를 완료해주세요.`,
    relatedLink: "/console/hackathon",
    metadata: { dayKey, dToAward, judged, total, contextId: HACKATHON_CONTEXT_ID },
  });

  const sentAt = new Date().toISOString();
  for (const judgeId of toNotify) {
    try {
      await db
        .collection("push_logs")
        .doc(`hackathon_judging_nudge_${judgeId}_${dayKey}`)
        .set({
          kind: "hackathon_judging_nudge",
          userId: judgeId,
          dayKey,
          dToAward,
          judged,
          total,
          sentAt,
          contextId: HACKATHON_CONTEXT_ID,
        });
    } catch (e) {
      console.error(
        `[hackathon-submission-reminder] judging-nudge push_logs write error judge=${judgeId}`,
        e,
      );
    }
  }

  return { sent: toNotify.length, judged, total };
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
