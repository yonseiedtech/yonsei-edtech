"use client";

/**
 * 내 활동 허브 (UX 보고서 §3.1 / 백로그 M2)
 * 마이페이지에 흩어진 "내 신청 상태"를 한 곳에 모으는 단일 허브.
 *  - 세미나(참석 신청) · 학술활동(스터디/프로젝트/대외 신청·참여) · 네트워킹 모임(RSVP)
 *  - 각 항목은 상태(신청완료/대기/반려/예정/지난)와 함께 표시, 원본 상세로 링크.
 *
 * 데이터는 기존 api 읽기 전용:
 *  - 세미나·학술활동·신청내역: MyPageView 에서 이미 조회한 값을 props 로 전달받음(중복 fetch 회피).
 *  - 네트워킹 모임 RSVP: 본 컴포넌트에서 networkingEventsApi/networkingRsvpsApi 로 직접 조회(읽기).
 * 원본 목록/상세 페이지 컴포넌트는 수정하지 않는다.
 */

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronRight,
  Users,
  BookOpen,
  FolderKanban,
  ClipboardList,
  Wallet,
} from "lucide-react";
import EmptyState from "@/components/ui/empty-state";
import { cn, formatDate } from "@/lib/utils";
import { networkingEventsApi, networkingRsvpsApi, networkingDuesApi } from "@/lib/bkend";
import {
  RSVP_STATUS_LABELS,
  NETWORKING_EVENT_TYPE_LABELS,
  type NetworkingEvent,
  type NetworkingRsvp,
  type NetworkingDue,
  type Activity,
  type Seminar,
} from "@/types";
import { formatEventDate, isPastEvent, formatWon } from "@/features/networking/networking-helpers";
import { semesterKeyOf, semesterLabelFromKey } from "@/lib/semester";
import { SEMANTIC } from "@/lib/design-tokens";

type ApplicationLite = {
  activityId: string;
  status: string;
  participantType?: string;
};

interface Props {
  userId: string;
  /** MyPageView 에서 이미 필터링한 "내가 참석하는 세미나" */
  mySeminars: Seminar[];
  /** activitiesApi.list() 전체 (신청 매칭용) */
  allActivities: Activity[];
  /** MyPageView 에서 계산한 "내 학술활동"(참여 확정/신청 포함) */
  myActivities: Activity[];
  /** /api/me/applications 결과 (activityId → 신청) */
  applicationByActivity: Map<string, ApplicationLite>;
}

type HubStatus = "approved" | "pending" | "rejected" | "upcoming" | "past";

const STATUS_META: Record<HubStatus, { label: string; cls: string }> = {
  approved: {
    label: "신청완료",
    cls: cn(SEMANTIC.success.chipBg, SEMANTIC.success.chipText),
  },
  pending: {
    label: "승인 대기",
    cls: cn(SEMANTIC.warning.chipBg, SEMANTIC.warning.chipText),
  },
  rejected: {
    label: "반려",
    cls: cn(SEMANTIC.danger.chipBg, SEMANTIC.danger.chipText),
  },
  upcoming: {
    label: "예정",
    cls: cn(SEMANTIC.info.chipBg, SEMANTIC.info.chipText),
  },
  past: {
    label: "지난 일정",
    cls: "bg-muted text-muted-foreground",
  },
};

type Category = "seminar" | "activity" | "gathering";

type HubItem = {
  key: string;
  category: Category;
  title: string;
  /** 정렬·표시용 ISO/YMD (없으면 미정) */
  sortKey: string;
  dateLabel: string;
  metaLabel: string;
  status: HubStatus;
  href: string;
};

const CATEGORY_META: Record<
  Category,
  { label: string; icon: typeof Users; bg: string; fg: string }
