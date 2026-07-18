import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/api-auth";
import { fanOutNotificationAdmin } from "@/lib/notifications-bridge";
import { todayYmdKst } from "@/lib/dday";
import { matchesMentorTopics } from "@/features/mentoring/topics";

/**
 * 멘토링 Q&A 새 질문 → 해당 분야 멘토 인앱 알림 (v6-H4)
 *
 * 질문의 분야 태그(presenter)와 멘토 오픈 졸업생(mentorOpen)의 mentorTopics 교집합에만
 * 인앱 알림을 발송한다. 서버 경로인 이유: 남에게 알림 생성은 rules 상 클라이언트가 못 함
 * (comm/notify-answer 와 동일 패턴). 인앱 전용 — push 발송 정책은 미합의(외부 의존)이므로 제외.
 *
 * 스팸 방지:
 *  - 분야 무관(태그 없음) 질문은 per-question 알림을 보내지 않는다(주간 다이제스트가 담당).
 *  - 멘토 opt-in 존중: mentorOpen==true 인 승인 회원만 수신.
 *  - 일 상한: 오늘(KST) 이미 mentoring_question 알림을 DAILY_CAP 이상 받은 멘토는 제외.
 *  - 질문 작성자 본인은 제외.
 * 알림 실패는 항상 비차단(ok 응답).
 */

/** 멘토 1인당 하루 멘토링 질문 알림 상한 */
const DAILY_CAP = 3;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = checkRateLimit(`mentoring_notify_${ip}`, { limit: 10, windowSec: 60 });
  if (limited) return limited;

  let body: { questionId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const questionId = String(body.questionId ?? "").trim();
  if (!questionId) return Response.json({ error: "questionId required" }, { status: 400 });

  try {
    const db = getAdminDb();
    const qSnap = await db.collection("comm_questions").doc(questionId).get();
    if (!qSnap.exists) return Response.json({ ok: true });
    const q = qSnap.data() as { authorId?: string; presenter?: string; body?: string };

    const topic = (q.presenter ?? "").trim();
    // 분야 무관 질문은 per-question 알림 대신 주간 다이제스트가 담당 (스팸 방지)
    if (!topic) return Response.json({ ok: true, skipped: "no-topic" });

    const asker = await verifyAuth(req); // 익명/게스트면 null
    const askerId = asker?.uid ?? q.authorId;

    // 멘토 오픈 졸업생 조회 (mentorOpen==true) — approved 는 메모리 필터(복합 인덱스 회피)
    const mentorSnap = await db.collection("users").where("mentorOpen", "==", true).get();
    const candidates: string[] = [];
    for (const doc of mentorSnap.docs) {
      const u = doc.data() as { approved?: boolean; mentorTopics?: string[] };
      if (u.approved === false) continue;
      if (askerId && doc.id === askerId) continue; // 본인 제외
      if (!matchesMentorTopics(topic, u.mentorTopics ?? [])) continue;
      candidates.push(doc.id);
    }
    if (candidates.length === 0) return Response.json({ ok: true, notified: 0 });

    // 일 상한: 오늘(KST) 자정 이후 mentoring_question 알림 수를 멘토별로 집계
    const startIso = new Date(`${todayYmdKst()}T00:00:00+09:00`).toISOString();
    const countByUser = new Map<string, number>();
    try {
      const notifSnap = await db
        .collection("notifications")
        .where("createdAt", ">=", startIso)
        .limit(3000)
        .get();
      for (const doc of notifSnap.docs) {
        const d = doc.data() as { type?: string; userId?: string };
        if (d.type === "mentoring_question" && d.userId) {
          countByUser.set(d.userId, (countByUser.get(d.userId) ?? 0) + 1);
        }
      }
    } catch {
      /* 집계 실패 시 상한 미적용(발송 우선) */
    }

    const recipients = candidates.filter((id) => (countByUser.get(id) ?? 0) < DAILY_CAP);
    if (recipients.length === 0) return Response.json({ ok: true, notified: 0, capped: true });

    const raw = q.body ?? "";
    const excerpt = raw.length > 30 ? `${raw.slice(0, 30)}…` : raw;
    await fanOutNotificationAdmin(recipients, {
      type: "mentoring_question",
      title: "내 멘토 분야에 새 질문이 올라왔습니다",
      body: `[${topic}] "${excerpt}" — 후배가 답변을 기다립니다.`,
      relatedLink: `/mentoring?topic=${encodeURIComponent(topic)}`,
      metadata: { sourceId: `mentoring_question_${questionId}` },
    });
    return Response.json({ ok: true, notified: recipients.length });
  } catch (err) {
    console.error("[mentoring/notify-question]", err);
    // 알림 실패는 질문 등록 흐름을 막지 않는다
    return Response.json({ ok: true });
  }
}
