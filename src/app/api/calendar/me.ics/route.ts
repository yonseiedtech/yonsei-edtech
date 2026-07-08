import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Seminar } from "@/types";
import type { CourseOffering, CourseEnrollment } from "@/types/courses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** YYYYMMDD 또는 ISO 날짜 문자열을 iCal DATE 형식(YYYYMMDD)으로 변환 */
function toIcsDate(dateStr: string): string {
  return dateStr.replace(/-/g, "").slice(0, 8);
}

/** "HH:MM" 시간 문자열을 iCal HHMMSS 부분으로 변환 */
function toIcsTime(timeStr: string): string {
  return timeStr.replace(/:/g, "").padEnd(6, "0").slice(0, 6);
}

/** iCal 텍스트 줄 접기 (RFC 5545: 75 옥텟 제한) */
function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf-8");
  if (bytes.length <= 75) return line;

  const result: string[] = [];
  let offset = 0;
  let first = true;
  while (offset < bytes.length) {
    const chunk = first ? 75 : 74;
    result.push((first ? "" : " ") + bytes.subarray(offset, offset + chunk).toString("utf-8"));
    offset += chunk;
    first = false;
  }
  return result.join("\r\n");
}

/** iCal 텍스트 이스케이프 */
function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

interface IcsEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  dtstart: string;
  dtend: string;
  allDay?: boolean;
  url?: string;
}

