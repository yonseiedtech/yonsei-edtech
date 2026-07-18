"use client";

/**
 * 모임·행사 상세 본문 (공용) — /gatherings/[id] 상세 페이지와 /gatherings/p/[token] 비공개 링크에서 공용 사용.
 * 목록/상세 분리 개편(2026-07-19)으로 기존 GatheringEventCard 의 무거운 본문(일정 투표·참석자 명단·
 * 세부 프로그램·후기·RSVP 액션)을 이 컴포넌트로 이전했다. 목록 카드는 핵심 요약만 남기고 이 상세로 진입한다.
 *
 * 재사용 원칙: RSVP·게스트 신청·투표 공유 로직을 복제하지 않고 여기 한 곳에 모아 두 진입점이 공유한다.
 * 집계·게스트 공유(p/[token]) 동작은 불변 — NetworkingPoll·AttendeeRoster 등 기존 컴포넌트를 그대로 배치한다.
 */

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  MapPin,
  Wallet,
  Clock,
  Check,
  Camera,
  Lock,
  Copy,
  Share2,
  Settings2,
  UserCircle2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { eventTokensApi, profilesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  NETWORKING_EVENT_TYPE_LABELS,
  RSVP_STATUS_LABELS,
  DUE_STATUS_LABELS,
  type NetworkingEvent,
  type NetworkingRsvp,
  type NetworkingDue,
  type RsvpStatus,
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
import NetworkingProgramManager from "@/features/networking/NetworkingProgramManager";
import NetworkingPoll from "@/features/networking/NetworkingPoll";
import AttendeeRoster from "@/features/networking/AttendeeRoster";
import EventReviews from "@/features/networking/EventReviews";
import EventEditorForm from "@/features/networking/EventEditorForm";

const RSVP_OPTIONS: RsvpStatus[] = ["attending", "not_attending", "undecided"];

export interface GatheringDetailProps {
  ev: NetworkingEvent;
  nowIso: string;
  isMember: boolean;
  myRsvp?: NetworkingRsvp;
  myDue?: NetworkingDue;
  album?: PhotoAlbum;
  onChanged: () => void;
  past?: boolean;
  /** staff 이상 — 비공개 배지 + 공유 링크 복사 + 설정 편집 노출 */
  canManage?: boolean;
}

export default function GatheringDetail({
  ev,
  nowIso,
  isMember,
  myRsvp,
  myDue,
  album,
  onChanged,
  past,
  canManage,
}: GatheringDetailProps) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [companions, setCompanions] = useState(myRsvp?.companions ?? 0);
  const [guestCompanions, setGuestCompanions] = useState(0);
  const [waitlistPos, setWaitlistPos] = useState<number | null>(null);
  const [guestManageLink, setGuestManageLink] = useState<string | null>(null);
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

  // 주최자 표시: hostName 우선, 없으면 생성자(createdBy) 프로필명으로 폴백.
  const { data: organizer } = useQuery({
    queryKey: ["networking-event-organizer", ev.createdBy],
    queryFn: async () => {
      try {
        return await profilesApi.get(ev.createdBy);
      } catch {
        return null;
      }
    },
    enabled: !ev.hostName && !!ev.createdBy,
    staleTime: 5 * 60_000,
  });
  const organizerName = ev.hostName || organizer?.name || "운영진";

  // 공유 토큰 — networking_event_tokens 매핑에서 조회(staff 만 list 가능), 레거시 shareToken 폴백.
  const { data: tokenMapping } = useQuery({
    queryKey: ["networking-event-token", ev.id],
    queryFn: async () => (await eventTokensApi.listByEvent(ev.id)).data[0] ?? null,
    enabled: !!canManage && isPrivate,
    staleTime: 5 * 60_000,
  });
  const shareToken = tokenMapping?.id ?? ev.shareToken;

  async function copyShareLink() {
    if (!shareToken) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/gatherings/p/${shareToken}`);
      toast.success("공유 링크를 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }

  // 일정 투표 "가능 일정 종합" 공유 — 비로그인 열람 가능한 공개 종합 페이지(/gatherings/poll/[id]).
  async function sharePollSummary() {
    const url = `${window.location.origin}/gatherings/poll/${ev.id}`;
    const title = `「${ev.title}」 일정 투표 현황`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("종합 링크를 복사했습니다. 카카오톡·SNS에 붙여넣어 공유하세요.");
    } catch {
      toast.error("공유에 실패했습니다.");
    }
  }

  // 게스트가 로그인 없이 학번·이름으로 투표할 수 있는 링크 공유. 목록/상세 분리 후엔 상세 URL 을 공유한다.
  async function sharePollVote() {
    const url = `${window.location.origin}/gatherings/${ev.id}`;
    const title = `「${ev.title}」 일정 투표`;
    const deadlineLabel = ev.pollDeadline ? formatEventDate(ev.pollDeadline) : null;
    const text = [
      title,
      "학번과 이름으로 일정 투표에 참여해 주세요.",
      deadlineLabel ? `투표 마감: ${deadlineLabel}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("투표 링크를 복사했습니다. 카카오톡·SNS에 붙여넣어 공유하세요.");
    } catch {
      toast.error("공유에 실패했습니다.");
    }
  }

  async function setMemberRsvp(status: RsvpStatus, comp?: number) {
    if (!user || busy) return;
    setBusy(true);
    const r = await submitMemberRsvp(ev.id, status, comp ?? companions);
    if (!r.ok) {
      toast.error(r.error ?? "신청에 실패했습니다.");
    } else if (r.waitlisted) {
      setWaitlistPos(r.waitlistPosition ?? null);
      toast.success(
        r.waitlistPosition
          ? `정원이 가득 차 대기자로 등록했습니다 (대기 ${r.waitlistPosition}번).`
          : "정원이 가득 차 대기자로 등록했습니다.",
      );
      onChanged();
    } else {
      setWaitlistPos(null);
      toast.success(`'${RSVP_STATUS_LABELS[status]}'(으)로 신청했습니다.`);
      onChanged();
    }
    setBusy(false);
  }

  async function withdrawRsvp() {
    if (!user || busy || !myRsvp) return;
    if (!window.confirm("참석 신청을 철회하시겠어요? 참석자 명단에서 삭제됩니다.")) return;
    setBusy(true);
    const r = await submitMemberRsvp(ev.id, "withdraw");
    if (!r.ok) {
      toast.error(r.error ?? "철회에 실패했습니다.");
    } else {
      setWaitlistPos(null);
      toast.success("참석 신청을 철회했습니다.");
      onChanged();
    }
    setBusy(false);
  }

  async function copyGuestLink() {
    if (!guestManageLink) return;
    try {
      await navigator.clipboard.writeText(guestManageLink);
      toast.success("확인 링크를 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다. 링크를 직접 선택해 복사해주세요.");
    }
  }

  async function submitGuest() {
    if (busy) return;
    if (!guestName.trim() || !guestContact.trim()) {
      toast.error("이름과 연락처를 입력해주세요.");
      return;
    }
    if (closed) {
      toast.error("신청이 마감되었습니다.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/networking/rsvp-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: ev.id,
          guestName: guestName.trim(),
          guestContact: guestContact.trim(),
          companions: guestCompanions,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "신청에 실패했습니다.");
      }
      const j = (await res.json().catch(() => ({}))) as {
        waitlisted?: boolean;
        waitlistPosition?: number | null;
        manageToken?: string;
      };
      if (j.waitlisted) {
        toast.success(
          j.waitlistPosition
            ? `정원이 가득 차 대기자로 접수되었습니다 (대기 ${j.waitlistPosition}번).`
            : "정원이 가득 차 대기자로 접수되었습니다.",
        );
      } else {
        toast.success("게스트 참석 신청이 접수되었습니다.");
      }
      if (j.manageToken) {
        setGuestManageLink(`${window.location.origin}/gatherings?guest_rsvp=${j.manageToken}`);
      }
      setGuestOpen(false);
      setGuestName("");
      setGuestContact("");
      setGuestCompanions(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "신청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      {/* ── 헤더: 배지 + 제목 + 관리 액션 ── */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", EVENT_TYPE_COLORS[ev.type])}>
              {NETWORKING_EVENT_TYPE_LABELS[ev.type]}
            </span>
            {isPrivate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[11px] font-medium text-info">
                <Lock size={10} /> 비공개
              </span>
            )}
            {ev.status === "cancelled" && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">취소됨</span>
            )}
            {!past && ev.status !== "cancelled" && closed && !isPollPending && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">신청 마감</span>
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
          <h1 className="mt-1.5 text-lg font-bold leading-snug sm:text-xl">{ev.title}</h1>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditOpen(true)}>
              <Settings2 size={12} className="mr-1" /> 설정 편집
            </Button>
            {isPrivate && shareToken && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={copyShareLink}>
                <Copy size={12} className="mr-1" /> 링크 복사
              </Button>
            )}
          </div>
        )}
      </div>

      {canManage && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent showCloseButton={false} className="sm:max-w-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>모임 설정 편집</DialogTitle>
            </DialogHeader>
            <EventEditorForm
              initial={ev}
              onClose={() => setEditOpen(false)}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["networking-events"] });
                qc.invalidateQueries({ queryKey: ["networking-event-token", ev.id] });
                onChanged();
                setEditOpen(false);
              }}
              createdByUid={user?.id ?? ""}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* ── 모임 정보 ── */}
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {isPollPending ? (
          <span className="inline-flex items-center gap-1 font-medium text-info">
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
      </dl>

      {/* 주최자 */}
      <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <UserCircle2 size={13} />
        주최 <span className="font-medium text-foreground">{organizerName}</span>
      </div>

      {ev.description && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{ev.description}</p>
      )}

      {album && (
        <Link
          href={`/gallery?album=${album.id}`}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Camera size={12} />
          행사 사진 보기{album.photoCount > 0 ? ` (${album.photoCount}장)` : ""}
        </Link>
      )}

      {/* 내 회비 상태 */}
      {myDue && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1 text-xs">
          <Wallet size={12} />
          내 회비:{" "}
          <span className={cn(
            "font-semibold",
            myDue.status === "paid" ? "text-success" : myDue.status === "unpaid" ? "text-warning" : "text-muted-foreground",
          )}>
            {DUE_STATUS_LABELS[myDue.status]}
          </span>
          {myDue.status !== "exempt" && <span className="text-muted-foreground">({formatWon(myDue.amount)})</span>}
        </div>
      )}

      {/* ── 일정 조율 투표 (미확정 poll) ── */}
      {isPollPending && ev.status !== "cancelled" && (
        <section className="mt-5 border-t pt-4">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays size={15} className="text-primary" /> 일정 조율 투표
          </h2>
          {!isPrivate && (
            <div className="mb-2 flex flex-wrap justify-end gap-2">
              {!pollClosed && (
                <Button size="sm" className="h-7 text-xs" onClick={sharePollVote}>
                  <Share2 size={12} className="mr-1" /> 투표 링크 공유
                </Button>
              )}
              {canManage && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={sharePollSummary}>
                  <Share2 size={12} className="mr-1" /> 종합 공유
                </Button>
              )}
            </div>
          )}
          <NetworkingPoll event={ev} canEdit={false} />
        </section>
      )}

      {/* ── 참석 신청 ── */}
      {!past && ev.status !== "cancelled" && !isPollPending && (
        <section className="mt-5 border-t pt-4">
          <h2 className="mb-2 text-sm font-semibold">참석 신청</h2>
          {isMember ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {RSVP_OPTIONS.map((s) => {
                  const active = myRsvp?.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={busy || closed}
                      onClick={() => setMemberRsvp(s)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {active && <Check size={11} />}
                      {RSVP_STATUS_LABELS[s]}
                    </button>
                  );
                })}
                {closed && <span className="text-[11px] text-muted-foreground">신청이 마감되었습니다.</span>}
              </div>
              {myRsvp?.status === "waitlisted" && (
                <p className="inline-flex items-center gap-1 rounded-lg bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
                  정원이 가득 차 대기자 명단에 있습니다
                  {waitlistPos ? ` (대기 ${waitlistPos}번)` : ""}. 자리가 나면 자동으로 참석 확정됩니다.
                </p>
              )}
              {myRsvp?.status === "attending" && !closed && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">동반인</span>
                  <select
                    value={companions}
                    disabled={busy}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCompanions(v);
                      setMemberRsvp("attending", v);
                    }}
                    className="rounded-lg border bg-background px-2 py-1 text-xs disabled:opacity-50"
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground">명</span>
                </div>
              )}
              {myRsvp && !closed && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={withdrawRsvp}
                  className="text-[11px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-destructive disabled:opacity-50"
                >
                  신청 철회
                </button>
              )}
            </div>
          ) : closed ? (
            <p className="text-xs text-muted-foreground">신청이 마감되었습니다.</p>
          ) : guestOpen ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">게스트(비회원) 참석 신청</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="이름" className="h-8 max-w-[140px] text-xs" />
                <Input value={guestContact} onChange={(e) => setGuestContact(e.target.value)} placeholder="연락처(전화/이메일)" className="h-8 max-w-[200px] text-xs" />
                <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  동반인
                  <select
                    value={guestCompanions}
                    disabled={busy}
                    onChange={(e) => setGuestCompanions(Number(e.target.value))}
                    className="h-8 rounded-lg border bg-background px-2 text-xs disabled:opacity-50"
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                  명
                </label>
                <Button size="sm" className="h-8 text-xs" disabled={busy} onClick={submitGuest}>신청</Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setGuestOpen(false)}>취소</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setGuestOpen(true)}>
              게스트로 참석 신청
            </Button>
          )}
          {guestManageLink && (
            <div className="mt-2 rounded-lg border border-success/30 bg-success/10 p-2.5 text-[11px]">
              <p className="font-medium text-success">신청이 접수되었습니다.</p>
              <p className="mt-0.5 text-muted-foreground">
                아래 링크로 신청을 확인하거나 취소할 수 있습니다. 재방문 시 필요하니 저장해두세요.
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  readOnly
                  value={guestManageLink}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded border bg-background px-2 py-1 text-[11px]"
                />
                <Button size="sm" variant="outline" className="h-7 shrink-0 text-[11px]" onClick={copyGuestLink}>
                  <Copy size={11} className="mr-1" />복사
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 참여 대상·참석자 명단 ── */}
      {ev.status !== "cancelled" && !isPollPending && (
        <section className="mt-5 border-t pt-4">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Users size={15} className="text-primary" /> 참여 대상·참석자
          </h2>
          <AttendeeRoster eventId={ev.id} myRsvp={myRsvp} onChanged={onChanged} />
        </section>
      )}

      {/* 행사 후기 (지난 행사만) */}
      {past && ev.status !== "cancelled" && (
        <section className="mt-5 border-t pt-4">
          <EventReviews eventId={ev.id} myRsvp={myRsvp} />
        </section>
      )}

      {/* 세부 프로그램 (회원 읽기) */}
      <section className="mt-5 border-t pt-4">
        <NetworkingProgramManager eventId={ev.id} canEdit={false} />
      </section>
    </article>
  );
}
