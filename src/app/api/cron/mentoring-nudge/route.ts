import { NextRequest } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { fanOutNotificationAdmin } from "@/lib/notifications-bridge";
import { cohortKeyOf, currentSemesterKey } from "@/lib/semester";
import { currentWeekKey } from "@/lib/weekly-goal";
import { MENTORING_CONTEXT_ID } from "@/features/mentoring/topics";

/**
 * 멘토링 미참여 신입 주간 넛지 Cron (주 1회, 월요일) — v8-M3
 *
 * 현재 학기 코호트 신입 중 멘토링 Q&A 질문을 한 번도 작성하지 않은 회원에게
 * 주 1회 멘토링 참여 안내 알림을 발송한다. 졸업생 멘토가 1명 이상 존재할 때만 발송.
 *
 * 스팸 방지:
 *  - 주 1회: push_logs/{mentoring_nudge_{userId}_{weekKey}} 중복 방지
 *  - 멘토링 보드 미프로비저닝 시 (보드 없음) 스킵
 *  - mentorOpen=true 졸업생 0명이면 발송 안 함 (연결할 대상 없음)
 *  - 이미 질문을 작성한 신입은 스킵 (matched)
 */

/** 1회 발송 안전 상한 (수십 명 규모 학술 커뮤니티) */
const MAX_RECIPIENTS = 50;

type UserDoc = {
  id: string;
  enrollmentYear?: number | null;
  enrollmentHalf?: number | null;
  createdAt?: string | null;
  approved?: boolean;
  mentorOpen?: boolean;
};

async function _handler(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const semKey = currentSemesterKey();
    const weekKey = currentWeekKey();

    // ── 1. 현재 학기 신입 조회 ──────────────────────────────────────────────
    const usersSnap = await db.collection("users").where("approved", "==", true).get();
    const allUsers: UserDoc[] = usersSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<UserDoc, "id">),
    }));

    const newcomers = allUsers.filter((u) => cohortKeyOf(u) === semKey);
    if (newcomers.length === 0) {
      return Response.json({ ok: true, semKey, newcomers: 0, sent: 0 });
    }

    // ── 2. 멘토 존재 여부 확인 (mentorOpen=true, 승인 회원만) ──────────────
    const hasMentor = allUsers.some((u) => u.mentorOpen === true && u.approved !== false);
    if (!hasMentor) {
      return Response.json({
        ok: true,
        semKey,
        newcomers: newcomers.length,
        sent: 0,
        reason: "no-mentor",
      });
    }

    // ── 3. 멘토링 보드 & 질문 asker 집합 ──────────────────────────────────
    const boardsSnap = await db
      .collection("comm_boards")
      .where("contextType", "==", "mentoring")
      .where("contextId", "==", MENTORING_CONTEXT_ID)
      .get();

    const askerIds = new Set<string>();
    if (!boardsSnap.empty) {
      for (const b of boardsSnap.docs) {
        const qSnap = await db
          .collection("comm_questions")
          .where("boardId", "==", b.id)
          .get();
        for (const q of qSnap.docs) {
          const data = q.data() as { authorId?: string };
          if (data.authorId) askerIds.add(data.authorId);
        }
      }
    }
    // 보드가 없는 경우 askerIds는 비어 있어 전체 신입이 "미매칭"으로 판정됨(정상)

    // ── 4. 미참여 신입 필터 ────────────────────────────────────────────────
    const unmatched = newcomers.filter((u) => !askerIds.has(u.id));
    if (unmatched.length === 0) {
      return Response.json({
        ok: true,
        semKey,
        newcomers: newcomers.length,
        unmatched: 0,
        sent: 0,
      });
    }

    // ── 5. 중복 방지: 이번 주 이미 발송된 신입 제외 ──────────────────────
    const toNotify: UserDoc[] = [];
    for (const u of unmatched.slice(0, MAX_RECIPIENTS)) {
      const dupId = `mentoring_nudge_${u.id}_${weekKey}`;
      const dupSnap = await db.collection("push_logs").doc(dupId).get();
      if (!dupSnap.exists) toNotify.push(u);
    }

    if (toNotify.length === 0) {
      return Response.json({
        ok: true,
        semKey,
        newcomers: newcomers.length,
        unmatched: unmatched.length,
        sent: 0,
        reason: "all-deduped",
      });
    }

    // ── 6. 알림 fan-out ─────────────────────────────────────────────────────
    const finalIds = toNotify.map((u) => u.id);
    await fanOutNotificationAdmin(finalIds, {
      type: "mentoring_nudge",
      title: "선배 졸업생에게 질문해 보세요",
      body: "논문·진로·유학 등 궁금한 점을 멘토링 Q&A에 남기면 졸업생 멘토가 답변해 드립니다.",
      relatedLink: "/mentoring",
      metadata: { semKey, weekKey },
    });

    // ── 7. 발송 기록 (push_logs — 중복 방지 앵커) ─────────────────────────
    const now = new Date().toISOString();
    for (const u of toNotify) {
      try {
        await db
          .collection("push_logs")
          .doc(`mentoring_nudge_${u.id}_${weekKey}`)
          .set({
            kind: "mentoring_nudge",
            userId: u.id,
            semKey,
            weekKey,
            sentAt: now,
          });
      } catch (e) {
        console.error(`[mentoring-nudge] push_logs write error user=${u.id}`, e);
      }
    }

    return Response.json({
      ok: true,
      semKey,
      weekKey,
      newcomers: newcomers.length,
      unmatched: unmatched.length,
      sent: toNotify.length,
    });
  } catch (err) {
    console.error("[cron/mentoring-nudge]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export const GET = withCronLog("mentoring-nudge", _handler);
