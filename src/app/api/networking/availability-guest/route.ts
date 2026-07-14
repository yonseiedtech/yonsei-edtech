import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { buildCandidateSlots, eventPollSlots } from "@/features/networking/networking-utils";
import type { NetworkingEvent } from "@/types";

/**
 * POST /api/networking/availability-guest (비로그인 일정 투표)
 *
 * 게스트(비회원)도 이름+학번만으로 poll 행사의 가능 시간대를 투표할 수 있게 한다.
 * networking_availability 는 rules 가 인증을 요구(read/write)하므로 회원 경로처럼
 * 클라이언트 SDK 로는 쓸 수 없다 — 서버가 admin SDK 로 대신 저장하고 검증한다
 * (rsvp-guest 라우트와 동일한 컨벤션: rate-limit · 이벤트 재검증 · 화이트리스트 · 멱등 upsert).
 *
 * 강제 규칙
 *  - IP rate-limit: 시간당 20회 (토글 debounce 저장이 반복되므로 rsvp 보다 여유)
 *  - schedulingMode 가 poll 이 아니면 400 (일정 고정 행사는 투표 대상 아님)
 *  - pollDeadline 지났으면 403
 *  - availableSlots 는 서버가 재계산한 후보 슬롯(buildCandidateSlots)에 전부 포함돼야 함
 *  - 멱등 키 eventId + studentId: 기존 게스트 응답 있으면 availableSlots 갱신
 */

const STUDENT_ID_RE = /^[0-9-]{1,20}$/;

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(`availability_guest_${getClientId(req)}`, { limit: 20, windowSec: 3600 });
  if (limited) return limited;

  let body: { eventId?: string; guestName?: string; studentId?: string; availableSlots?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const eventId = (body.eventId ?? "").trim();
  const guestName = (body.guestName ?? "").trim();
  const studentId = (body.studentId ?? "").trim();
  const availableSlots = Array.isArray(body.availableSlots) ? body.availableSlots : null;
  if (!eventId || !guestName || !studentId || !availableSlots) {
    return NextResponse.json({ error: "이름과 학번을 입력해주세요." }, { status: 400 });
  }
  if (guestName.length > 30) {
    return NextResponse.json({ error: "이름이 너무 깁니다." }, { status: 400 });
  }
  if (!STUDENT_ID_RE.test(studentId)) {
    return NextResponse.json({ error: "학번 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (availableSlots.length > 200) {
    return NextResponse.json({ error: "선택한 시간대가 너무 많습니다." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const evSnap = await db.collection("networking_events").doc(eventId).get();
    if (!evSnap.exists) {
      return NextResponse.json({ error: "행사를 찾을 수 없습니다." }, { status: 404 });
    }
    const ev = { id: evSnap.id, ...evSnap.data() } as NetworkingEvent;

    if (ev.schedulingMode !== "poll") {
      return NextResponse.json({ error: "일정 투표 중인 행사가 아닙니다." }, { status: 400 });
    }
    if (ev.pollDeadline && new Date(ev.pollDeadline).getTime() < Date.now()) {
      return NextResponse.json({ error: "투표가 마감되었습니다." }, { status: 403 });
    }

    // 서버 측 화이트리스트 — 선택 슬롯이 모두 후보 슬롯에 포함돼야 함
    // (effectivePollTimeSlots 폴백 포함 — 시간대 미설정 이벤트도 기본 시간대로 검증)
    const { weekday, weekend } = eventPollSlots(ev);
    const candidateSlots = new Set(
      buildCandidateSlots(ev.pollPeriodStart ?? "", ev.pollPeriodEnd ?? "", weekday, weekend),
    );
    if (candidateSlots.size === 0) {
      return NextResponse.json({ error: "후보 기간이 설정되지 않았습니다." }, { status: 400 });
    }
    if (availableSlots.some((s) => !candidateSlots.has(s))) {
      return NextResponse.json({ error: "선택할 수 없는 시간대가 포함되어 있습니다." }, { status: 400 });
    }

    const availCol = db.collection("networking_availability");
    const now = new Date().toISOString();

    // 멱등 upsert — eventId + studentId (게스트) 중복이면 갱신
    const existing = await availCol
      .where("eventId", "==", eventId)
      .where("isGuest", "==", true)
      .where("studentId", "==", studentId)
      .limit(1)
      .get();

    if (!existing.empty) {
      await existing.docs[0].ref.update({
        userName: `${guestName}(비회원)`,
        guestName,
        availableSlots,
        updatedAt: now,
      });
    } else {
      await availCol.add({
        eventId,
        userId: "",
        userName: `${guestName}(비회원)`,
        guestName,
        studentId,
        isGuest: true,
        availableSlots,
        createdAt: now,
        updatedAt: now,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/networking/availability-guest]", err);
    return NextResponse.json({ error: "투표 저장에 실패했습니다." }, { status: 500 });
  }
}
