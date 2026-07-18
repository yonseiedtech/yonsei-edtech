"use client";

/**
 * 모임·행사 카드 (공용) — /gatherings 목록과 /gatherings/p/[token] 비공개 링크 페이지에서 공용 사용.
 * 참석 신청(회원 RSVP·게스트), 일정 조율 투표, 회비 표시, 참석자 명단, 후기, 세부 프로그램을 포함한다.
 * (사이클 73 GatheringsPage 인라인 EventCard 에서 추출.)
 */

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Wallet, Clock, Check, Camera, Lock, Copy, Share2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { eventTokensApi } from "@/lib/bkend";
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
import NetworkingProgramManager from "@/features/networking/NetworkingProgramManager";
import NetworkingPoll from "@/features/networking/NetworkingPoll";
import AttendeeRoster from "@/features/networking/AttendeeRoster";
import EventReviews from "@/features/networking/EventReviews";
import EventEditorForm from "@/features/networking/EventEditorForm";

const RSVP_OPTIONS: RsvpStatus[] = ["attending", "not_attending", "undecided"];

export interface GatheringEventCardProps {
  ev: NetworkingEvent;
  nowIso: string;
  isMember: boolean;
  myRsvp?: NetworkingRsvp;
  myDue?: NetworkingDue;
  album?: PhotoAlbum;
  onChanged: () => void;
  past?: boolean;
  /** staff 이상 — 비공개 배지 + 공유 링크 복사 버튼 노출 */
  canManage?: boolean;
}

