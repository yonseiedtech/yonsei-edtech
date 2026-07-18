import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import type { NetworkingEvent } from "@/types";

/**
 * POST /api/networking/attendee (2026-07-19)
 *
 * 운영진 수기 참석자 등록 — 현장 등록·대리 등록 용도. 회원 검색으로 고른 회원을
 * 참석 확정(attending) 상태로 추가한다. RSVP(본인 신청)와 구분되는 "출석 확정" 개념.
 *
 * firestore.rules networking_rsvps create 는 request.resource.data.userId == auth.uid 라
 * 운영진이 타 회원 RSVP 를 클라이언트에서 만들 수 없다(대리 RSVP 차단). 게스트 신청과 동일하게
 * 서버(Admin SDK)가 staff 권한 검증 후 생성한다. rules 변경 없음.
 *
 * - staff 이상만 허용(requireAuth staff)
 * - 이미 해당 회원 RSVP 가 있으면 attending + attendedAt 로 갱신(중복 문서 방지)
 * - 없으면 새 문서 생성(addedByStaff=true, attendedAt=now)
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "staff");
  if (auth instanceof NextResponse) return auth;

  let body: { eventId?: string; userId?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const eventId = (body.eventId ?? "").trim();
  const userId = (body.userId ?? "").trim();
  const displayName = (body.displayName ?? "").trim();
  if (!eventId || !userId || !displayName) {
    return NextResponse.json({ error: "행사·회원 정보가 필요합니다." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const nowIso = new Date().toISOString();

    const evSnap = await db.collection("networking_events").doc(eventId).get();
    if (!evSnap.exists) {
      return NextResponse.json({ error: "행사를 찾을 수 없습니다." }, { status: 404 });
    }
    const ev = { id: evSnap.id, ...evSnap.data() } as NetworkingEvent;

    const rsvpCol = db.collection("networking_rsvps");
    const existingSnap = await rsvpCol
      .where("eventId", "==", eventId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      // 이미 신청 이력 있음 — 참석 확정으로 승격(불참·미정·대기 → 참석). 기존 문서 재사용.
      const doc = existingSnap.docs[0];
      await doc.ref.update({
        status: "attending",
        attendedAt: nowIso,
        updatedAt: nowIso,
      });
      return NextResponse.json({ ok: true, updated: true, rsvpId: doc.id });
    }

    const ref = await rsvpCol.add({
      eventId,
      userId,
      isGuest: false,
      displayName,
      status: "attending",
      companions: 0,
      addedByStaff: true,
      attendedAt: nowIso,
      respondedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // 참석 확정 회비 멱등 생성(autoDues + 유료 행사) — 게스트 라우트와 동일 정책.
    if (ev.autoDues === true && (ev.feeAmount ?? 0) > 0) {
      try {
        const dueId = `${eventId}__u_${userId}`;
        await db.collection("networking_dues").doc(dueId).create({
          eventId,
          userId,
          displayName,
          amount: ev.feeAmount ?? 0,
          status: "unpaid",
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      } catch {
        /* 이미 생성됨 또는 회비 생성 실패는 등록을 막지 않는다 */
      }
    }

    return NextResponse.json({ ok: true, created: true, rsvpId: ref.id });
  } catch (err) {
    console.error("[/api/networking/attendee]", err);
    return NextResponse.json({ error: "참석자 등록에 실패했습니다." }, { status: 500 });
  }
}
