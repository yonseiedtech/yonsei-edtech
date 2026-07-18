"use client";

import Link from "next/link";
import { CalendarPlus, CalendarDays, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Seminar } from "@/types";

/** "HH:MM" + N시간 → "HHMMSS" */
function addHoursToTime(timeStr: string, hours: number): string {
  const [hh, mm] = timeStr.split(":").map(Number);
  const endHh = String(((hh ?? 0) + hours) % 24).padStart(2, "0");
  const endMm = String(mm ?? 0).padStart(2, "0");
  return `${endHh}${endMm}00`;
}

/** 다음날(YYYYMMDD) — 종일 행사 end */
function nextDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Google Calendar 템플릿 링크 (공개 정보만) */
function buildGoogleCalendarUrl(seminar: Seminar): string {
  const dateOnly = seminar.date.replace(/-/g, "");
  let dates: string;
  if (seminar.time) {
    const start = `${dateOnly}T${seminar.time.replace(/:/g, "").padEnd(6, "0").slice(0, 6)}`;
    const end = `${dateOnly}T${addHoursToTime(seminar.time, 2)}`;
    dates = `${start}/${end}`;
  } else {
    dates = `${dateOnly}/${nextDay(seminar.date)}`;
  }

  const speakerName = seminar.speakers?.[0]?.name ?? seminar.speaker ?? "";
  const details = [
    seminar.description,
    speakerName ? `연사: ${speakerName}` : null,
    seminar.isOnline && seminar.onlineUrl ? `온라인: ${seminar.onlineUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const location = seminar.isOnline ? "온라인" : seminar.location;

  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `[세미나] ${seminar.title}`,
    dates,
    ctz: "Asia/Seoul",
  });
  if (details) p.set("details", details);
  if (location) p.set("location", location);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/**
 * 신청 완료 상태에서 노출되는 캘린더 추가 + 리마인더 안내 블록 (Luma형 원페이지 강화).
 * - 단건 .ics 다운로드 (`/api/seminars/[id]/ics`, 공개 정보만)
 * - Google Calendar 1클릭 추가
 * - 시작 전 알림 안내(기존 seminar-reminder cron 사실 기반) + 알림 설정 딥링크
 */
export default function SeminarCalendarCta({ seminar }: { seminar: Seminar }) {
  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="mb-1 text-sm font-semibold text-foreground">내 캘린더에 추가</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        일정을 캘린더에 저장해 두면 놓치지 않아요.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href={buildGoogleCalendarUrl(seminar)}
          target="_blank"
          rel="noopener noreferrer"
          className="sm:w-auto"
        >
          <Button variant="outline" size="sm" className="w-full gap-1.5 sm:w-auto">
            <CalendarPlus size={15} />
            Google 캘린더에 추가
          </Button>
        </a>
        <a href={`/api/seminars/${seminar.id}/ics`} className="sm:w-auto">
          <Button variant="outline" size="sm" className="w-full gap-1.5 sm:w-auto">
            <CalendarDays size={15} />
            .ics 캘린더 파일
          </Button>
        </a>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5">
        <BellRing size={15} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">
          세미나 3일 전·하루 전·당일 아침에 시작 알림을 보내드려요.{" "}
          <Link href="/mypage?tab=settings" className="font-medium text-primary hover:underline">
            알림 설정
          </Link>
          에서 수신 여부를 바꿀 수 있어요.
        </p>
      </div>
    </div>
  );
}