export default function GatheringEventCard({
  ev,
  nowIso,
  isMember,
  myRsvp,
  myDue,
  album,
  onChanged,
  past,
  canManage,
}: GatheringEventCardProps) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  // 작업 1(2026-07-14): 운영진(staff+) 기존 모임 설정 편집 다이얼로그
  const [editOpen, setEditOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  // G6(2026-07-08): 동반인 수 입력 — 회원(참석 시)·게스트 신청 폼
  const [companions, setCompanions] = useState(myRsvp?.companions ?? 0);
  const [guestCompanions, setGuestCompanions] = useState(0);
  // G2(2026-07-08): 서버가 정원 초과로 대기자 배정 시 반환하는 순번(제출 직후 표시용)
  const [waitlistPos, setWaitlistPos] = useState<number | null>(null);
  // G7(2026-07-09): 게스트 신청 완료 후 본인 확인·취소 링크(관리 토큰 포함)
  const [guestManageLink, setGuestManageLink] = useState<string | null>(null);
  const closed = isRsvpClosed(ev, nowIso);
  // 미확정 일정 투표 — 날짜가 아직 정해지지 않아 RSVP 대신 투표 UI 노출
  const isPollPending = ev.schedulingMode === "poll" && !ev.startAt;
  const isPrivate = ev.visibility === "private";
  // 작업 2(2026-07-14): 투표 마감 여부 — 마감 지나면 게스트 투표 공유 버튼 숨김
  const pollClosed = !!ev.pollDeadline && new Date(ev.pollDeadline).getTime() < Date.now();

  // 2026-07-18 사용성: 카드 헤더에 내 상태·마감 D-day 를 노출(상세 진입/본문 확인 없이 스캔 가능).
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

  // High-1(2026-07-08): 공유 토큰은 networking_event_tokens 매핑에서 조회(staff 만 list 가능).
  // 레거시 이벤트 문서의 shareToken 필드가 있으면 폴백.
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
  // navigator.share(OS 공유시트 → 카카오톡 포함) 우선, 미지원 시 클립보드 복사 폴백.
  async function sharePollSummary() {
    const url = `${window.location.origin}/gatherings/poll/${ev.id}`;
    const title = `「${ev.title}」 일정 투표 현황`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        // 사용자가 공유시트를 닫으면 조용히 종료, 그 외엔 클립보드로 폴백
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

  // 작업 2(2026-07-14): 게스트가 로그인 없이 학번·이름으로 투표할 수 있는 링크 공유.
  // /gatherings 는 비로그인 접속 가능하고 카드의 NetworkingPoll 이 게스트 투표를 지원하므로,
  // 해당 모임 카드로 앵커되는 URL(#event-{id})을 공유한다(공개 poll 모임 한정).
  // 카카오톡 등에 붙여넣기 좋은 안내 문구를 포함하고, Web Share API 우선·클립보드 폴백.
  async function sharePollVote() {
    const url = `${window.location.origin}/gatherings#event-${ev.id}`;
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
    try {
      // QA-v3: 회원 RSVP 도 서버 검증 경유 — 클라이언트 직접 create 는 정원·마감 검사를 우회했음
      const { auth } = await import("@/lib/firebase");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("로그인이 필요합니다.");
      // G6: 참석일 때만 동반인 수 전송(그 외 상태는 서버가 0 으로 강제)
      const companionsToSend = status === "attending" ? (comp ?? companions) : 0;
      const res = await fetch("/api/networking/rsvp", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: ev.id, status, companions: companionsToSend }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "신청에 실패했습니다.");
      }
      // G2: 정원 초과면 서버가 대기자(waitlisted)로 저장 — 순번 안내
      const data = (await res.json().catch(() => ({}))) as { waitlisted?: boolean; waitlistPosition?: number | null };
      if (data.waitlisted) {
        setWaitlistPos(data.waitlistPosition ?? null);
        toast.success(
          data.waitlistPosition
            ? `정원이 가득 차 대기자로 등록했습니다 (대기 ${data.waitlistPosition}번).`
            : "정원이 가득 차 대기자로 등록했습니다.",
        );
      } else {
        setWaitlistPos(null);
        toast.success(`'${RSVP_STATUS_LABELS[status]}'(으)로 신청했습니다.`);
      }
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "신청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  // G8(2026-07-09): 회원 신청 완전 철회 — rsvp 라우트 status:"withdraw"(문서 삭제 + 대기자 승격).
  async function withdrawRsvp() {
    if (!user || busy || !myRsvp) return;
    if (!window.confirm("참석 신청을 철회하시겠어요? 참석자 명단에서 삭제됩니다.")) return;
    setBusy(true);
    try {
      const { auth } = await import("@/lib/firebase");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("로그인이 필요합니다.");
      const res = await fetch("/api/networking/rsvp", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: ev.id, status: "withdraw" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "철회에 실패했습니다.");
      }
      setWaitlistPos(null);
      toast.success("참석 신청을 철회했습니다.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "철회에 실패했습니다.");
    } finally {
      setBusy(false);
    }
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
      // P1-5: 게스트 신청은 서버 API — 마감·정원·중복·속도 제한을 서버가 강제
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
      // G7: 관리 토큰이 오면 본인 확인·취소 링크를 안내
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
    <article
      id={`event-${ev.id}`}
      className={cn(
        "scroll-mt-20 rounded-2xl border bg-card p-5 shadow-sm transition-shadow",
        past ? "opacity-75" : "hover:shadow-md",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", EVENT_TYPE_COLORS[ev.type])}>
              {NETWORKING_EVENT_TYPE_LABELS[ev.type]}
            </span>
            {isPrivate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200">
                <Lock size={10} /> 비공개
              </span>
            )}
            {ev.status === "cancelled" && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">취소됨</span>
            )}
            {!past && ev.status !== "cancelled" && closed && !isPollPending && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">신청 마감</span>
            )}
            {/* 2026-07-18: 내 참석 상태 배지 — 목록에서 내가 신청했는지 즉시 확인 */}
            {showMyStatus && activeStatus && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <Check size={10} /> 내 신청: {RSVP_STATUS_LABELS[activeStatus]}
              </span>
            )}
            {/* 2026-07-18: 마감 D-day — 절대 날짜만으로는 낮던 긴박감·가시성 보완 */}
            {dday && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                {ddayPrefix}{dday}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-base font-bold leading-snug">{ev.title}</h3>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-1.5">
            {/* 작업 1(2026-07-14): 운영진 기존 모임 설정 편집 진입점 */}
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

      {/* 작업 1(2026-07-14): 설정 편집 다이얼로그 — EventEditorForm(initial=ev) 로 수정 저장 */}
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

      <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {isPollPending ? (
          <span className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
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

      {ev.description && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{ev.description}</p>
      )}

      {/* 행사 사진 보기 (Phase 2-D — 연결된 앨범) */}
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
            myDue.status === "paid" ? "text-emerald-600" : myDue.status === "unpaid" ? "text-amber-600" : "text-muted-foreground",
          )}>
            {DUE_STATUS_LABELS[myDue.status]}
          </span>
          {myDue.status !== "exempt" && <span className="text-muted-foreground">({formatWon(myDue.amount)})</span>}
        </div>
      )}

      {/* 일정 조율 투표 (미확정 poll) */}
      {isPollPending && ev.status !== "cancelled" && (
        <div className="mt-3.5">
          {/* 공개 poll 모임 공유 버튼 (비공개는 게스트가 목록에서 볼 수 없어 앵커/종합이 무의미 → 숨김) */}
          {!isPrivate && (
            <div className="mb-2 flex flex-wrap justify-end gap-2">
              {/* 작업 2(2026-07-14): 게스트 투표 링크 공유 — 마감 전에만, 모두에게 노출 */}
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
        </div>
      )}

      {/* 참석 신청 */}
      {!past && ev.status !== "cancelled" && !isPollPending && (
        <div className="mt-3.5 border-t pt-3">
          {isMember ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-medium text-muted-foreground">참석 신청:</span>
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
              {/* G2: 대기자 안내 — 정원 초과로 대기자 명단에 등록된 상태 */}
              {myRsvp?.status === "waitlisted" && (
                <p className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  정원이 가득 차 대기자 명단에 있습니다
                  {waitlistPos ? ` (대기 ${waitlistPos}번)` : ""}. 자리가 나면 자동으로 참석 확정됩니다.
                </p>
              )}
              {/* G6: 참석 시 동반인 수 입력 — 변경 즉시 서버 반영 */}
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
              {/* G8: 신청 완전 철회 */}
              {myRsvp && !closed && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={withdrawRsvp}
                  className="text-[11px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-rose-600 disabled:opacity-50 dark:hover:text-rose-400"
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
                {/* G6: 게스트 동반인 수 */}
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
          {/* G7: 게스트 신청 완료 후 본인 확인·취소 링크 */}
          {guestManageLink && (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-[11px] dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="font-medium text-emerald-700 dark:text-emerald-200">신청이 접수되었습니다.</p>
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
        </div>
      )}
      {/* 참석자 명단 (Phase 2-D — 옵트인, 참석자끼리) — 지난 모임에서도 팔로업 가능 */}
      {ev.status !== "cancelled" && !isPollPending && (
        <AttendeeRoster eventId={ev.id} myRsvp={myRsvp} onChanged={onChanged} />
      )}

      {/* 행사 후기 (Phase 2-D) — 지난 행사만 */}
      {past && ev.status !== "cancelled" && <EventReviews eventId={ev.id} myRsvp={myRsvp} />}

      {/* 세부 프로그램 (사이클 124 단계2 — 회원 읽기) */}
      <div className="mt-3">
        <NetworkingProgramManager eventId={ev.id} canEdit={false} />
      </div>
    </article>
  );
}
