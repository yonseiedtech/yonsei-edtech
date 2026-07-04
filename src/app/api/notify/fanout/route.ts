import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUsers } from "@/lib/push-admin";

/**
 * POST /api/notify/fanout (RT-1, 2026-07-04)
 *
 * 공지·새 세미나의 전 회원 알림 fan-out 서버화.
 * 기존에는 작성자 브라우저에서 최대 500명 Promise.all 로 실행돼 탭을 닫으면
 * 부분 유실됐고, 채널도 인앱뿐이었다 — 서버 배치(멱등 아님·1회 호출 전제) + 웹푸시 병행.
 * 공지/세미나 등록은 staff 액션이므로 staff 이상만 호출 가능.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "staff");
  if (auth instanceof NextResponse) return auth;

  let body: { kind?: string; title?: string; refId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const kind = body.kind === "notice" || body.kind === "seminar_new" ? body.kind : null;
  const title = (body.title ?? "").trim();
  const refId = (body.refId ?? "").trim();
  if (!kind || !title || !refId) {
    return NextResponse.json({ error: "kind·title·refId 가 필요합니다." }, { status: 400 });
  }

  const link = kind === "notice" ? `/notices/${refId}` : `/seminars/${refId}`;
  const notifTitle = kind === "notice" ? "새 공지사항" : "새 세미나가 열렸어요";
  const message = kind === "notice" ? title : `${title} — 선착순 신청이 시작됐습니다.`;

  try {
    const db = getAdminDb();
    const usersSnap = await db.collection("users").where("approved", "==", true).limit(1000).get();
    const targets = usersSnap.docs.map((d) => d.id).filter((id) => id !== auth.id);

    const nowIso = new Date().toISOString();
    let notifCount = 0;
    for (let i = 0; i < targets.length; i += 400) {
      const batch = db.batch();
      for (const userId of targets.slice(i, i + 400)) {
        const ref = db.collection("notifications").doc();
        batch.set(ref, {
          userId,
          type: kind === "notice" ? "notice" : "seminar_new",
          title: notifTitle,
          message,
          link,
          read: false,
          createdAt: nowIso,
        });
        notifCount++;
      }
      await batch.commit();
    }

    let pushResult: unknown = null;
    try {
      pushResult = await sendPushToUsers(targets, { title: notifTitle, body: message, link, tag: `${kind}_${refId}` });
    } catch (e) {
      console.error("[notify/fanout] push failed", e);
    }

    return NextResponse.json({ ok: true, notifCount, pushResult });
  } catch (err) {
    console.error("[/api/notify/fanout]", err);
    return NextResponse.json({ error: "알림 발송에 실패했습니다." }, { status: 500 });
  }
}
