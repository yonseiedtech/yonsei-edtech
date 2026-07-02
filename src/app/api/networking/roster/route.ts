import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * GET /api/networking/roster?eventId=...
 *
 * 모임·행사 참석자 명단 (Hotfix-1A — 프라이버시 서버 강제).
 * 이전에는 클라이언트가 RSVP 전체를 받아 JS 로 필터했으나(비동의자·게스트 연락처 유출),
 * 이제 서버가 다음을 강제한다:
 *  - 요청자가 해당 행사에 attending RSVP 한 회원일 것 (참석자끼리 원칙)
 *  - 반환은 공개 동의(showInAttendeeList=true)한 attending 회원의 {userId, displayName} 만
 *  - 게스트·연락처·비동의자는 절대 반환하지 않음
 */
export async function GET(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId가 필요합니다." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const snap = await db
      .collection("networking_rsvps")
      .where("eventId", "==", eventId)
      .get();

    const rows = snap.docs.map((d) => d.data() as {
      userId?: string;
      status?: string;
      showInAttendeeList?: boolean;
      displayName?: string;
    });

    // 참석자끼리 원칙 — 요청자 본인이 attending 회원이어야 명단 열람 가능
    const meAttending = rows.some((r) => r.userId === user.uid && r.status === "attending");
    if (!meAttending) {
      return NextResponse.json({ error: "참석 신청자만 명단을 볼 수 있습니다." }, { status: 403 });
    }

    const roster = rows
      .filter((r) => r.status === "attending" && r.userId && r.showInAttendeeList === true)
      .map((r) => ({ userId: r.userId as string, displayName: r.displayName ?? "회원" }));

    return NextResponse.json({ roster });
  } catch (err) {
    console.error("[/api/networking/roster]", err);
    return NextResponse.json({ error: "명단 조회에 실패했습니다." }, { status: 500 });
  }
}
