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

    // G7(2026-07-09): 게스트가 로그인 없이 본인 신청을 조회·취소할 관리 토큰(추측 불가 uuid).
    const manageToken = crypto.randomUUID();
    await rsvpCol.add({
      eventId,
      isGuest: true,
      guestName,
      guestContact,
      displayName: guestName,
      status,
      companions,
      manageToken,
      respondedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // G19(2026-07-09): 참석 확정 게스트 회비 자동 생성(멱등 — displayName 기준). autoDues + feeAmount>0 일 때만.
    if (status === "attending" && ev.autoDues === true && (ev.feeAmount ?? 0) > 0) {
      try {
        const dupDue = await db
          .collection("networking_dues")
          .where("eventId", "==", eventId)
          .where("displayName", "==", guestName)
          .limit(1)
          .get();
        if (dupDue.empty) {
          await db.collection("networking_dues").add({
            eventId,
            isGuest: true,
            displayName: guestName,
            amount: ev.feeAmount,
            status: "unpaid",
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      } catch {
        /* 회비 자동 생성 실패는 신청 접수를 막지 않는다 */
      }
    }

    return NextResponse.json({ ok: true, waitlisted: status === "waitlisted", waitlistPosition, manageToken });
  } catch (err) {
    console.error("[/api/networking/rsvp-guest]", err);
    return NextResponse.json({ error: "신청 접수에 실패했습니다." }, { status: 500 });
  }
}

/**
 * GET /api/networking/rsvp-guest?token=... (G7, 2026-07-09)
 * 게스트가 관리 토큰으로 본인 신청을 조회 — 행사 제목·참석상태·동반인 반환.
 * 토큰은 추측 불가 uuid 라 인증 없이 허용(토큰이 곧 자격증명).
 */
export async function GET(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get("token") ?? "").trim();
  if (!token) return NextResponse.json({ error: "토큰이 필요합니다." }, { status: 400 });
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("networking_rsvps")
      .where("manageToken", "==", token)
      .limit(1)
      .get();
    if (snap.empty) return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
    const doc = snap.docs[0];
    const r = doc.data() as {
      eventId?: string;
      guestName?: string;
      guestContact?: string;
      status?: string;
      companions?: number;
    };
    let eventTitle = "";
    let eventStartAt = "";
    if (r.eventId) {
      const evSnap = await db.collection("networking_events").doc(r.eventId).get();
      if (evSnap.exists) {
        const ev = evSnap.data() as { title?: string; startAt?: string };
        eventTitle = ev.title ?? "";
        eventStartAt = ev.startAt ?? "";
      }
    }
    return NextResponse.json({
      ok: true,
      rsvp: {
        id: doc.id,
        eventId: r.eventId ?? "",
        guestName: r.guestName ?? "",
        status: r.status ?? "attending",
        companions: r.companions ?? 0,
      },
      eventTitle,
      eventStartAt,
    });
  } catch (err) {
    console.error("[/api/networking/rsvp-guest GET]", err);
    return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

/**
 * DELETE /api/networking/rsvp-guest (G7, 2026-07-09)
 * 게스트가 관리 토큰으로 본인 신청을 취소(문서 삭제). 삭제 후 정원 여유가 생기면
 * 대기자를 createdAt 최선순으로 승격하고(비트랜잭션 — G20 스코프), 승격 회원에게 인앱 알림.
 */
export async function DELETE(req: NextRequest) {
  const limited = checkRateLimit(`rsvp_guest_del_${getClientId(req)}`, { limit: 10, windowSec: 3600 });
  if (limited) return limited;

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const token = (body.token ?? "").trim();
  if (!token) return NextResponse.json({ error: "토큰이 필요합니다." }, { status: 400 });

  try {
    const db = getAdminDb();
    const rsvpCol = db.collection("networking_rsvps");
    const snap = await rsvpCol.where("manageToken", "==", token).limit(1).get();
    if (snap.empty) return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
    const mineDoc = snap.docs[0];
    const eventId = (mineDoc.data() as { eventId?: string }).eventId ?? "";
    await mineDoc.ref.delete();

    // 대기자 승격 — 정원 설정 행사만.
    if (eventId) {
      const evSnap = await db.collection("networking_events").doc(eventId).get();
      const ev = evSnap.exists ? ({ id: evSnap.id, ...evSnap.data() } as NetworkingEvent) : null;
      const cap = ev && typeof ev.capacity === "number" && ev.capacity > 0 ? ev.capacity : null;
      if (cap !== null) {
        const nowIso = new Date().toISOString();
        const allSnap = await rsvpCol.where("eventId", "==", eventId).limit(1000).get();
        type WDoc = { status?: string; companions?: number; createdAt?: string; userId?: string };
        const seatsOf = (d: WDoc) => 1 + (d.companions ?? 0);
        const attendingSeats = allSnap.docs
          .filter((d) => (d.data() as WDoc).status === "attending")
          .reduce((sum, d) => sum + seatsOf(d.data() as WDoc), 0);
        let free = cap - attendingSeats;
        const promotedMembers: string[] = [];
        const waitlisted = allSnap.docs
          .filter((d) => (d.data() as WDoc).status === "waitlisted")
          .sort((a, b) =>
            ((a.data() as WDoc).createdAt ?? "").localeCompare((b.data() as WDoc).createdAt ?? ""),
          );
        for (const w of waitlisted) {
          const wd = w.data() as WDoc;
          const need = seatsOf(wd);
          if (need <= free) {
            await w.ref.update({ status: "attending", updatedAt: nowIso });
            free -= need;
            if (wd.userId) promotedMembers.push(wd.userId);
          } else {
            break;
          }
        }
        if (promotedMembers.length > 0) {
          let link = "/gatherings";
          if ((ev?.visibility ?? "public") === "private") {
            const tokenSnap = await db
              .collection("networking_event_tokens")
              .where("eventId", "==", eventId)
              .limit(1)
              .get();
            link = tokenSnap.empty ? "/gatherings" : `/gatherings/p/${tokenSnap.docs[0].id}`;
          }
          await Promise.all(
            promotedMembers.map((uid) =>
              db.collection("notifications").add({
                userId: uid,
                type: "networking_reminder",
                title: "대기자 참석 확정",
                message: `「${ev?.title ?? "모임"}」 대기자에서 참석 확정되었습니다.`,
                link,
                refId: eventId,
                read: false,
                createdAt: nowIso,
              }),
            ),
          );
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/networking/rsvp-guest DELETE]", err);
    return NextResponse.json({ error: "취소에 실패했습니다." }, { status: 500 });
  }
}
