import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Seminar } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** YYYYMMDD 또는 ISO 날짜 문자열을 iCal DATE 형식(YYYYMMDD)으로 변환 */
function toIcsDate(dateStr: string): string {
  return dateStr.replace(/-/g, "").slice(0, 8);
}

/** "HH:MM" 시간 문자열을 iCal DATETIME 형식에서 쓸 HHMMSS 부분으로 변환 */
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

/** iCal 텍스트 이스케이프 (콤마, 세미콜론, 역슬래시, 줄바꿈) */
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
  dtstart: string;   // YYYYMMDD 또는 YYYYMMDDTHHmmssZ
  dtend: string;
  url?: string;
}

function buildIcsString(calName: string, events: IcsEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//연세교육공학회//학회 캘린더//KO",
    `X-WR-CALNAME:${escapeIcs(calName)}`,
    "X-WR-TIMEZONE:Asia/Seoul",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:${ev.uid}`));
    lines.push(foldLine(`SUMMARY:${escapeIcs(ev.summary)}`));
    lines.push(foldLine(`DTSTART:${ev.dtstart}`));
    lines.push(foldLine(`DTEND:${ev.dtend}`));
    if (ev.description) lines.push(foldLine(`DESCRIPTION:${escapeIcs(ev.description)}`));
    if (ev.location) lines.push(foldLine(`LOCATION:${escapeIcs(ev.location)}`));
    if (ev.url) lines.push(foldLine(`URL:${ev.url}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * GET /api/calendar/public.ics
 *
 * 공개 세미나(upcoming/ongoing/completed) + 사이트 공지 학사 일정 ical 피드.
 * 인증 불필요. Google Calendar / Apple Calendar URL 구독용.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  try {
    const db = getAdminDb();

    // 공개 세미나 조회 (cancelled 제외)
    const semSnap = await db
      .collection("seminars")
      .where("status", "in", ["upcoming", "ongoing", "completed"])
      .orderBy("date", "desc")
      .limit(200)
      .get();

    const events: IcsEvent[] = [];

    for (const doc of semSnap.docs) {
      const s = { id: doc.id, ...doc.data() } as Seminar & { id: string };
      if (!s.date) continue;

      const dateOnly = toIcsDate(s.date);
      let dtstart: string;
      let dtend: string;

      if (s.time) {
        // 시간 지정된 경우 — Asia/Seoul (UTC+9) 로컬 표기
        const timeStr = toIcsTime(s.time);
        dtstart = `${dateOnly}T${timeStr}`;
        // 기본 2시간 행사
        const [hh, mm] = s.time.split(":").map(Number);
        const endHh = String((hh + 2) % 24).padStart(2, "0");
        const endMm = String(mm ?? 0).padStart(2, "0");
        dtend = `${dateOnly}T${endHh}${endMm}00`;
      } else {
        dtstart = `${dateOnly}`;
        // 종일 행사의 DTEND는 다음날
        const nextDay = new Date(s.date);
        nextDay.setDate(nextDay.getDate() + 1);
        dtend = toIcsDate(nextDay.toISOString().slice(0, 10));
      }

      const speakerName = s.speakers?.[0]?.name ?? s.speaker ?? "";
      const description = [
        s.description,
        speakerName ? `연사: ${speakerName}` : null,
        s.isOnline ? `온라인: ${s.onlineUrl ?? ""}` : null,
      ]
        .filter(Boolean)
        .join("\\n");

      events.push({
        uid: `seminar-${s.id}@yonsei-edtech`,
        summary: `[세미나] ${s.title}`,
        description,
        location: s.isOnline ? "온라인" : s.location,
        dtstart,
        dtend,
        url: `${origin}/seminars/${s.id}`,
      });
    }

    const ics = buildIcsString("연세교육공학회 공개 학회 일정", events);

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="yonsei-edtech-public.ics"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[/api/calendar/public.ics]", err);
    return NextResponse.json({ error: "캘린더 생성에 실패했습니다." }, { status: 500 });
  }
}
