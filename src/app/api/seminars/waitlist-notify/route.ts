import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUsers } from "@/lib/push-admin";

/**
 * POST /api/seminars/waitlist-notify (RT-1, 2026-07-04)
 *
 * 대기열 → 참가 확정 알림의 서버 발송 (인앱 + 웹푸시).
 * 승격은 취소자 브라우저에서 일어나므로 알림도 클라이언트 인앱뿐이었다 —
 * 시간-민감 이벤트(노쇼/자리 낭비 직결)라 푸시 병행이 필요.
 * 남을 대상으로 임의 발송하지 못하도록, 대상이 실제로 해당 세미나 참가자로
 * 등록되어 있는지 서버에서 검증한 뒤에만 발송한다.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req); // 승격을 트리거한 회원(취소자)
  if (auth instanceof NextResponse) return auth;

  let body: { seminarId?: string; userId?: string; seminarTitle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const seminarId = (body.seminarId ?? "").trim();
  const userId = (body.userId ?? "").trim();
  const seminarTitle = (body.seminarTitle ?? "세미나").trim();
  if (!seminarId || !userId) {
    return NextResponse.json({ error: "seminarId·userId 가 필요합니다." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    // 검증: 대상이 실제 참가자로 등록되어 있어야 발송 (스팸 방지)
    const att = await db
      .collection("seminar_attendees")
      .where("seminarId", "==", seminarId)
      .where("userId", "==", userId)
      .limit(1)
      .get();
    if (att.empty) {
      return NextResponse.json({ error: "대상이 참가자로 확인되지 않습니다." }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    await db.collection("notifications").add({
      userId,
      type: "waitlist_promoted",
      title: "대기열에서 참가 확정!",
      message: `"${seminarTitle}" 자리가 나서 참가가 확정되었습니다. 일정을 확인해 주세요.`,
      link: `/seminars/${seminarId}`,
      read: false,
      createdAt: nowIso,
    });
    let pushResult: unknown = null;
    try {
      pushResult = await sendPushToUsers([userId], {
        title: "대기열에서 참가 확정!",
        body: `"${seminarTitle}" 참가가 확정되었습니다.`,
        link: `/seminars/${seminarId}`,
        tag: `waitlist_${seminarId}`,
      });
    } catch (e) {
      console.error("[waitlist-notify] push failed", e);
    }
    return NextResponse.json({ ok: true, pushResult });
  } catch (err) {
    console.error("[/api/seminars/waitlist-notify]", err);
    return NextResponse.json({ error: "알림 발송에 실패했습니다." }, { status: 500 });
  }
}
