import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { listDates, countRespondersByDate } from "@/features/networking/networking-utils";
import type { NetworkingEvent } from "@/types";

/**
 * GET /api/networking/availability-tally?eventId=... (비로그인 집계 조회)
 *
 * networking_availability 는 rules 가 인증을 요구해 게스트가 클라이언트 SDK 로 못 읽는다.
 * 그 결과 비로그인 방문자는 "현재 최다 가능 일정" 집계가 항상 비어 보였다(사용자 리포트).
 * 이 라우트는 Admin SDK 로 슬롯별 응답 수만 집계해 돌려준다 — 이름·학번 등 개인정보는
 * 절대 노출하지 않는다(카운트만). 회원 뷰(이름 표시)와 달리 게스트에겐 카운트만 제공.
 */
export async function GET(req: NextRequest) {
  const limited = checkRateLimit(`availability_tally_${getClientId(req)}`, { limit: 120, windowSec: 3600 });
  if (limited) return limited;

  const eventId = (req.nextUrl.searchParams.get("eventId") ?? "").trim();
  if (!eventId) {
    return NextResponse.json({ error: "eventId 가 필요합니다." }, { status: 400 });
  }

  try {
    const db = getAdminDb();

    // 기간 내 날짜 집합 — 날짜별 응답자 집계 범위 제한용
    const evSnap = await db.collection("networking_events").doc(eventId).get();
    const ev = evSnap.exists ? (evSnap.data() as NetworkingEvent) : null;
    const periodDates = new Set(listDates(ev?.pollPeriodStart ?? "", ev?.pollPeriodEnd ?? ""));

    const snap = await db
      .collection("networking_availability")
      .where("eventId", "==", eventId)
      .limit(2000)
      .get();

    const slotCounts: Record<string, number> = {};
    const responses: {
      availableSlots?: string[];
      userId?: string;
      studentId?: string;
      guestName?: string;
      userName?: string;
    }[] = [];
    snap.forEach((doc) => {
      const data = doc.data() as {
        availableSlots?: unknown;
        userId?: string;
        studentId?: string;
        guestName?: string;
        userName?: string;
      };
      const slots = Array.isArray(data.availableSlots)
        ? data.availableSlots.filter((s): s is string => typeof s === "string")
        : [];
      for (const s of slots) slotCounts[s] = (slotCounts[s] ?? 0) + 1;
      responses.push({
        availableSlots: slots,
        userId: data.userId,
        studentId: data.studentId,
        guestName: data.guestName,
        userName: data.userName,
      });
    });

    // 날짜별 서로 다른 응답자 수 — candidateSlots 필터 없이(손실 없음)
    const dateResponderCounts = countRespondersByDate(responses, periodDates);

    return NextResponse.json({ slotCounts, dateResponderCounts, responderCount: snap.size });
  } catch (err) {
    console.error("[/api/networking/availability-tally]", err);
    return NextResponse.json({ error: "집계 조회에 실패했습니다." }, { status: 500 });
  }
}
