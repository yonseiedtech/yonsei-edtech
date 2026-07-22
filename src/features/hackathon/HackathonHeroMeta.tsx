"use client";

/**
 * HackathonHeroMeta — 해커톤 히어로 섹션 (클라이언트 컴포넌트, 2026-07-22)
 *
 * useHackathonEvent() 로 Firestore 이벤트 레코드를 실시간 반영한다.
 * 로딩 중에는 config 상수와 동일한 폴백을 즉시 표시 — 깜빡임 없음.
 * 원래 server component(hackathon/page.tsx) 에 있던 히어로 JSX 를 이 파일로 이전.
 */

import { CalendarDays, Clock, MapPin, Sparkles } from "lucide-react";
import { formatDday } from "@/lib/dday";
import HackathonLiveBanner from "./HackathonLiveBanner";
import { useHackathonEvent } from "./useHackathonEvent";

/** "2026-08-22" → "2026. 8. 22." */
function formatKorDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}. ${parseInt(m, 10)}. ${parseInt(d, 10)}.`;
}

export default function HackathonHeroMeta() {
  const { event } = useHackathonEvent();
  const dday = formatDday(event.date);

  return (
    <section className="overflow-hidden rounded-3xl border bg-primary/5 p-6 sm:p-10">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Sparkles size={12} />
        {event.tagline}
      </div>
      <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
        {event.title}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {event.intro}
      </p>

      {/* 핵심 메타 */}
      <div className="mt-6 flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-sm font-medium">
          <CalendarDays size={15} className="text-primary" />
          {formatKorDate(event.date)} ({event.dayLabel})
          {dday && (
            <span
              className={`ml-1 rounded-md px-1.5 py-0.5 text-xs font-bold ${
                dday.diffDays <= 3
                  ? "bg-destructive text-destructive-foreground"
                  : dday.diffDays <= 7
                    ? "bg-warning text-white"
                    : "bg-primary text-primary-foreground"
              }`}
            >
              {dday.label}
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-sm font-medium">
          <Clock size={15} className="text-primary" />
          {event.timeLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-sm font-medium">
          <MapPin size={15} className="text-primary" />
          {event.place}
        </span>
      </div>

      {/* 하이라이트 */}
      <ul className="mt-6 space-y-2">
        {event.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2 text-sm text-foreground">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
            {h}
          </li>
        ))}
      </ul>

      {/* 참가 현황 카운터 + 제출 마감 D-day 강조 */}
      <HackathonLiveBanner />
    </section>
  );
}