function buildIcsString(calName: string, events: IcsEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//연세교육공학회//개인 캘린더//KO",
    `X-WR-CALNAME:${escapeIcs(calName)}`,
    "X-WR-TIMEZONE:Asia/Seoul",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:${ev.uid}`));
    lines.push(foldLine(`SUMMARY:${escapeIcs(ev.summary)}`));
    if (ev.allDay) {
      lines.push(foldLine(`DTSTART;VALUE=DATE:${ev.dtstart}`));
      lines.push(foldLine(`DTEND;VALUE=DATE:${ev.dtend}`));
    } else {
      lines.push(foldLine(`DTSTART;TZID=Asia/Seoul:${ev.dtstart}`));
      lines.push(foldLine(`DTEND;TZID=Asia/Seoul:${ev.dtend}`));
    }
    if (ev.description) lines.push(foldLine(`DESCRIPTION:${escapeIcs(ev.description)}`));
    if (ev.location) lines.push(foldLine(`LOCATION:${escapeIcs(ev.location)}`));
    if (ev.url) lines.push(foldLine(`URL:${ev.url}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** "HH:MM" + 시간 추가 → "HHMMss" */
function addHoursToTime(timeStr: string, hours: number): string {
  const [hh, mm] = timeStr.split(":").map(Number);
  const endHh = String(((hh ?? 0) + hours) % 24).padStart(2, "0");
  const endMm = String(mm ?? 0).padStart(2, "0");
  return `${endHh}${endMm}00`;
}

/** 날짜 문자열에 1일 추가 → YYYYMMDD */
function nextDayIcs(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return toIcsDate(d.toISOString().slice(0, 10));
}

/**
 * GET /api/calendar/me.ics?token=<calendarToken>
 *
 * 개인 일정 ical 피드:
 *   - 본인이 attendeeIds에 있는 세미나
 *   - 본인이 수강 등록된 수업 (CourseEnrollment → CourseOffering)
 *   - 본인이 참여하는 학술활동 (members/participants)
 *
 * 토큰 기반 인증 (Bearer 헤더 불필요). 마이페이지에서 재발급 가능.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token 파라미터가 필요합니다." }, { status: 400 });
  }

  const origin = req.nextUrl.origin;

  try {
    const db = getAdminDb();

    // 토큰으로 사용자 조회
    const userSnap = await db
      .collection("users")
      .where("calendarToken", "==", token)
      .limit(1)
      .get();

    if (userSnap.empty) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
    }

    const userDoc = userSnap.docs[0];
    const uid = userDoc.id;
    const userData = userDoc.data();
    const userName: string = userData?.name ?? "회원";

    const events: IcsEvent[] = [];

    // ── 1. 본인 등록 세미나 ──────────────────────────────────────────────
    const semSnap = await db
      .collection("seminars")
      .where("attendeeIds", "array-contains", uid)
      .where("status", "in", ["upcoming", "ongoing", "completed"])
      .orderBy("date", "desc")
      .limit(100)
      .get();

    for (const doc of semSnap.docs) {
      const s = { id: doc.id, ...doc.data() } as Seminar & { id: string };
      if (!s.date) continue;

      const dateOnly = toIcsDate(s.date);
      let dtstart: string;
      let dtend: string;
      let allDay = false;

      if (s.time) {
        const timeStr = toIcsTime(s.time);
        dtstart = `${dateOnly}T${timeStr}`;
        dtend = `${dateOnly}T${addHoursToTime(s.time, 2)}`;
      } else {
        dtstart = dateOnly;
        dtend = nextDayIcs(s.date);
        allDay = true;
      }

      const speakerName = s.speakers?.[0]?.name ?? s.speaker ?? "";
      events.push({
        uid: `seminar-${s.id}-${uid}@yonsei-edtech`,
        summary: `[세미나] ${s.title}`,
        description: [
          s.description,
          speakerName ? `연사: ${speakerName}` : null,
        ].filter(Boolean).join("\n"),
        location: s.isOnline ? "온라인" : s.location,
        dtstart,
        dtend,
        allDay,
        url: `${origin}/seminars/${s.id}`,
      });
    }

    // ── 2. 본인 수강 수업 (CourseEnrollment → CourseOffering) ────────────
    const enrollSnap = await db
      .collection("course_enrollments")
      .where("userId", "==", uid)
      .get();

    if (!enrollSnap.empty) {
      const offeringIds = [...new Set(
        enrollSnap.docs.map((d) => (d.data() as CourseEnrollment).courseOfferingId),
      )];

      // Firestore in 쿼리 10개 제한 → 청크로 분할
      const chunkSize = 10;
      const offeringDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
      for (let i = 0; i < offeringIds.length; i += chunkSize) {
        const chunk = offeringIds.slice(i, i + chunkSize);
        const snap = await db
          .collection("course_offerings")
          .where("__name__", "in", chunk)
          .get();
        offeringDocs.push(...snap.docs);
      }

      for (const doc of offeringDocs) {
        const co = { id: doc.id, ...doc.data() } as CourseOffering & { id: string };
        if (!co.schedule) continue;

        // schedule 필드는 "월 18:30~20:00" 같은 자유 텍스트 — 요일+시간 파싱 시도
        const semesterLabel = co.term === "spring" ? "전기" : co.term === "fall" ? "후기" : co.term;
        events.push({
          uid: `course-${co.id}-${uid}@yonsei-edtech`,
          summary: `[수업] ${co.courseName}`,
          description: [
            co.professor ? `교수: ${co.professor}` : null,
            co.credits ? `학점: ${co.credits}` : null,
            `${co.year}년 ${semesterLabel}`,
          ].filter(Boolean).join("\n"),
          location: co.classroom ?? "",
          // 수업은 반복(RRULE) 없이 단순 참고용 — 학기 시작일 기준 1개 이벤트
          dtstart: co.semesterStartDate
            ? toIcsDate(co.semesterStartDate)
            : `${co.year}0301`,
          dtend: co.semesterStartDate
            ? nextDayIcs(co.semesterStartDate)
            : `${co.year}0302`,
          allDay: true,
          url: `${origin}/courses`,
        });
      }
    }

    // ── 3. 본인 참여 학술활동 ───────────────────────────────────────────
    const actSnap = await db
      .collection("activities")
      .where("members", "array-contains", uid)
      .get();

    for (const doc of actSnap.docs) {
      const a = doc.data() as {
        title?: string;
        date?: string;
        type?: string;
        tags?: string[];
        leader?: string;
      };
      if (!a.date || !a.title) continue;

      const typeLabel =
        a.type === "study" ? "스터디"
        : a.type === "project" ? "프로젝트"
        : a.type === "external" ? "대외활동"
        : "학술활동";

      const dateOnly = toIcsDate(a.date);
      events.push({
        uid: `activity-${doc.id}-${uid}@yonsei-edtech`,
        summary: `[${typeLabel}] ${a.title}`,
        description: (a.tags ?? []).join(", "),
        dtstart: dateOnly,
        dtend: nextDayIcs(a.date),
        allDay: true,
        url: `${origin}/activities/${a.type ?? ""}/${doc.id}`,
      });
    }

    // ── 4. 본인 참석(RSVP) 모임·행사 (Phase 2 네트워킹 트랙 통합) ─────────
    const rsvpSnap = await db
      .collection("networking_rsvps")
      .where("userId", "==", uid)
      .where("status", "==", "attending")
      .get();

    if (!rsvpSnap.empty) {
      const eventIds = [...new Set(
        rsvpSnap.docs.map((d) => (d.data() as { eventId?: string }).eventId).filter(Boolean),
      )] as string[];

      const chunkSize = 10;
      for (let i = 0; i < eventIds.length; i += chunkSize) {
        const chunk = eventIds.slice(i, i + chunkSize);
        const snap = await db
          .collection("networking_events")
          .where("__name__", "in", chunk)
          .get();

        for (const doc of snap.docs) {
          const n = doc.data() as {
            title?: string;
            startAt?: string;
            endAt?: string;
            location?: string;
            description?: string;
            status?: string;
            published?: boolean;
          };
          // poll 미확정(startAt 빈 값)·취소·미게시(published=false) 행사는 제외.
          // visibility="private"(링크 공유 모임)는 의도적으로 포함 — 본인이 RSVP한 개인 캘린더이므로.
          if (!n.title || !n.startAt || n.status === "cancelled" || n.published === false) continue;

          const dateOnly = toIcsDate(n.startAt);
          const hasTime = n.startAt.length >= 16;
          let dtstart: string;
          let dtend: string;
          let allDay = false;

          if (hasTime) {
            const timeStr = toIcsTime(n.startAt.slice(11, 16));
            dtstart = `${dateOnly}T${timeStr}`;
            dtend = n.endAt && n.endAt.length >= 16
              ? `${toIcsDate(n.endAt)}T${toIcsTime(n.endAt.slice(11, 16))}`
              : `${dateOnly}T${addHoursToTime(n.startAt.slice(11, 16), 2)}`;
          } else {
            dtstart = dateOnly;
            dtend = nextDayIcs(n.startAt.slice(0, 10));
            allDay = true;
          }

          events.push({
            uid: `networking-${doc.id}-${uid}@yonsei-edtech`,
            summary: `[모임·행사] ${n.title}`,
            description: n.description ?? "",
            location: n.location,
            dtstart,
            dtend,
            allDay,
            url: `${origin}/gatherings`,
          });
        }
      }
    }

    // 날짜순 정렬
    events.sort((a, b) => a.dtstart.localeCompare(b.dtstart));

    const ics = buildIcsString(`${userName}의 연세교육공학회 일정`, events);

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="yonsei-edtech-me.ics"',
        "Cache-Control": "private, max-age=1800",
      },
    });
  } catch (err) {
    console.error("[/api/calendar/me.ics]", err);
    return NextResponse.json({ error: "개인 캘린더 생성에 실패했습니다." }, { status: 500 });
  }
}
