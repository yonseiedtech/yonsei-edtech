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
    const nowIso = new Date().toISOString();
    const rsvpCol = db.collection("networking_rsvps");
    // G7(2026-07-09): 게스트가 로그인 없이 본인 신청을 조회·취소할 관리 토큰(추측 불가 uuid).
    const manageToken = crypto.randomUUID();

    // M3(2026-07-09): 정원 판정 + 중복 검사 + 생성을 트랜잭션으로 원자화(G20 해소).
    // 예전에는 attSnap read → 정원 판정 → add 가 별개 비원자 연산이라, 동시 게스트 2건이 같은
    // headcount 를 읽고 둘 다 attending 저장 → 정원 초과가 가능했다. 이제 회원 rsvp 라우트와
    // 동일하게 이벤트 전체 RSVP 를 트랜잭션 read 로 확보해 판정·생성한다.
    const result = await db.runTransaction(async (tx) => {
      const evSnap = await tx.get(db.collection("networking_events").doc(eventId));
      if (!evSnap.exists) return { error: "행사를 찾을 수 없습니다.", httpStatus: 404 };
      const ev = { id: evSnap.id, ...evSnap.data() } as NetworkingEvent;
      if (isRsvpClosed(ev, nowIso)) return { error: "신청이 마감되었습니다.", httpStatus: 400 };

      const allSnap = await tx.get(rsvpCol.where("eventId", "==", eventId).limit(1000));

      // 중복 신청 (동일 행사 × 이름+연락처)
      const isDup = allSnap.docs.some((d) => {
        const r = d.data() as { isGuest?: boolean; guestContact?: string; guestName?: string };
        return r.isGuest === true && r.guestContact === guestContact && r.guestName === guestName;
      });
      if (isDup) return { error: "이미 같은 이름·연락처로 신청되어 있습니다.", httpStatus: 409 };

      // 정원 (capacity 설정 행사만) — 참석 상태 + 동반 인원 합산.
      // G2(2026-07-08): 초과 시 409 거부 대신 대기자(waitlisted)로 저장한다.
      let rsvpStatus: "attending" | "waitlisted" = "attending";
      let waitlistPosition: number | null = null;
      if (typeof ev.capacity === "number" && ev.capacity > 0) {
        const attendingSeats = allSnap.docs
          .filter((d) => (d.data() as { status?: string }).status === "attending")
          .reduce((sum, d) => sum + 1 + ((d.data() as { companions?: number }).companions ?? 0), 0);
        // 신청 본인 인원(1 + 동반인)까지 포함해 초과 여부 판정 (G6: 동반인 반영)
        if (attendingSeats + 1 + companions > ev.capacity) {
          rsvpStatus = "waitlisted";
          const wlCount = allSnap.docs.filter(
            (d) => (d.data() as { status?: string }).status === "waitlisted",
          ).length;
          waitlistPosition = wlCount + 1;
        }
      }

      tx.create(rsvpCol.doc(), {
        eventId,
        isGuest: true,
        guestName,
        guestContact,
        displayName: guestName,
        status: rsvpStatus,
        companions,
        manageToken,
        respondedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      return {
        ok: true,
        rsvpStatus,
        waitlistPosition,
        autoDues: ev.autoDues === true,
        feeAmount: ev.feeAmount ?? 0,
      };
    });

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus ?? 400 });
    }

    // G19/M4(2026-07-09): 참석 확정 게스트 회비 멱등 생성. deterministic doc id(displayName 기준 —
    // 콘솔 dueByKey 가 게스트를 displayName 으로 dedupe 하므로 동일 키)로 만들어 재시도·동시 요청에도 중복 불가.
    // (트랜잭션 밖 — 회비 생성 실패가 신청 접수를 막지 않도록 best-effort.)
    if (result.rsvpStatus === "attending" && result.autoDues && result.feeAmount > 0) {
      try {
        const dueId = `${eventId}__${guestName.replace(/\//g, "_")}`;
        await db.collection("networking_dues").doc(dueId).create({
          eventId,
          isGuest: true,
          displayName: guestName,
          amount: result.feeAmount,
          status: "unpaid",
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      } catch {
        /* 이미 생성됨(ALREADY_EXISTS) 또는 회비 자동 생성 실패는 신청 접수를 막지 않는다 */
      }
    }

    return NextResponse.json({
      ok: true,
      waitlisted: result.rsvpStatus === "waitlisted",
      waitlistPosition: result.waitlistPosition,
      manageToken,
    });
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
    const nowIso = new Date().toISOString();

    // M3(2026-07-09): 취소 + 대기자 승격을 트랜잭션으로 원자화. 예전에는 allSnap read 후 for 루프의
    // plain update 승격이라, 회원 RSVP 트랜잭션이 같은 waitlisted 문서를 승격 중이면 write-write 충돌
    // 감지 없이 last-write-wins → 이중 승격/정원 초과·중복 승격 알림이 가능했다.
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(rsvpCol.where("manageToken", "==", token).limit(1));
      if (snap.empty) return { error: "신청을 찾을 수 없습니다.", httpStatus: 404 };
      const mineDoc = snap.docs[0];
      const md = mineDoc.data() as { eventId?: string; guestName?: string };
      const eventId = md.eventId ?? "";
      const guestName = md.guestName ?? "";

      let eventTitle = "모임";
      let visibility: "public" | "private" = "public";
      const promotedUserIds: string[] = [];

      // 대기자 승격 — 정원 설정 행사만. (모든 read 를 write 앞에 수행 — 트랜잭션 규칙)
      if (eventId) {
        const evSnap = await tx.get(db.collection("networking_events").doc(eventId));
        const ev = evSnap.exists ? ({ id: evSnap.id, ...evSnap.data() } as NetworkingEvent) : null;
        eventTitle = ev?.title ?? "모임";
        visibility = ev?.visibility ?? "public";
        const cap = ev && typeof ev.capacity === "number" && ev.capacity > 0 ? ev.capacity : null;
        if (cap !== null) {
          const allSnap = await tx.get(rsvpCol.where("eventId", "==", eventId).limit(1000));
          type WDoc = { status?: string; companions?: number; createdAt?: string; userId?: string };
          const seatsOf = (d: WDoc) => 1 + (d.companions ?? 0);
          // 본인(취소 대상) 제외 참석 좌석
          const attendingSeats = allSnap.docs
            .filter((d) => d.id !== mineDoc.id && (d.data() as WDoc).status === "attending")
            .reduce((sum, d) => sum + seatsOf(d.data() as WDoc), 0);
          let free = cap - attendingSeats;
          const waitlisted = allSnap.docs
            .filter((d) => d.id !== mineDoc.id && (d.data() as WDoc).status === "waitlisted")
            .sort((a, b) =>
              ((a.data() as WDoc).createdAt ?? "").localeCompare((b.data() as WDoc).createdAt ?? ""),
            );
          for (const w of waitlisted) {
            const wd = w.data() as WDoc;
            const need = seatsOf(wd);
            if (need <= free) {
              tx.update(w.ref, { status: "attending", updatedAt: nowIso });
              free -= need;
              if (wd.userId) promotedUserIds.push(wd.userId);
            } else {
              break;
            }
          }
        }
      }

      tx.delete(mineDoc.ref);
      return { ok: true, eventId, guestName, eventTitle, visibility, promotedUserIds };
    });

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus ?? 400 });
    }

    // 승격 회원 인앱 알림 (트랜잭션 밖 — 알림 실패가 취소 롤백을 유발하지 않도록).
    const promotedUserIds = result.promotedUserIds ?? [];
    if (promotedUserIds.length > 0) {
      let link = "/gatherings";
      if (result.visibility === "private") {
        const tokenSnap = await db
          .collection("networking_event_tokens")
          .where("eventId", "==", result.eventId)
          .limit(1)
          .get();
        link = tokenSnap.empty ? "/gatherings" : `/gatherings/p/${tokenSnap.docs[0].id}`;
      }
      const notifNow = new Date().toISOString();
      await Promise.all(
        promotedUserIds.map((uid) =>
          db.collection("notifications").add({
            userId: uid,
            type: "networking_reminder",
            title: "대기자 참석 확정",
            message: `「${result.eventTitle}」 대기자에서 참석 확정되었습니다.`,
            link,
            refId: result.eventId,
            read: false,
            createdAt: notifNow,
          }),
        ),
      );
    }

    // M1(2026-07-09): 게스트 취소 시 본인 unpaid due 정리(displayName+isGuest 기준, paid·exempt 보존).
    // 예전에는 게스트가 취소해도 autoDues 로 만든 미납 회비가 잔존해 통계·독촉을 오염시켰다.
    if (result.eventId && result.guestName) {
      const dueSnap = await db
        .collection("networking_dues")
        .where("eventId", "==", result.eventId)
        .where("displayName", "==", result.guestName)
        .get();
      const toDelete = dueSnap.docs.filter((d) => {
        const dd = d.data() as { status?: string; isGuest?: boolean };
        return dd.status === "unpaid" && dd.isGuest === true;
      });
      if (toDelete.length > 0) {
        const batch = db.batch();
        toDelete.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/networking/rsvp-guest DELETE]", err);
    return NextResponse.json({ error: "취소에 실패했습니다." }, { status: 500 });
  }
}
