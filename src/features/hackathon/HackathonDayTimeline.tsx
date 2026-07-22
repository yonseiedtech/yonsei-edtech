"use client";

/**
 * HackathonDayTimeline — 행사 당일 타임라인 섹션 (클라이언트 컴포넌트, 2026-07-22)
 *
 * useHackathonEvent() 로 Firestore 이벤트 레코드의 timeline 을 실시간 반영한다.
 * 설정이 없으면 config 상수(HACKATHON_TIMELINE) 와 동일하게 동작.
 */

import { Clock } from "lucide-react";
import { useHackathonEvent } from "./useHackathonEvent";

export default function HackathonDayTimeline() {
  const { event } = useHackathonEvent();

  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Clock size={18} className="text-primary" />
        당일 타임라인
        <span className="text-xs font-normal text-muted-foreground">
          (잠정 · 확정 시 갱신)
        </span>
      </h2>
      <ol className="mt-4 space-y-0">
        {event.timeline.map((slot, i) => (
          <li key={`${slot.time}-${i}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              {i < event.timeline.length - 1 && (
                <span className="w-px flex-1 bg-border" />
              )}
            </div>
            <div className="pb-5">
              <span className="text-sm font-bold tabular-nums text-primary">
                {slot.time}
              </span>
              <p className="text-sm text-foreground">{slot.label}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
