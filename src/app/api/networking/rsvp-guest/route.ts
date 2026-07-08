import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { isRsvpClosed } from "@/features/networking/networking-helpers";
import type { NetworkingEvent } from "@/types";

/**
 * POST /api/networking/rsvp-guest (P1-5, 2026-07-04)
 *
 * 게스트(비회원) 참석 신청 — 기존에는 rules public create 로 클라이언트가 직접 문서를
 * 만들 수 있어 스팸·마감 후 제출·정원 초과·중복 신청이 전부 무방비였다 (QA-v2).
 * 이제 서버가 강제한다:
 *  - IP rate-limit: 시간당 5회
 *  - 행사 존재·신청 마감(isRsvpClosed) 재검증
 *  - 정원(capacity 설정 시): 참석 인원(동반 포함) 초과 거부
 *  - 동일 행사 × 동일 이름+연락처 중복 신청 거부
 * rules 의 게스트 public create 분기는 제거됨 (회원 RSVP 는 기존 클라이언트 경로 유지).
 */

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(`rsvp_guest_${getClientId(req)}`, { limit: 5, windowSec: 3600 });
  if (limited) return limited;

  let body: { eventId?: string; guestName?: string; guestContact?: string; companions?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const eventId = (body.eventId ?? "").trim();
  const guestName = (body.guestName ?? "").trim();
  const guestContact = (body.guestContact ?? "").trim();
  if (!eventId || !guestName || !guestContact) {
    return NextResponse.json({ error: "이름과 연락처를 입력해주세요." }, { status: 400 });
  }
  if (guestName.length > 30 || guestContact.length > 60) {
    return NextResponse.json({ error: "입력이 너무 깁니다." }, { status: 400 });
  }
  // G6(2026-07-08): 동반인 수(0~9 정수)
  if (body.companions !== undefined && (!Number.isInteger(body.companions) || body.companions < 0 || body.companions > 9)) {
    return NextResponse.json({ error: "동반인 수는 0~9 사이여야 합니다." }, { status: 400 });
  }
  const companions = body.companions ?? 0;

  try {
    const db = getAdminDb();
    const evSnap = await db.collection("networking_events").doc(eventId).get();
    if (!evSnap.exists) {
      return NextResponse.json({ error: "행사를 찾을 수 없습니다." }, { status: 404 });
    }
    const ev = { id: evSnap.id, ...evSnap.data() } as NetworkingEvent;
    const nowIso = new Date().toISOString();
    if (isRsvpClosed(ev, nowIso)) {
      return NextResponse.json({ error: "신청이 마감되었습니다." }, { status: 400 });
    }

    const rsvpCol = db.collection("networking_rsvps");

    // 중복 신청 (동일 행사 × 이름+연락처)
    const dup = await rsvpCol
      .where("eventId", "==", eventId)
      .where("isGuest", "==", true)
      .where("guestContact", "==", guestContact)
      .limit(5)
      .get();
    if (dup.docs.some((d) => (d.data() as { guestName?: string }).guestName === guestName)) {
      return NextResponse.json({ error: "이미 같은 이름·연락처로 신청되어 있습니다." }, { status: 409 });
    }

    // 정원 (capacity 설정 행사만) — 참석 상태 + 동반 인원 합산.
    // G2(2026-07-08): 초과 시 409 거부 대신 대기자(waitlisted)로 저장한다(게스트는 단순 저장 — 트랜잭션화는 G20 스코프).
    let status: "attending" | "waitlisted" = "attending";
    let waitlistPosition: number | null = null;
    if (typeof ev.capacity === "number" && ev.capacity > 0) {
      const attSnap = await rsvpCol
        .where("eventId", "==", eventId)
        .where("status", "==", "attending")
        .limit(1000)
        .get();
      const headcount = attSnap.docs.reduce(
        (sum, d) => sum + 1 + ((d.data() as { companions?: number }).companions ?? 0),
        0,
      );
      // 신청 본인 인원(1 + 동반인)까지 포함해 초과 여부 판정 (G6: 동반인 반영)
      if (headcount + 1 + companions > ev.capacity) {
        status = "waitlisted";
        const wlSnap = await rsvpCol
          .where("eventId", "==", eventId)
          .where("status", "==", "waitlisted")
          .limit(1000)
          .get();
        waitlistPosition = wlSnap.size + 1;
      }
    }

    await rsvpCol.add({
      eventId,
      isGuest: true,
      guestName,
      guestContact,
      displayName: guestName,
      status,
      companions,
      respondedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    return NextResponse.json({ ok: true, waitlisted: status === "waitlisted", waitlistPosition });
  } catch (err) {
    console.error("[/api/networking/rsvp-guest]", err);
    return NextResponse.json({ error: "신청 접수에 실패했습니다." }, { status: 500 });
  }
}