> = {
  seminar: {
    label: "세미나",
    icon: CalendarDays,
    bg: "bg-primary/15",
    fg: "text-primary",
  },
  activity: {
    label: "학술활동",
    icon: FolderKanban,
    bg: "bg-success/10",
    fg: "text-success",
  },
  gathering: {
    label: "모임",
    icon: Users,
    bg: "bg-cat-5/10",
    fg: "text-cat-5",
  },
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  study: "스터디",
  project: "프로젝트",
  external: "대외활동",
};

function activityHref(a: Activity): string {
  if (a.type === "project") return `/activities/projects/${a.id}`;
  if (a.type === "study") return `/activities/studies/${a.id}`;
  if (a.type === "external") return `/activities/external/${a.id}`;
  return "/activities";
}

export default function MyActivityHub({
  userId,
  mySeminars,
  allActivities,
  myActivities,
  applicationByActivity,
}: Props) {
  const nowIso = new Date().toISOString();
  const todayYmd = nowIso.slice(0, 10);

  // 네트워킹 모임 — 내 RSVP 가 있는 행사만. (gatherings 페이지와 동일한 읽기 api)
  const { data: gatheringEvents = [] } = useQuery({
    queryKey: ["myhub-networking-events"],
    queryFn: async () =>
      (await networkingEventsApi.listPublished()).data as NetworkingEvent[],
    staleTime: 60_000,
    enabled: !!userId,
  });
  const { data: myRsvps = [] } = useQuery({
    queryKey: ["myhub-networking-rsvps", userId],
    queryFn: async () =>
      (await networkingRsvpsApi.listByUser(userId)).data as NetworkingRsvp[],
    staleTime: 30_000,
    enabled: !!userId,
  });
  // G5(2026-07-08): 내 미납 회비 — 여러 모임에 걸친 unpaid due 합계. 미납 0이면 미노출.
  const { data: myDues = [] } = useQuery({
    queryKey: ["myhub-networking-dues", userId],
    queryFn: async () =>
      (await networkingDuesApi.listByUser(userId)).data as NetworkingDue[],
    staleTime: 30_000,
    enabled: !!userId,
  });
  const unpaidDues = useMemo(() => myDues.filter((d) => d.status === "unpaid"), [myDues]);
  const unpaidTotal = useMemo(
    () => unpaidDues.reduce((sum, d) => sum + (d.amount ?? 0), 0),
    [unpaidDues],
  );

  const items = useMemo<HubItem[]>(() => {
    const out: HubItem[] = [];

    // ── 세미나 ──
    for (const s of mySeminars) {
      const date = s.date || "";
      const isPast = date !== "" && date < todayYmd;
      out.push({
        key: `sem-${s.id}`,
        category: "seminar",
        title: s.title,
        sortKey: date,
        dateLabel: date ? formatDate(date) : "일정 미정",
        metaLabel: s.location ? `세미나 · ${s.location}` : "세미나",
        status: isPast ? "past" : "upcoming",
        href: `/seminars/${s.id}`,
      });
    }

    // ── 학술활동 ──
    // myActivities = 참여 확정 + (external 신청 / approved). 여기에 더해 신청 대기/반려도 노출.
    const seenActivityIds = new Set<string>();
    for (const a of myActivities) {
      seenActivityIds.add(a.id);
      const date = a.date || "";
      const isPast = a.status === "completed" || (date !== "" && date < todayYmd);
      const app = applicationByActivity.get(a.id);
      let status: HubStatus;
      if (app && a.type === "external") {
        status =
          app.status === "rejected"
            ? "rejected"
            : app.status === "approved"
              ? "approved"
              : "pending";
      } else if (app) {
        status = app.status === "approved" ? "approved" : app.status === "rejected" ? "rejected" : "pending";
      } else {
        status = isPast ? "past" : "approved";
      }
      out.push({
        key: `act-${a.id}`,
        category: "activity",
        title: a.title,
        sortKey: date,
        dateLabel: date ? formatDate(date) : "일정 미정",
        metaLabel: ACTIVITY_TYPE_LABELS[a.type] ?? "학술활동",
        status,
        href: activityHref(a),
      });
    }
    // 신청만 했으나 myActivities 에 미포함된 건(대기·반려 일반활동) 보강
    for (const a of allActivities) {
      if (seenActivityIds.has(a.id)) continue;
      const app = applicationByActivity.get(a.id);
      if (!app) continue;
      const date = a.date || "";
      const status: HubStatus =
        app.status === "rejected" ? "rejected" : app.status === "approved" ? "approved" : "pending";
      out.push({
        key: `act-${a.id}`,
        category: "activity",
        title: a.title,
        sortKey: date,
        dateLabel: date ? formatDate(date) : "일정 미정",
        metaLabel: ACTIVITY_TYPE_LABELS[a.type] ?? "학술활동",
        status,
        href: activityHref(a),
      });
    }

    // ── 네트워킹 모임 ──
    const rsvpByEvent = new Map<string, NetworkingRsvp>();
    for (const r of myRsvps) rsvpByEvent.set(r.eventId, r);
    for (const ev of gatheringEvents) {
      const rsvp = rsvpByEvent.get(ev.id);
      if (!rsvp) continue;
      if (rsvp.status === "not_attending") continue; // 불참 의사는 허브에서 제외
      const isPollPending = ev.schedulingMode === "poll" && !ev.startAt;
      const past = !isPollPending && isPastEvent(ev, nowIso);
      let status: HubStatus;
      if (past) status = "past";
      else if (rsvp.status === "attending") status = "approved";
      else status = "pending"; // 미정
      const dateLabel = isPollPending
        ? "일정 조율 중"
        : ev.startAt
          ? formatEventDate(ev.startAt)
          : "일정 미정";
      out.push({
        key: `gat-${ev.id}`,
        category: "gathering",
        title: ev.title,
        sortKey: ev.startAt || "",
        dateLabel,
        metaLabel: `모임 · ${NETWORKING_EVENT_TYPE_LABELS[ev.type]} · ${RSVP_STATUS_LABELS[rsvp.status]}`,
        status,
        href: "/gatherings",
      });
    }

    return out;
  }, [
    mySeminars,
    myActivities,
    allActivities,
    applicationByActivity,
    gatheringEvents,
    myRsvps,
    nowIso,
    todayYmd,
  ]);

  // 예정(미래/조율중) 먼저 — 가까운 날짜 순, 그다음 지난 일정 최신순
  const { upcoming, past } = useMemo(() => {
    const up: HubItem[] = [];
    const pa: HubItem[] = [];
    for (const it of items) {
      if (it.status === "past") pa.push(it);
      else up.push(it);
    }
    up.sort((a, b) => {
      // 일정 미정(sortKey "")은 뒤로
      if (!a.sortKey && b.sortKey) return 1;
      if (a.sortKey && !b.sortKey) return -1;
      return a.sortKey.localeCompare(b.sortKey);
    });
    pa.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return { upcoming: up, past: pa };
  }, [items]);

  const counts = useMemo(() => {
    const c = { seminar: 0, activity: 0, gathering: 0 };
    for (const it of items) c[it.category] += 1;
    return c;
  }, [items]);

  // 학기별 모임 참여 이력(③) — 참석 확정(attending) 모임을 학기키로 묶어 대학원생활 이력으로 표시.
  const gatheringsBySemester = useMemo(() => {
    const rsvpByEvent = new Map(myRsvps.map((r) => [r.eventId, r] as const));
    const bySem = new Map<string, { title: string; dateLabel: string; sortKey: string }[]>();
    for (const ev of gatheringEvents) {
      const rsvp = rsvpByEvent.get(ev.id);
      if (!rsvp || rsvp.status !== "attending") continue;
      const key = ev.semester || semesterKeyOf(ev.startAt || ev.pollPeriodStart);
      if (!key) continue;
      const list = bySem.get(key) ?? [];
      list.push({
        title: ev.title,
        dateLabel: ev.startAt ? formatEventDate(ev.startAt) : "일정 미정",
        sortKey: ev.startAt || "",
      });
      bySem.set(key, list);
    }
    return Array.from(bySem.entries())
      .map(([key, list]) => ({
        key,
        label: semesterLabelFromKey(key),
        list: list.sort((a, b) => b.sortKey.localeCompare(a.sortKey)),
      }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [gatheringEvents, myRsvps]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="flex items-center gap-1.5 text-base font-bold">
          <ClipboardList size={18} className="text-primary" />내 활동 허브
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          신청·참여한 세미나·학술활동·모임을 한 곳에서 상태와 함께 확인하세요.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
            <CalendarDays size={11} /> 세미나 {counts.seminar}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 font-medium text-success">
            <FolderKanban size={11} /> 학술활동 {counts.activity}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-cat-5/10 px-2.5 py-0.5 font-medium text-cat-5">
            <Users size={11} /> 모임 {counts.gathering}
          </span>
        </div>
      </div>

      {/* G5: 내 미납 회비 요약 (미납 있을 때만) */}
      {unpaidDues.length > 0 && (
        <Link
          href="/gatherings"
          className={cn("flex items-center gap-3 rounded-2xl border p-3.5 transition hover:border-warning", SEMANTIC.warning.border, SEMANTIC.warning.bg)}
        >
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", SEMANTIC.warning.chipBg, SEMANTIC.warning.chipText)}>
            <Wallet size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold", SEMANTIC.warning.titleStrong)}>
              미납 회비 {unpaidDues.length}건 · {formatWon(unpaidTotal)}
            </p>
            <p className={cn("mt-0.5 text-xs", SEMANTIC.warning.textMuted)}>
              모임 회비가 아직 납부되지 않았습니다. 총무에게 납부해 주세요.
            </p>
          </div>
          <ChevronRight size={16} className={cn("shrink-0", SEMANTIC.warning.accent)} />
        </Link>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="신청·참여한 활동이 아직 없어요"
          description="세미나·학술활동·모임에 참여하면 이곳에 모아서 상태를 확인할 수 있어요."
          actions={[
            { label: "세미나 둘러보기", href: "/seminars", variant: "default" },
            { label: "학술활동 둘러보기", href: "/activities/studies", variant: "outline" },
            { label: "모임 둘러보기", href: "/gatherings", variant: "outline" },
          ]}
        />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                예정·진행 중 ({upcoming.length})
              </h4>
              <ul className="space-y-2">
                {upcoming.map((it) => (
                  <HubRow key={it.key} item={it} />
                ))}
              </ul>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                지난 활동 ({past.length})
              </h4>
              <ul className="space-y-2">
                {past.map((it) => (
                  <HubRow key={it.key} item={it} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* 학기별 모임 참여 이력(③) — 대학원 생활 이력 표면. 참석 확정 모임만. */}
      {gatheringsBySemester.length > 0 && (
        <section className="rounded-2xl border bg-card p-4">
          <h4 className="flex items-center gap-1.5 text-sm font-bold">
            <Users size={15} className="text-cat-5" /> 학기별 모임 참여
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">참석 확정한 모임·행사를 학기 단위로 모았습니다.</p>
          <div className="mt-3 space-y-3">
            {gatheringsBySemester.map((sem) => (
              <div key={sem.key}>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
                  <span className="rounded-full bg-cat-5/10 px-2 py-0.5 text-[11px] text-cat-5">
                    {sem.label}
                  </span>
                  <span className="text-muted-foreground">{sem.list.length}회</span>
                </p>
                <ul className="space-y-1 pl-1">
                  {sem.list.map((g, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <CalendarDays size={12} className="shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{g.title}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{g.dateLabel}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function HubRow({ item }: { item: HubItem }) {
  const cat = CATEGORY_META[item.category];
  const Icon = cat.icon;
  const st = STATUS_META[item.status];
  return (
    <li>
      <Link
        href={item.href}
        className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 transition hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            cat.bg,
            cat.fg,
          )}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{item.title}</p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                st.cls,
              )}
            >
              {st.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {item.dateLabel} · {item.metaLabel}
          </p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
