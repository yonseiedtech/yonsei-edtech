import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import { isRsvpClosed } from "@/features/networking/networking-helpers";
import type { NetworkingEvent, RsvpStatus } from "@/types";

/**
 * POST /api/networking/rsvp (QA-v3, 2026-07-05)
 *
 * 회원 RSVP 의 서버 검증 경로. 기존에는 회원이 클라이언트에서 직접 create 해
 * 게스트에게만 강제되던 정원(capacity)·마감 검사를 완전히 우회했다.
 * Admin 트랜잭션으로 마감·정원·중복을 검사한 뒤 생성/갱신한다.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let body: { eventId?: string; status?: string; companions?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const eventId = (body.eventId ?? "").trim();
  const status = (body.status ?? "").trim();
  if (!eventId || !["attending", "not_attending", "undecided"].includes(status)) {
    return NextResponse.json({ error: "eventId·status 가 올바르지 않습니다." }, { status: 400 });
  }
  // G6(2026-07-08): 동반인 수(0~9 정수). 참석이 아닐 땐 0 으로 강제.
  if (body.companions !== undefined && (!Number.isInteger(body.companions) || body.companions < 0 || body.companions > 9)) {
    return NextResponse.json({ error: "동반인 수는 0~9 사이여야 합니다." }, { status: 400 });
  }
  const companions = status === "attending" ? (body.companions ?? 0) : 0;

  try {
    const db = getAdminDb();
    const nowIso = new Date().toISOString();
    const rsvpCol = db.collection("networking_rsvps");

    type RsvpDoc = { status?: string; companions?: number; createdAt?: string; userId?: string };
    const seatsOf = (d: RsvpDoc) => 1 + (d.companions ?? 0);

    const result = await db.runTransaction(async (tx) => {
      const evSnap = await tx.get(db.collection("networking_events").doc(eventId));
      if (!evSnap.exists) return { error: "행사를 찾을 수 없습니다.", status: 404 };
      const ev = { id: evSnap.id, ...evSnap.data() } as NetworkingEvent;
      if (isRsvpClosed(ev, nowIso)) return { error: "신청이 마감되었습니다.", status: 400 };

      // 정원 판정과 승격을 한 번에 처리하기 위해 이벤트의 전체 RSVP 를 읽는다(트랜잭션 read).
      const allSnap = await tx.get(rsvpCol.where("eventId", "==", eventId).limit(1000));
      const mine = allSnap.docs.find((d) => (d.data() as RsvpDoc).userId === auth.id);
      const cap = typeof ev.capacity === "number" && ev.capacity > 0 ? ev.capacity : null;

      // 본인 제외 현재 참석 좌석 합계
      const attendingSeats = allSnap.docs
        .filter((d) => d.id !== mine?.id && (d.data() as RsvpDoc).status === "attending")
        .reduce((sum, d) => sum + seatsOf(d.data() as RsvpDoc), 0);

      // G2(2026-07-08): 참석 요청이 정원을 넘기면 409 대신 대기자(waitlisted)로 저장한다.
      // status 는 위에서 attending/not_attending/undecided 중 하나로 검증됨.
      let effectiveStatus: RsvpStatus = status as RsvpStatus;
      if (status === "attending" && cap !== null && attendingSeats + 1 + companions > cap) {
        effectiveStatus = "waitlisted";
      }

      if (mine) {
        tx.update(mine.ref, { status: effectiveStatus, companions, respondedAt: nowIso, updatedAt: nowIso });
      } else {
        tx.create(rsvpCol.doc(), {
          eventId,
          userId: auth.id,
          displayName: auth.name ?? "회원",
          status: effectiveStatus,
          companions,
          respondedAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }

      // 대기 순번(신규/기존) — waitlisted 인 경우 createdAt 오름차순에서 내 위치
      let waitlistPosition: number | null = null;
      if (effectiveStatus === "waitlisted") {
        const myCreatedAt = mine ? ((mine.data() as RsvpDoc).createdAt ?? nowIso) : nowIso;
        const ahead = allSnap.docs.filter((d) => {
          if (d.id === mine?.id) return false;
          const w = d.data() as RsvpDoc;
          return w.status === "waitlisted" && (w.createdAt ?? "") <= myCreatedAt;
        }).length;
        waitlistPosition = ahead + 1;
      }

      // G2 승격: 본인 변경으로 참석 좌석이 줄어 빈자리가 생기면 waitlist 를 createdAt 최선순으로 채운다.
      // (동일 트랜잭션 내 read 로 확보한 문서만 승격 — FIFO 공정성 위해 안 맞으면 중단)
      const promoted: { userId?: string; isGuest?: boolean }[] = [];
      if (cap !== null && effectiveStatus !== "attending") {
        let free = cap - attendingSeats; // 본인은 이제 참석이 아니므로 좌석 미점유
        const waitlisted = allSnap.docs
          .filter((d) => d.id !== mine?.id && (d.data() as RsvpDoc).status === "waitlisted")
          .sort((a, b) =>
            ((a.data() as RsvpDoc).createdAt ?? "").localeCompare((b.data() as RsvpDoc).createdAt ?? ""),
          );
        for (const w of waitlisted) {
          const wd = w.data() as RsvpDoc & { isGuest?: boolean };
          const need = seatsOf(wd);
          if (need <= free) {
            tx.update(w.ref, { status: "attending", updatedAt: nowIso });
            free -= need;
            promoted.push({ userId: wd.userId, isGuest: wd.isGuest });
          } else {
            break; // 최선순이 못 들어가면 뒤 순번도 건너뛰지 않는다(순번 보존)
          }
        }
      }

      return {
        ok: true,
        effectiveStatus,
        waitlistPosition,
        promoted,
        eventTitle: ev.title,
        visibility: ev.visibility ?? "public",
      };
    });

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    // 승격된 회원(userId 보유)에게 인앱 알림 — 게스트는 인앱 계정이 없어 스킵(콘솔 명단에 참석으로 표시).
    const promotedMembers = (result.promoted ?? []).filter((p) => p.userId);
    if (promotedMembers.length > 0) {
      let link = "/gatherings";
      if (result.visibility === "private") {
        const tokenSnap = await db
          .collection("networking_event_tokens")
          .where("eventId", "==", eventId)
          .limit(1)
          .get();
        link = tokenSnap.empty ? "/gatherings" : `/gatherings/p/${tokenSnap.docs[0].id}`;
      }
      const notifNow = new Date().toISOString();
      await Promise.all(
        promotedMembers.map((p) =>
          db.collection("notifications").add({
            userId: p.userId,
            type: "networking_reminder",
            title: "대기자 참석 확정",
            message: `「${result.eventTitle}」 대기자에서 참석 확정되었습니다.`,
            link,
            refId: eventId,
            read: false,
            createdAt: notifNow,
          }),
        ),
      );
    }

    return NextResponse.json({
      ok: true,
      waitlisted: result.effectiveStatus === "waitlisted",
      waitlistPosition: result.waitlistPosition,
    });
  } catch (err) {
    console.error("[/api/networking/rsvp]", err);
    return NextResponse.json({ error: "신청 처리에 실패했습니다." }, { status: 500 });
  }
}
