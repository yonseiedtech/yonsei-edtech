"use client";

/**
 * 모임·행사 목록 카드 (간소화) — /gatherings 목록 전용.
 * 목록/상세 분리 개편(2026-07-19)으로 무거운 본문(일정 투표·참석자 명단·세부 프로그램·후기·게스트 폼)은
 * 상세 페이지(/gatherings/[id], GatheringDetail)로 이전했다. 카드는 스캔 가능한 핵심 요약만 남긴다:
 * 유형·제목·일시·장소·D-day·내 신청 상태·참여 인원 + (회원) 원탭 참석. 카드 클릭 → 상세로 진입.
 *
 * 상호작용: 카드 전체를 stretched Link(absolute inset)로 상세에 연결하고, 원탭 참여 버튼은
 * z-10 + stopPropagation 으로 링크 이동을 막는다. RSVP 네트워크 호출은 상세와 공유(submitMemberRsvp).
 */

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Wallet, Clock, Check, Lock, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  NETWORKING_EVENT_TYPE_LABELS,
  RSVP_STATUS_LABELS,
  type NetworkingEvent,
  type NetworkingRsvp,
  type NetworkingDue,
  type PhotoAlbum,
} from "@/types";
import {
  EVENT_TYPE_COLORS,
  isRsvpClosed,
  formatEventDate,
  formatWon,
  ddayLabel,
} from "@/features/networking/networking-helpers";
import { submitMemberRsvp } from "@/features/networking/networking-utils";

export interface GatheringEventCardProps {
  ev: NetworkingEvent;
  nowIso: string;
  isMember: boolean;
  myRsvp?: NetworkingRsvp;
  /** @deprecated 상세로 이전 — 목록 호환용으로만 유지(미표시) */
  myDue?: NetworkingDue;
  /** @deprecated 상세로 이전 — 목록 호환용으로만 유지(미표시) */
  album?: PhotoAlbum;
  onChanged: () => void;
  past?: boolean;
  /** staff 이상 — 비공개 배지 노출(관리 액션은 상세에서) */
  canManage?: boolean;
  /** 참석 인원(참석 확정 + 동반인) — /api/networking/attendee-counts 집계 */
  attendeeCount?: number;
}

export default function GatheringEventCard({
  ev,
  nowIso,
  isMember,
  myRsvp,
  onChanged,
  past,
  attendeeCount,
}: GatheringEventCardProps) {
  const [busy, setBusy] = useState(false);
  const closed = isRsvpClosed(ev, nowIso);
  const isPollPending = ev.schedulingMode === "poll" && !ev.startAt;
  const isPrivate = ev.visibility === "private";
  const pollClosed = !!ev.pollDeadline && new Date(ev.pollDeadline).getTime() < Date.now();

  const activeStatus = myRsvp?.status && myRsvp.status !== "not_attending" ? myRsvp.status : null;
  const showMyStatus = !past && ev.status !== "cancelled" && !!activeStatus;
  const dday =
    past || ev.status === "cancelled"
      ? null
      : isPollPending
        ? pollClosed
          ? null
          : ddayLabel(ev.pollDeadline, nowIso)
        : closed
          ? null
          : ddayLabel(ev.rsvpDeadline, nowIso);
  const ddayPrefix = isPollPending ? "투표 " : "신청 ";

  // 원탭 참여: 회원이 아직 응답하지 않은 다가오는 고정일정 모임에서만 노출. 나머지는 상세에서 관리.
  const canQuickJoin =
    isMember && !past && ev.status !== "cancelled" && !isPollPending && !closed && !myRsvp;

  async function quickJoin(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const r = await submitMemberRsvp(ev.id, "attending");
    if (!r.ok) {
      toast.error(r.error ?? "신청에 실패했습니다.");
    } else if (r.waitlisted) {
      toast.success(
        r.waitlistPosition
          ? `정원이 가득 차 대기자로 등록했습니다 (대기 ${r.waitlistPosition}번).`
          : "정원이 가득 차 대기자로 등록했습니다.",
      );
      onChanged();
    } else {
      toast.success("'참석'으로 신청했습니다. 자세한 설정은 상세에서 변경할 수 있어요.");
      onChanged();
    }
    setBusy(false);
  }

  return (
    <article
      className={cn(
        "group relative rounded-2xl border bg-card p-5 shadow-sm transition-shadow",
        past ? "opacity-75" : "hover:shadow-md",
      )}
    >
      {/* stretched link — 카드 전체 클릭 시 상세로 진입 */}
      <Link
        href={`/gatherings/${ev.id}`}
        aria-label={`${ev.title} 상세 보기`}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      />

      <div className="pointer-events-none relative z-[1]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", EVENT_TYPE_COLORS[ev.type])}>
            {NETWORKING_EVENT_TYPE_LABELS[ev.type]}
          </span>
          {isPrivate && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cat-1/10 px-2 py-0.5 text-[11px] font-medium text-cat-1">
              <Lock size={10} /> 비공개
            </span>
          )}
          {/* staff 전체 조회(2026-07-19)로 미발행 이벤트도 목록에 노출 — 발행 상태 구분 배지 */}
          {ev.published === false && (
            <span className="rounded-full border border-dashed border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
              미발행
            </span>
          )}
          {ev.status === "cancelled" && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">취소됨</span>
          )}
          {!past && ev.status !== "cancelled" && closed && !isPollPending && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">신청 마감</span>
          )}
          {isPollPending && ev.status !== "cancelled" && (
            <span className="rounded-full bg-cat-1/10 px-2 py-0.5 text-[11px] font-medium text-cat-1">일정 조율 중</span>
          )}
          {showMyStatus && activeStatus && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <Check size={10} /> 내 신청: {RSVP_STATUS_LABELS[activeStatus]}
            </span>
          )}
          {dday && (
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
              {ddayPrefix}{dday}
            </span>
          )}
        </div>

        <h3 className="mt-1.5 flex items-center gap-1 text-base font-bold leading-snug">
          <span className="min-w-0">{ev.title}</span>
          <ChevronRight size={16} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </h3>

        <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {isPollPending ? (
            <span className="inline-flex items-center gap-1 font-medium text-cat-1">
              <CalendarDays size={13} />일정 조율 중
              {ev.pollPeriodStart && ev.pollPeriodEnd && (
                <span className="text-muted-foreground"> ({ev.pollPeriodStart.slice(5)}~{ev.pollPeriodEnd.slice(5)})</span>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1"><CalendarDays size={13} />{formatEventDate(ev.startAt)}</span>
          )}
          {ev.location && <span className="inline-flex items-center gap-1"><MapPin size={13} />{ev.location}</span>}
          <span className="inline-flex items-center gap-1"><Wallet size={13} />회비 {formatWon(ev.feeAmount)}</span>
          {ev.rsvpDeadline && !past && (
            <span className="inline-flex items-center gap-1"><Clock size={13} />신청마감 {formatEventDate(ev.rsvpDeadline)}</span>
          )}
          {!isPollPending && typeof attendeeCount === "number" && attendeeCount > 0 && (
            <span className="inline-flex items-center gap-1"><Users size={13} />참여 {attendeeCount}명</span>
          )}
        </dl>

        {ev.description && (
          <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{ev.description}</p>
        )}
      </div>

      {/* 원탭 참여 (회원·미응답·다가오는 고정일정) — 링크 위에서 동작하도록 z-10 + stopPropagation */}
      {canQuickJoin && (
        <div className="relative z-10 mt-3">
          <button
            type="button"
            disabled={busy}
            onClick={quickJoin}
            className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Check size={12} /> 참석 신청
          </button>
        </div>
      )}
    </article>
  );
}
