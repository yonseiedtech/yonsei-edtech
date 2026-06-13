"use client";

/**
 * 모임·네트워킹 (회원용) — 사이클 73
 * 대학원 생활 행사(개강/종강총회·정기/수시모임·MT)의 참석 신청과 내 회비 상태 확인.
 * 로그인 회원은 참석/불참/미정 신청, 비로그인 방문자는 게스트로 신청 가능.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Wallet, Users, Clock, Check } from "lucide-react";
import { toast } from "sonner";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { networkingEventsApi, networkingRsvpsApi, networkingDuesApi } from "@/lib/bkend";
import {
  NETWORKING_EVENT_TYPE_LABELS,
  RSVP_STATUS_LABELS,
  DUE_STATUS_LABELS,
  type NetworkingEvent,
  type NetworkingRsvp,
  type NetworkingDue,
  type RsvpStatus,
} from "@/types";
import {
  EVENT_TYPE_COLORS,
  isPastEvent,
  isRsvpClosed,
  formatEventDate,
  formatWon,
} from "@/features/networking/networking-helpers";

const RSVP_OPTIONS: RsvpStatus[] = ["attending", "not_attending", "undecided"];

export default function GatheringsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const nowIso = new Date().toISOString();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["networking-events"],
    queryFn: async () => (await networkingEventsApi.listPublished()).data as NetworkingEvent[],
    staleTime: 60_000,
  });
  const { data: myRsvps = [] } = useQuery({
    queryKey: ["networking-rsvps", user?.id],
    queryFn: async () => (await networkingRsvpsApi.listByUser(user!.id)).data as NetworkingRsvp[],
    enabled: !!user?.id,
    staleTime: 30_000,
  });
  const { data: myDues = [] } = useQuery({
    queryKey: ["networking-dues", user?.id],
    queryFn: async () => (await networkingDuesApi.listByUser(user!.id)).data as NetworkingDue[],
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const { upcoming, past } = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.startAt.localeCompare(b.startAt));
    return {
      upcoming: sorted.filter((e) => !isPastEvent(e, nowIso) && e.status !== "cancelled"),
      past: sorted.filter((e) => isPastEvent(e, nowIso)).reverse(),
    };
  }, [events, nowIso]);

  const myRsvpByEvent = useMemo(() => {
    const m = new Map<string, NetworkingRsvp>();
    for (const r of myRsvps) m.set(r.eventId, r);
    return m;
  }, [myRsvps]);
  const myDueByEvent = useMemo(() => {
    const m = new Map<string, NetworkingDue>();
    for (const d of myDues) m.set(d.eventId, d);
    return m;
  }, [myDues]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["networking-rsvps", user?.id] });
  }

  return (
    <PageContainer width="default">
      <PageHeader
        icon={Users}
        title="모임·네트워킹"
        description="개강·종강총회, 정기·수시모임, MT 등 대학원 생활 행사의 참석 신청과 회비 납부 현황을 확인하세요."
      />

      {isLoading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">다가오는 모임</h2>
            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
                예정된 모임이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((ev) => (
                  <EventCard
                    key={ev.id}
                    ev={ev}
                    nowIso={nowIso}
                    isMember={!!user}
                    myRsvp={myRsvpByEvent.get(ev.id)}
                    myDue={myDueByEvent.get(ev.id)}
                    onChanged={refresh}
                  />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">지난 모임</h2>
              <div className="space-y-3">
                {past.map((ev) => (
                  <EventCard
                    key={ev.id}
                    ev={ev}
                    nowIso={nowIso}
                    isMember={!!user}
                    myRsvp={myRsvpByEvent.get(ev.id)}
                    myDue={myDueByEvent.get(ev.id)}
                    onChanged={refresh}
                    past
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
}

function EventCard({
  ev,
  nowIso,
  isMember,
  myRsvp,
  myDue,
  onChanged,
  past,
}: {
  ev: NetworkingEvent;
  nowIso: string;
  isMember: boolean;
  myRsvp?: NetworkingRsvp;
  myDue?: NetworkingDue;
  onChanged: () => void;
  past?: boolean;
}) {
  const { user } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const closed = isRsvpClosed(ev, nowIso);

  async function setMemberRsvp(status: RsvpStatus) {
    if (!user || busy) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      if (myRsvp) {
        await networkingRsvpsApi.update(myRsvp.id, { status, respondedAt: now, updatedAt: now });
      } else {
        await networkingRsvpsApi.create({
          eventId: ev.id,
          userId: user.id,
          displayName: user.name ?? "회원",
          status,
          respondedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
      toast.success(`'${RSVP_STATUS_LABELS[status]}'(으)로 신청했습니다.`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "신청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function submitGuest() {
    if (busy) return;
    if (!guestName.trim() || !guestContact.trim()) {
      toast.error("이름과 연락처를 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await networkingRsvpsApi.create({
        eventId: ev.id,
        isGuest: true,
        guestName: guestName.trim(),
        guestContact: guestContact.trim(),
        displayName: guestName.trim(),
        status: "attending",
        respondedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      toast.success("게스트 참석 신청이 접수되었습니다.");
      setGuestOpen(false);
      setGuestName("");
      setGuestContact("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "신청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-sm transition-shadow",
        past ? "opacity-75" : "hover:shadow-md",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", EVENT_TYPE_COLORS[ev.type])}>
              {NETWORKING_EVENT_TYPE_LABELS[ev.type]}
            </span>
            {ev.status === "cancelled" && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">취소됨</span>
            )}
            {!past && ev.status !== "cancelled" && closed && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">신청 마감</span>
            )}
          </div>
          <h3 className="mt-1.5 text-base font-bold leading-snug">{ev.title}</h3>
        </div>
      </div>

      <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><CalendarDays size={13} />{formatEventDate(ev.startAt)}</span>
        {ev.location && <span className="inline-flex items-center gap-1"><MapPin size={13} />{ev.location}</span>}
        <span className="inline-flex items-center gap-1"><Wallet size={13} />회비 {formatWon(ev.feeAmount)}</span>
        {ev.rsvpDeadline && !past && (
          <span className="inline-flex items-center gap-1"><Clock size={13} />신청마감 {formatEventDate(ev.rsvpDeadline)}</span>
        )}
      </dl>

      {ev.description && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{ev.description}</p>
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

      {/* 참석 신청 */}
      {!past && ev.status !== "cancelled" && (
        <div className="mt-3.5 border-t pt-3">
          {isMember ? (
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
          ) : closed ? (
            <p className="text-xs text-muted-foreground">신청이 마감되었습니다.</p>
          ) : guestOpen ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">게스트(비회원) 참석 신청</p>
              <div className="flex flex-wrap gap-2">
                <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="이름" className="h-8 max-w-[140px] text-xs" />
                <Input value={guestContact} onChange={(e) => setGuestContact(e.target.value)} placeholder="연락처(전화/이메일)" className="h-8 max-w-[200px] text-xs" />
                <Button size="sm" className="h-8 text-xs" disabled={busy} onClick={submitGuest}>신청</Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setGuestOpen(false)}>취소</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setGuestOpen(true)}>
              게스트로 참석 신청
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
