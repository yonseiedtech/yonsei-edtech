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
  // G8(2026-07-09): "withdraw" = 신청 완전 철회(문서 삭제). 나머지는 상태 갱신.
  if (!eventId || !["attending", "not_attending", "undecided", "withdraw"].includes(status)) {
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

    type RsvpDoc = { status?: string; companions?: number; createdAt?: string; userId?: string; displayName?: string };
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

      // G2/G8 승격: 빈자리(free)를 waitlist 를 createdAt 최선순으로 채운다.
      // (동일 트랜잭션 내 read 로 확보한 문서만 승격 — FIFO 공정성 위해 안 맞으면 중단)
      const promoteFrom = (free: number): { userId?: string; isGuest?: boolean; displayName?: string }[] => {
        const promoted: { userId?: string; isGuest?: boolean; displayName?: string }[] = [];
        if (cap === null) return promoted;
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
            promoted.push({ userId: wd.userId, isGuest: wd.isGuest, displayName: wd.displayName });
          } else {
            break; // 최선순이 못 들어가면 뒤 순번도 건너뛰지 않는다(순번 보존)
          }
        }
        return promoted;
      };

      // G8(2026-07-09): 완전 철회 — 본인 문서 삭제 후 빈자리를 대기자에게 승격.
      if (status === "withdraw") {
        if (mine) tx.delete(mine.ref);
        const promoted = cap !== null ? promoteFrom(cap - attendingSeats) : [];
        return {
          ok: true,
          effectiveStatus: "withdrawn" as const,
          waitlistPosition: null,
          promoted,
          eventTitle: ev.title,
          visibility: ev.visibility ?? "public",
          feeAmount: ev.feeAmount ?? 0,
          autoDues: ev.autoDues === true,
        };
      }

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

      // G2/M2 승격: 본인 변경 후 "실제 빈 좌석"을 계산해 승격한다.
      // M2(2026-07-09): 예전에는 effectiveStatus!=="attending" 일 때만 승격을 돌려, attending 을
      // 유지한 채 동반인만 줄인 경우(예: 4석→1석) 생긴 빈자리가 방치됐다. 본인이 attending 이면
      // 본인 좌석(1+companions)을 차감하고 남는 free>0 이면 승격을 트리거하도록 조건을 바꾼다.
      const mySeats = effectiveStatus === "attending" ? 1 + companions : 0;
      const freeSeats = cap !== null ? cap - attendingSeats - mySeats : 0;
      const promoted = cap !== null && freeSeats > 0 ? promoteFrom(freeSeats) : [];

      return {
        ok: true,
        effectiveStatus,
        waitlistPosition,
        promoted,
        eventTitle: ev.title,
        visibility: ev.visibility ?? "public",
        feeAmount: ev.feeAmount ?? 0,
        autoDues: ev.autoDues === true,
      };
    });

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    // M1(2026-07-09): 참석 이탈(철회·불참·미정·대기 강등) 시 본인 unpaid due 정리.
    // 예전에는 autoDues 로 생성된 회비가 철회/전환 후에도 unpaid 로 남아 마이페이지 미납 배지·
    // D+3 독촉이 참석하지 않는 회원에게 발송되고 통계(회수율·total)도 오염됐다.
    // 삭제 대상은 본인(userId) · unpaid 만 — paid·exempt 는 보존, autoDues 여부와 무관(콘솔 수동 생성분 포함).
    if (result.effectiveStatus !== "attending") {
      const unpaidDues = await db
        .collection("networking_dues")
        .where("eventId", "==", eventId)
        .where("userId", "==", auth.id)
        .where("status", "==", "unpaid")
        .get();
      if (!unpaidDues.empty) {
        const batch = db.batch();
        unpaidDues.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
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

    // G19(2026-07-09): 참석 확정 시 회비 자동 생성(멱등 — 기존 due 있으면 스킵). autoDues + feeAmount>0 일 때만.
    // 대상: 본인이 참석 확정된 경우 + 대기자에서 승격된 회원. 게스트 승격은 콘솔 일괄 생성으로 처리(스코프).
    if (result.autoDues && result.feeAmount > 0) {
      const duesCol = db.collection("networking_dues");
      const ensureDue = async (userId: string, displayName: string) => {
        // 레거시(랜덤 id) due 가 이미 있으면 스킵 — 콘솔 dueByKey(userId 기준 dedupe)와 이중 생성 방지.
        const existing = await duesCol
          .where("eventId", "==", eventId)
          .where("userId", "==", userId)
          .limit(1)
          .get();
        if (!existing.empty) return;
        // M4(2026-07-09): deterministic doc id(`${eventId}__${userId}`) + create 로 멱등 생성.
        // read-then-add 는 원자성이 없어 동시 요청(네트워크 재시도, 본인 확정+승격 경로 중첩)이
        // 각각 existing.empty=true 를 읽고 둘 다 add → 같은 회원 due 2행이 생겼다. deterministic id
        // 로 만들면 동시 create 중 하나만 성공하고 나머지는 ALREADY_EXISTS 로 실패(아래 catch 로 무시).
        const dueNow = new Date().toISOString();
        await duesCol.doc(`${eventId}__${userId}`).create({
          eventId,
          userId,
          displayName,
          amount: result.feeAmount,
          status: "unpaid",
          createdAt: dueNow,
          updatedAt: dueNow,
        });
      };
      const targets: { userId: string; displayName: string }[] = [];
      if (result.effectiveStatus === "attending") {
        targets.push({ userId: auth.id, displayName: auth.name ?? "회원" });
      }
      for (const p of promotedMembers) {
        if (p.userId) targets.push({ userId: p.userId, displayName: p.displayName ?? "회원" });
      }
      await Promise.all(targets.map((t) => ensureDue(t.userId, t.displayName).catch(() => {})));
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
