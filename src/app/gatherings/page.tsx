"use client";

/**
 * 모임·행사 (회원용) — 사이클 73
 * 대학원 생활 행사(개강/종강총회·정기/수시모임·MT)의 참석 신청과 내 회비 상태 확인.
 * 로그인 회원은 참석/불참/미정 신청, 비로그인 방문자는 게스트로 신청 가능.
 *
 * 용어 정리(M1): 회원 간 연결망 시각화는 /network("회원 관계망 Map")가 담당.
 * 본 페이지는 행사·회비 중심으로, "네트워킹" 용어 중첩을 제거함.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, CalendarX2, Plus, Download } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/features/auth/auth-store";
import { cn } from "@/lib/utils";
import { isStaffOrAbove } from "@/lib/permissions";
import { networkingEventsApi, networkingRsvpsApi, networkingDuesApi, albumsApi } from "@/lib/bkend";
import {
  type NetworkingEvent,
  type NetworkingRsvp,
  type NetworkingDue,
  type PhotoAlbum,
} from "@/types";
import { isPastEvent, formatEventDate } from "@/features/networking/networking-helpers";
import { semesterKeyOf, currentSemesterKey, semesterLabelFromKey } from "@/lib/semester";
import { exportCSV } from "@/lib/export-csv";
import { NETWORKING_EVENT_TYPE_LABELS } from "@/types";
import EventEditorForm from "@/features/networking/EventEditorForm";
import GatheringEventCard from "@/features/networking/GatheringEventCard";
import GuestRsvpBanner from "@/features/networking/GuestRsvpBanner";
import MyGatheringsStrip from "@/features/networking/MyGatheringsStrip";

export default function GatheringsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const router = useRouter();
  const nowIso = new Date().toISOString();
  const canCreate = isStaffOrAbove(user);
  const [createOpen, setCreateOpen] = useState(false);

  // 하위 호환(2026-07-19 목록/상세 분리): 기존에 공유된 `#event-{id}` 앵커 링크는 상세 페이지로 리다이렉트.
  // (구 카드 임베드 앵커 → 신규 /gatherings/[id]. 이미 유포된 투표 공유 링크 보존.)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = /^#event-(.+)$/.exec(window.location.hash);
    if (m?.[1]) router.replace(`/gatherings/${m[1]}`);
  }, [router]);

  // 2026-07-19: 관리자(staff+)는 미발행·비공개 모임까지 전체 조회 — listPublished 만 쓰면
  // 운영진이 비공개 전환한 모임이 본인에게도 사라지는 문제(사용자 리포트)가 생긴다.
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["networking-events", canCreate ? "all" : "published"],
    queryFn: async () =>
      (canCreate
        ? (await networkingEventsApi.list()).data
        : (await networkingEventsApi.listPublished()).data) as NetworkingEvent[],
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
  // Phase 2-D: 행사 연결 앨범 — "행사 사진 보기" 역링크용
  const { data: albums = [] } = useQuery({
    queryKey: ["albums-for-gatherings"],
    queryFn: async () => (await albumsApi.list()).data as unknown as PhotoAlbum[],
    staleTime: 5 * 60_000,
  });
  // 목록 카드 "참여 N명" — RSVP 원본은 프라이버시상 클라 집계 불가라 서버 집계 API 경유(PII 없음).
  const { data: attendeeCounts = {} } = useQuery({
    queryKey: ["networking-attendee-counts"],
    queryFn: async () => {
      const res = await fetch("/api/networking/attendee-counts");
      if (!res.ok) return {} as Record<string, number>;
      const body = (await res.json()) as { counts?: Record<string, number> };
      return body.counts ?? {};
    },
    staleTime: 60_000,
  });

  // 비공개(private) 모임은 공개 목록에서 제외 — 단 staff 이상에게는 배지와 함께 노출
  const visibleEvents = useMemo(
    () => (canCreate ? events : events.filter((e) => e.visibility !== "private")),
    [events, canCreate],
  );

  // ── 학기 단위 관리(2026-07-19) ──
  // 각 이벤트의 실효 학기키: 저장된 semester 우선, 없으면 일시(poll 은 후보 기간 시작)로부터 유도(하위호환).
  const semOf = (e: NetworkingEvent) => e.semester || semesterKeyOf(e.startAt || e.pollPeriodStart);
  const [semFilter, setSemFilter] = useState<string | null>(null);

  const semesterKeys = useMemo(() => {
    const set = new Set<string>();
    for (const e of visibleEvents) {
      const k = semOf(e);
      if (k) set.add(k);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a)); // 최신 학기 먼저
  }, [visibleEvents]);

  const currentSem = currentSemesterKey();
  // 기본: 현재 학기(해당 학기 이벤트가 있을 때) — 없으면 전체. 사용자가 칩으로 변경 시 그 값을 따른다.
  const activeSemester = semFilter ?? (semesterKeys.includes(currentSem) ? currentSem : "all");

  const shownEvents = useMemo(
    () =>
      activeSemester === "all"
        ? visibleEvents
        : visibleEvents.filter((e) => semOf(e) === activeSemester),
    [visibleEvents, activeSemester],
  );

  const { upcoming, past } = useMemo(() => {
    // 미확정 투표(poll, startAt 없음)는 정렬 키를 비워 항상 다가오는 모임 상단으로
    const isUnconfirmedPoll = (e: NetworkingEvent) => e.schedulingMode === "poll" && !e.startAt;
    const sorted = [...shownEvents].sort((a, b) => a.startAt.localeCompare(b.startAt));
    return {
      upcoming: sorted.filter(
        (e) => (isUnconfirmedPoll(e) || !isPastEvent(e, nowIso)) && e.status !== "cancelled",
      ),
      past: sorted.filter((e) => !isUnconfirmedPoll(e) && isPastEvent(e, nowIso)).reverse(),
    };
  }, [shownEvents, nowIso]);

  // 운영진 학기 요약 — 모임 N회 · 연인원 M명(attendee-counts 재사용). CSV 는 표시 중인 학기 범위.
  const semesterSummary = useMemo(() => {
    const headcount = shownEvents.reduce((sum, e) => sum + (attendeeCounts[e.id] ?? 0), 0);
    return { eventCount: shownEvents.length, headcount };
  }, [shownEvents, attendeeCounts]);

  function exportSemesterCsv() {
    const label = activeSemester === "all" ? "전체학기" : activeSemester;
    const rows = shownEvents
      .slice()
      .sort((a, b) => (a.startAt || "").localeCompare(b.startAt || ""))
      .map((e) => [
        semOf(e) ?? "",
        NETWORKING_EVENT_TYPE_LABELS[e.type],
        e.title,
        e.startAt ? formatEventDate(e.startAt) : "일정 미정",
        e.location ?? "",
        e.visibility === "private" ? "비공개" : "공개",
        attendeeCounts[e.id] ?? 0,
      ]);
    exportCSV(
      `모임행사_${label}`,
      ["학기", "유형", "제목", "일시", "장소", "공개범위", "참석인원"],
      rows,
    );
  }

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
  const albumByEvent = useMemo(() => {
    const m = new Map<string, PhotoAlbum>();
    for (const a of albums) {
      if (a.networkingEventId) m.set(a.networkingEventId, a);
    }
    return m;
  }, [albums]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["networking-rsvps", user?.id] });
  }

  return (
    <PageContainer width="default">
      <PageHeader
        icon={Users}
        title="모임·행사"
        description="개강·종강총회, 정기·수시모임, MT 등 대학원 생활 행사의 참석 신청과 회비 납부 현황을 확인하세요. (회원 간 연결망은 '회원 관계망 Map'에서 확인할 수 있습니다.)"
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={15} className="mr-1" /> 모임 만들기
            </Button>
          ) : undefined
        }
      />

      {/* G7: 게스트 신청 확인·취소 (guest_rsvp 토큰으로 접근 시 자동 노출) */}
      <GuestRsvpBanner />

      {/* 내 참여 현황 스트립 (2026-07-18) — 로그인 회원에게 참여 중인 모임·투표 중 모임을 상단 요약 */}
      {user && !isLoading && (
        <MyGatheringsStrip upcoming={upcoming} myRsvpByEvent={myRsvpByEvent} />
      )}

      {canCreate && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent showCloseButton={false} className="sm:max-w-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>새 모임 만들기</DialogTitle>
            </DialogHeader>
            <EventEditorForm
              initial={null}
              onClose={() => setCreateOpen(false)}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["networking-events"] });
                setCreateOpen(false);
              }}
              createdByUid={user?.id ?? ""}
            />
          </DialogContent>
        </Dialog>
      )}

      {isLoading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {/* 학기 필터 + (운영진) 학기 요약·CSV */}
          {semesterKeys.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSemFilter("all")}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    activeSemester === "all"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40",
                  )}
                >
                  전체 학기
                </button>
                {semesterKeys.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSemFilter(k)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      activeSemester === k
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {semesterLabelFromKey(k)}
                    {k === currentSem && " (현재)"}
                  </button>
                ))}
              </div>
              {canCreate && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {activeSemester === "all" ? "전체 학기" : semesterLabelFromKey(activeSemester)}
                    </span>{" "}
                    · 모임 {semesterSummary.eventCount}회 · 연인원{" "}
                    <span className="font-semibold text-foreground">{semesterSummary.headcount}명</span>
                  </p>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportSemesterCsv} disabled={shownEvents.length === 0}>
                    <Download size={13} className="mr-1" /> 학기 CSV
                  </Button>
                </div>
              )}
            </div>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">다가오는 모임</h2>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title="예정된 모임이 없습니다"
                description={
                  canCreate
                    ? "아직 다가오는 모임이 없어요. 새 모임을 만들어 회원들의 참석을 받아보세요."
                    : "아직 다가오는 모임이 등록되지 않았어요. 다른 활동을 둘러보거나 지난 모임을 확인해보세요."
                }
                actions={[
                  ...(canCreate
                    ? [{ label: "모임 만들기", onClick: () => setCreateOpen(true), variant: "default" as const }]
                    : [{ label: "세미나 둘러보기", href: "/seminars", variant: "default" as const }]),
                  { label: "학술활동 둘러보기", href: "/activities/studies", variant: "outline" },
                  ...(past.length > 0
                    ? [{ label: "지난 모임 보기", href: "#past-gatherings", variant: "outline" as const }]
                    : []),
                ]}
              />
            ) : (
              <div className="space-y-3">
                {upcoming.map((ev) => (
                  <GatheringEventCard
                    key={ev.id}
                    ev={ev}
                    nowIso={nowIso}
                    isMember={!!user}
                    myRsvp={myRsvpByEvent.get(ev.id)}
                    myDue={myDueByEvent.get(ev.id)}
                    album={albumByEvent.get(ev.id)}
                    onChanged={refresh}
                    canManage={canCreate}
                    attendeeCount={attendeeCounts[ev.id]}
                  />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section id="past-gatherings" className="scroll-mt-20">
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">지난 모임</h2>
              <div className="space-y-3">
                {past.map((ev) => (
                  <GatheringEventCard
                    key={ev.id}
                    ev={ev}
                    nowIso={nowIso}
                    isMember={!!user}
                    myRsvp={myRsvpByEvent.get(ev.id)}
                    myDue={myDueByEvent.get(ev.id)}
                    album={albumByEvent.get(ev.id)}
                    onChanged={refresh}
                    canManage={canCreate}
                    attendeeCount={attendeeCounts[ev.id]}
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
