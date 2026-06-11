import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/api-auth";
import { fanOutNotificationAdmin } from "@/lib/notifications-bridge";
import { sendPushToUsers, filterRecipientsByPreference } from "@/lib/push-admin";

/**
 * 소통 보드 새 답변 알림 (오케스트라 사이클 4)
 *
 * 기존: 클라이언트(notify.ts)가 인앱 알림 직접 생성 — 비로그인(게스트) 답변은
 * rules 거부로 silent fail, push 채널도 없었음.
 * 변경: 서버 단일 경로 — 게스트 답변도 질문 작성자에게 인앱 + push(웹푸시) 알림.
 *
 * 보안: IP rate limit(10/60s), 존재 비공개 응답 통일, 회원 답변자는 토큰으로
 * 본인 질문 self-notify 스킵. 알림 실패는 항상 비차단(ok 응답).
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = checkRateLimit(`comm_notify_${ip}`, { limit: 10, windowSec: 60 });
  if (limited) return limited;

  let body: { questionId?: string; answererName?: string };
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
    const q = qSnap.data() as { authorId?: string; boardId?: string; body?: string };
    if (!q.authorId || !q.boardId) return Response.json({ ok: true }); // 게스트 질문 — 수신자 없음

    // 회원 답변자가 자기 질문에 답한 경우 스킵
    const auth = await verifyAuth(req);
    if (auth && (auth.uid === q.authorId || auth.id === q.authorId)) {
      return Response.json({ ok: true, skipped: "self" });
    }

    const answerer = String(body.answererName ?? "").slice(0, 30).trim() || "누군가";
    const questionBody = q.body ?? "";
    const excerpt = questionBody.length > 30 ? `${questionBody.slice(0, 30)}…` : questionBody;
    const title = "내 질문에 새 답변이 달렸습니다";
    const message = `${answerer}님이 "${excerpt}" 질문에 답변을 남겼습니다.`;
    const link = `/boards/${q.boardId}/wall`;

    await fanOutNotificationAdmin([q.authorId], {
      type: "comment",
      title,
      body: message,
      relatedLink: link,
    });

    const pushIds = await filterRecipientsByPreference([q.authorId], "comm_board_answer");
    if (pushIds.length > 0) {
      await sendPushToUsers(pushIds, {
        title,
        body: message,
        link,
        tag: `comm-answer-${questionId}`,
      });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[comm/notify-answer]", err);
    // 알림 실패는 답변 흐름을 막지 않는다
    return Response.json({ ok: true });
  }
}
