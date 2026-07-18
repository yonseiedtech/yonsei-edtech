import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Seminar } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** YYYY-MM-DD → iCal DATE(YYYYMMDD) */
function toIcsDate(dateStr: string): string {
  return dateStr.replace(/-/g, "").slice(0, 8);
}

/** "HH:MM" → iCal HHMMSS */
function toIcsTime(timeStr: string): string {
  return timeStr.replace(/:/g, "").padEnd(6, "0").slice(0, 6);
}

/** "HH:MM" + N시간 → "HHMMSS" (기본 2시간 행사) */
function addHoursToTime(timeStr: string, hours: number): string {
  const [hh, mm] = timeStr.split(":").map(Number);
  const endHh = String(((hh ?? 0) + hours) % 24).padStart(2, "0");
  const endMm = String(mm ?? 0).padStart(2, "0");
  return `${endHh}${endMm}00`;
}

/** 종일 행사 DTEND(다음날) */
function nextDayIcs(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return toIcsDate(d.toISOString().slice(0, 10));
}

/** iCal 줄 접기 (RFC 5545: 75 옥텟) */
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

/**
 * GET /api/seminars/[id]/ics
 *
 * 단일 세미나 이벤트 .ics 다운로드 (공개 정보만 — PII 없음).
 * 공개 상태(upcoming/ongoing/completed) 세미나만 허용. draft/cancelled 은 404.
 * "내 캘린더에 추가" 1클릭용.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const db = getAdminDb();
    const doc = await db.collection("seminars").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "세미나를 찾을 수 없습니다." }, { status: 404 });
    }

    const s = { id: doc.id, ...doc.data() } as Seminar & { id: string };
    if (!["upcoming", "ongoing", "completed"].includes(s.status) || !s.date) {
      return NextResponse.json({ error: "캘린더에 추가할 수 없는 세미나입니다." }, { status: 404 });
    }

    const dateOnly = toIcsDate(s.date);
    let dtstart: string;
    let dtend: string;
    let allDay = false;

    if (s.time) {
      dtstart = `${dateOnly}T${toIcsTime(s.time)}`;
      dtend = `${dateOnly}T${addHoursToTime(s.time, 2)}`;
    } else {
      dtstart = dateOnly;
      dtend = nextDayIcs(s.date);
      allDay = true;
    }

    const speakerName = s.speakers?.[0]?.name ?? s.speaker ?? "";
    const description = [
      s.description,
      speakerName ? `연사: ${speakerName}` : null,
      s.isOnline && s.onlineUrl ? `온라인: ${s.onlineUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const location = s.isOnline ? "온라인" : s.location;
    const eventUrl = `${_req.nextUrl.origin}/seminars/${s.id}`;

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//연세교육공학회//세미나//KO",
      "X-WR-TIMEZONE:Asia/Seoul",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      foldLine(`UID:seminar-${s.id}@yonsei-edtech`),
      foldLine(`SUMMARY:${escapeIcs(`[세미나] ${s.title}`)}`),
    ];
    if (allDay) {
      lines.push(foldLine(`DTSTART;VALUE=DATE:${dtstart}`));
      lines.push(foldLine(`DTEND;VALUE=DATE:${dtend}`));
    } else {
      lines.push(foldLine(`DTSTART;TZID=Asia/Seoul:${dtstart}`));
      lines.push(foldLine(`DTEND;TZID=Asia/Seoul:${dtend}`));
    }
    if (description) lines.push(foldLine(`DESCRIPTION:${escapeIcs(description)}`));
    if (location) lines.push(foldLine(`LOCATION:${escapeIcs(location)}`));
    lines.push(foldLine(`URL:${eventUrl}`));
    lines.push("END:VEVENT");
    lines.push("END:VCALENDAR");

    const ics = lines.join("\r\n");
    const safeName = s.title.replace(/[^가-힣a-zA-Z0-9]/g, "_").slice(0, 40) || "seminar";

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.ics"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[/api/seminars/[id]/ics]", err);
    return NextResponse.json({ error: "캘린더 생성에 실패했습니다." }, { status: 500 });
  }
}
