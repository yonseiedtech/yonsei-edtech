"use client";

/**
 * 내 참여 현황 스트립 (2026-07-18 사용성 개선)
 * 로그인 회원이 다가오는 모임 목록에서 "내가 참여 중인 모임"과 "투표가 진행 중인 모임"을
 * 목록 상단에서 한눈에 보고 해당 카드로 바로 이동(앵커 스크롤)할 수 있게 한다.
 * 데이터는 목록 페이지가 이미 가진 값(upcoming, 내 RSVP 맵)만 사용 — 추가 조회 없음.
 */

import { CalendarCheck, CalendarClock } from "lucide-react";
import { RSVP_STATUS_LABELS, type NetworkingEvent, type NetworkingRsvp } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  /** 다가오는 모임 (목록 페이지의 upcoming) */
  upcoming: NetworkingEvent[];
  /** 이벤트 id → 내 RSVP */
  myRsvpByEvent: Map<string, NetworkingRsvp>;
}

/** 다가오는 모임 중 내가 참석/미정/대기로 신청한 것 */
const MY_ACTIVE_STATUSES = new Set(["attending", "undecided", "waitlisted"]);

export default function MyGatheringsStrip({ upcoming, myRsvpByEvent }: Props) {
  const isPollPending = (e: NetworkingEvent) =>
    e.schedulingMode === "poll" && !e.startAt && e.status !== "cancelled";

  const myEvents = upcoming.filter((e) => {
    if (isPollPending(e)) return false; // 투표 진행 중은 아래 그룹에서 다룸
    const r = myRsvpByEvent.get(e.id);
    return !!r && MY_ACTIVE_STATUSES.has(r.status);
  });
  const pollEvents = upcoming.filter(isPollPending);

  if (myEvents.length === 0 && pollEvents.length === 0) return null;

  function scrollToEvent(id: string) {
    const el = document.getElementById(`event-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section
      aria-label="내 참여 현황"
      className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4"
    >
      {myEvents.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <CalendarCheck size={14} className="text-primary" />
            내가 참여하는 모임 <span className="text-muted-foreground">({myEvents.length})</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {myEvents.map((e) => {
              const status = myRsvpByEvent.get(e.id)!.status;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => scrollToEvent(e.id)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/30 bg-background px-3 py-1 text-xs font-medium transition-colors hover:border-primary/60"
                >
                  <span className="truncate">{e.title}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      status === "attending"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {RSVP_STATUS_LABELS[status]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {pollEvents.length > 0 && (
        <div className={cn(myEvents.length > 0 && "mt-3 border-t border-primary/15 pt-3")}>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <CalendarClock size={14} className="text-primary" />
            일정 투표 중인 모임 <span className="text-muted-foreground">({pollEvents.length})</span>
            <span className="font-normal text-muted-foreground">— 가능한 날짜를 골라주세요</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pollEvents.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => scrollToEvent(e.id)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/30 bg-background px-3 py-1 text-xs font-medium transition-colors hover:border-primary/60"
              >
                <span className="truncate">{e.title}</span>
                <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  투표
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
