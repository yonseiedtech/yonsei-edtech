import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import { isRsvpClosed } from "@/features/networking/networking-helpers";
import type { NetworkingEvent } from "@/types";

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

    const result = await db.runTransaction(async (tx) => {
      const evSnap = await tx.get(db.collection("networking_events").doc(eventId));
      if (!evSnap.exists) return { error: "행사를 찾을 수 없습니다.", status: 404 };
      const ev = { id: evSnap.id, ...evSnap.data() } as NetworkingEvent;
      if (isRsvpClosed(ev, nowIso)) return { error: "신청이 마감되었습니다.", status: 400 };

      const mineSnap = await tx.get(
        rsvpCol.where("eventId", "==", eventId).where("userId", "==", auth.id).limit(1),
      );
      const mine = mineSnap.docs[0];

      // 정원 검사 — attending 으로 들어올 때만, 본인 기존 문서는 제외하고 합산
      if (status === "attending" && typeof ev.capacity === "number" && ev.capacity > 0) {
        const attSnap = await tx.get(
          rsvpCol.where("eventId", "==", eventId).where("status", "==", "attending").limit(1000),
        );
        const headcount = attSnap.docs
          .filter((d) => d.id !== mine?.id)
          .reduce((sum, d) => sum + 1 + ((d.data() as { companions?: number }).companions ?? 0), 0);
        // 본인 인원(1 + 동반인)까지 포함해 초과 여부 판정 (G6: 동반인 반영)
        if (headcount + 1 + companions > ev.capacity) return { error: "정원이 가득 찼습니다.", status: 409 };
      }

      if (mine) {
        tx.update(mine.ref, { status, companions, respondedAt: nowIso, updatedAt: nowIso });
      } else {
        tx.create(rsvpCol.doc(), {
          eventId,
          userId: auth.id,
          displayName: auth.name ?? "회원",
          status,
          companions,
          respondedAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
      return { ok: true };
    });

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/networking/rsvp]", err);
    return NextResponse.json({ error: "신청 처리에 실패했습니다." }, { status: 500 });
  }
}
