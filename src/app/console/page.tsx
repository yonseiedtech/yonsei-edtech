"use client";

import Link from "next/link";
import { useAuthStore } from "@/features/auth/auth-store";
import { useInquiries } from "@/features/inquiry/useInquiry";
import { usePosts } from "@/features/board/useBoard";
import { profilesApi, seminarsApi, externalActivitiesApi, awardsApi, alumniThesesApi } from "@/lib/bkend";
import { fetchPendingDrafts } from "@/features/content-draft/content-draft-store";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getComputedStatus } from "@/lib/seminar-utils";
import type { Seminar } from "@/types";
import { Users, Clock, FileText, HelpCircle, LayoutDashboard, Bot, Map, FileUp, Loader2, Globe, ClipboardCheck, MessageSquareQuote, HeartHandshake, BarChart3, ListChecks, Inbox, ArrowRight, CalendarDays, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { auth as firebaseAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import AdminTodoTab from "@/features/admin/AdminTodoTab";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import ActionableBanner from "@/components/ui/actionable-banner";
import { getHackathonPhase } from "@/features/hackathon/config";
import { useAcademicCalendar, type AcademicCalendarData, REVIEW_TYPE_LABEL } from "@/features/site-settings/useAcademicCalendar";
import { todayYmdKst } from "@/lib/dday";

// ── M3: 학사일정 → 콘솔 랜딩 연결 — 다가오는 항목 추출 ──

type CalendarUpcomingItem = {
  label: string;
  dateStr: string;
  diff: number;
};

function getUpcomingCalendarItems(
  entries: AcademicCalendarData["entries"],
  windowDays = 120,
): CalendarUpcomingItem[] {
  const today = todayYmdKst();
  const [ty, tm, td] = today.split("-").map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);

  const items: CalendarUpcomingItem[] = [];
  for (const e of entries) {
    const milestones: { label: string; start: string }[] = [
      { label: "개강", start: e.semesterStart },
      { label: "중간고사 시작", start: e.midtermStart },
      { label: "기말고사 시작", start: e.finalStart },
      { label: "종강", start: e.semesterEnd },
      ...(e.reviews ?? []).map((r) => ({
        label: REVIEW_TYPE_LABEL[r.type] + (r.notes ? ` (${r.notes})` : ""),
        start: r.startDate,
      })),
    ];
    for (const m of milestones) {
      if (!m.start) continue;
      const parts = m.start.split("-").map(Number);
      if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) continue;
      const startMs = Date.UTC(parts[0], parts[1] - 1, parts[2]);
      const diff = Math.round((startMs - todayMs) / 86400000);
      if (diff < 0 || diff > windowDays) continue;
      items.push({ label: m.label, dateStr: m.start, diff });
    }
  }
  items.sort((a, b) => a.diff - b.diff);
  return items;
}

// ── H1: 다가오는 시즌 카운트다운 ──

function calcDdayDiff(targetYmd: string): number {
  const today = todayYmdKst();
  const [ty, tm, td] = today.split("-").map(Number);
  const [ey, em, ed] = targetYmd.split("-").map(Number);
  return Math.round(
    (Date.UTC(ey, em - 1, ed) - Date.UTC(ty, tm - 1, td)) / 86400000,
  );
}

function ddayBadge(diff: number): string {
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-day";
  return `D+${-diff} 지남`;
}

type SeasonItem = {
  key: string;
  label: string;
  /** null = 수동 체크, true/false = 자동 판정 */
  auto: boolean | null;
  href?: string;
};

type SeasonEventDef = {
  key: string;
  label: string;
  dateLabel: string;
  diff: number;
  consoleHref: string;
  toneClass: string;
  iconClass: string;
  badgeClass: string;
  items: SeasonItem[];
};

function UpcomingSeasonCard({
  pendingMemberCount,
  calendarData,
}: {
  /** undefined = 로딩 중 */
  pendingMemberCount: number | undefined;
  calendarData: AcademicCalendarData;
}) {
  const now = new Date();
  const hackathonDiff = calcDdayDiff("2026-08-22");
  const hackathonPhase = getHackathonPhase(now);

  // M3: calendarData에서 2학기 개강일 동적 읽기 (하드코딩 제거)
  const cal2ndEntry = calendarData.entries.find(
    (e) => e.year === 2026 && e.semester === "second",
  );
  const semesterStartDate = cal2ndEntry?.semesterStart || "2026-09-01";
  const semesterDiff = calcDdayDiff(semesterStartDate);
  const hasCalendar2ndSemester = !!cal2ndEntry?.semesterStart;
  // M3: 다가오는 학사일정 항목 (최대 3개, 120일 이내)
  const upcomingCalendarItems = getUpcomingCalendarItems(
    calendarData.entries,
    120,
  ).slice(0, 3);

  const events: SeasonEventDef[] = [
    ...(hackathonDiff > -8 && hackathonDiff <= 120
      ? [
          {
            key: "hackathon",
            label: "에듀테크 해커톤",
            dateLabel: "2026-08-22 (토)",
            diff: hackathonDiff,
            consoleHref: "/console/hackathon",
            toneClass: "border-info/30 bg-info/5",
            iconClass: "text-info",
            badgeClass: "bg-info/10 text-info",
            items: [
              {
                key: "reg_open",
                label: "참가 접수 오픈",
                auto: hackathonPhase === "registration",
                href: "/hackathon",
              },
              {
                key: "board_notice",
                label: "아이디어 보드 공지 게시",
                auto: null,
                href: "/console/hackathon",
              },
              { key: "judge_assign", label: "심사위원 배정 완료", auto: null },
              {
                key: "console_ready",
                label: "당일 콘솔 세팅 점검",
                auto: null,
                href: "/console/hackathon",
              },
            ] as SeasonItem[],
          },
        ]
      : []),
    ...(semesterDiff > -8 && semesterDiff <= 120
      ? [
          {
            key: "semester",
            label: "2026년 후기 개강",
            dateLabel: semesterStartDate,
            diff: semesterDiff,
            consoleHref: "/console/academic-calendar",
            toneClass: "border-success/30 bg-success/5",
            iconClass: "text-success",
            badgeClass: "bg-success/10 text-success",
            items: [
              {
                key: "calendar_set",
                label: "학사일정(2학기) 등록",
                auto: hasCalendar2ndSemester,
                href: "/console/academic-calendar",
              },
              {
                key: "pending_clear",
                label: "신규 가입 승인 큐 비움",
                auto:
                  pendingMemberCount !== undefined
                    ? pendingMemberCount === 0
                    : null,
                href: "/console/members",
              },
              {
                key: "onboarding",
                label: "온보딩 시퀀스 활성화 확인",
                auto: null,
                href: "/console/members",
              },
              {
                key: "welcome_post",
                label: "신입 환영 게시글 준비",
                auto: null,
                href: "/console/posts",
              },
            ] as SeasonItem[],
          },
        ]
      : []),
  ];

  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>(
    () => {
      if (typeof window === "undefined") return {};
      const result: Record<string, boolean> = {};
      for (const ev of events) {
        for (const item of ev.items) {
          if (item.auto === null) {
            const k = `yedu_season_chk_${ev.key}_${item.key}`;
            result[k] = window.localStorage.getItem(k) === "1";
          }
        }
      }
      return result;
    },
  );

  if (events.length === 0) return null;

  function toggleManual(evKey: string, itemKey: string) {
    const k = `yedu_season_chk_${evKey}_${itemKey}`;
    const next = !manualChecks[k];
    try {
      window.localStorage.setItem(k, next ? "1" : "0");
    } catch {
      // ignore
    }
    setManualChecks((prev) => ({ ...prev, [k]: next }));
  }

  function isChecked(evKey: string, item: SeasonItem): boolean {
    if (item.auto !== null) return item.auto;
    return manualChecks[`yedu_season_chk_${evKey}_${item.key}`] ?? false;
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays size={16} className="text-muted-foreground" />
        <h2 className="text-sm font-semibold">다가오는 시즌</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">
          준비 항목 역산
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {events.map((ev) => {
          const checkedCount = ev.items.filter((item) =>
            isChecked(ev.key, item),
          ).length;
          const allDone = checkedCount === ev.items.length;

          return (
            <div
              key={ev.key}
              className={`rounded-xl border p-3 ${ev.toneClass}`}
            >
              {/* 이벤트 헤더 */}
              <div className="mb-2 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-bold">{ev.label}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ev.badgeClass}`}
                    >
                      {ddayBadge(ev.diff)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {ev.dateLabel}
                  </p>
                </div>
                <Link
                  href={ev.consoleHref}
                  className={`flex shrink-0 items-center gap-0.5 text-[11px] font-medium ${ev.iconClass} hover:underline`}
                >
                  콘솔 <ArrowRight size={11} />
                </Link>
              </div>

              {/* 진행도 */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {checkedCount}/{ev.items.length} 완료
                </span>
                {allDone && (
                  <span
                    className={`text-[11px] font-semibold ${ev.iconClass}`}
                  >
                    준비 완료!
                  </span>
                )}
              </div>

              {/* 체크리스트 */}
              <ul className="space-y-1.5">
                {ev.items.map((item) => {
                  const checked = isChecked(ev.key, item);
                  return (
                    <li key={item.key} className="flex items-center gap-2">
                      {item.auto === null ? (
                        <button
                          type="button"
                          onClick={() => toggleManual(ev.key, item.key)}
                          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={
                            checked
                              ? `${item.label} 완료 취소`
                              : `${item.label} 완료 표시`
                          }
                        >
                          {checked ? (
                            <CheckCircle2 size={13} className={ev.iconClass} />
                          ) : (
                            <Circle size={13} />
                          )}
                        </button>
                      ) : (
                        <span className="shrink-0">
                          {checked ? (
                            <CheckCircle2 size={13} className={ev.iconClass} />
                          ) : (
                            <Circle
                              size={13}
                              className="text-muted-foreground/40"
                            />
                          )}
                        </span>
                      )}
                      <span
                        className={`flex-1 text-xs ${
                          checked ? "text-muted-foreground line-through" : ""
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-1">
                        {item.auto !== null && (
                          <span className="text-[10px] text-muted-foreground">
                            자동
                          </span>
                        )}
                        {item.href && (
                          <Link
                            href={item.href}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={`${item.label} 바로가기`}
                          >
                            <ArrowRight size={11} />
                          </Link>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* M3: 다가오는 학사일정 요약 — semester 이벤트 카드 전용 */}
              {ev.key === "semester" && (
                upcomingCalendarItems.length > 0 ? (
                  <div className="mt-2 border-t border-muted-foreground/10 pt-2">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      학사일정 다가오는 항목
                    </p>
                    <ul className="space-y-0.5">
                      {upcomingCalendarItems.map((item) => (
                        <li
                          key={`${item.dateStr}-${item.label}`}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="text-foreground/80">{item.label}</span>
                          <span
                            className={`tabular-nums font-semibold ${
                              item.diff <= 7
                                ? "text-destructive"
                                : item.diff <= 30
                                  ? "text-warning"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {item.diff === 0 ? "D-DAY" : `D-${item.diff}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-2 border-t border-muted-foreground/10 pt-2">
                    <p className="text-[11px] text-muted-foreground">
                      학사일정을 등록하면 주요 일정이 자동 반영됩니다.
                    </p>
                    <Link
                      href="/console/academic-calendar"
                      className="mt-0.5 flex items-center gap-0.5 text-[11px] text-success hover:underline"
                    >
                      학사일정 등록 <ArrowRight size={10} />
                    </Link>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** H3: 처리 대기 통합 큐 — 가장 오래된 항목 경과일 표시 */
function oldestElapsedLabel(items: { createdAt?: string }[]): string | null {
  const timestamps = items
    .map((i) => (i.createdAt ? new Date(i.createdAt).getTime() : null))
    .filter((t): t is number => t !== null && !Number.isNaN(t));
  if (timestamps.length === 0) return null;
  const days = Math.floor((Date.now() - Math.min(...timestamps)) / 86400000);
  if (days <= 0) return "오늘 등록";
  if (days === 1) return "1일 경과";
  return `${days}일 경과`;
}

function StatCard({ icon: Icon, label, value, color, href }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border bg-card p-4">
      {href ? (
        <Link href={href} className="block hover:opacity-80 transition-opacity">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}

export default function ConsoleDashboardPage() {
  const { user } = useAuthStore();
  const { inquiries } = useInquiries();
  const { posts } = usePosts("all");

  // H1+M3: 다가오는 시즌 — 학사일정 데이터 전체를 UpcomingSeasonCard에 전달
  const { value: calendarData } = useAcademicCalendar();
  const unansweredCount = inquiries.filter((i) => i.status === "pending").length;
  const [seeding, setSeeding] = useState(false);
  // 시드 완료 상태 (localStorage 영속 + 세션 내 즉시 반영)
  const [seedDone, setSeedDone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("yedu_content_seed_done_v1") === "1";
    } catch {
      return false;
    }
  });

  async function handleSeedContent() {
    if (seedDone) {
      toast.info("모든 콘텐츠가 이미 등록되어 있습니다.");
      return;
    }
    setSeeding(true);
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/seed-board-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      const created = Number(data?.created ?? 0);
      const skipped = Number(data?.skipped ?? 0);
      const total = Number(data?.total ?? created + skipped);
      // 신규 등록이 0건 + 모두 skip → 완료 상태로 마킹
      if (created === 0 && skipped >= total && total > 0) {
        try {
          window.localStorage.setItem("yedu_content_seed_done_v1", "1");
        } catch {
          // ignore
        }
        setSeedDone(true);
        toast.info("모든 콘텐츠가 이미 등록되어 있습니다.");
      } else {
        toast.success(`${created}건 신규 등록 / ${skipped}건 기존 유지`);
        // 모두 처리 완료한 경우에도 잠금 (skipped + created = total)
        if (created + skipped >= total && total > 0) {
          try {
            window.localStorage.setItem("yedu_content_seed_done_v1", "1");
          } catch {
            // ignore
          }
          setSeedDone(true);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "콘텐츠 시드 등록 실패");
    } finally {
      setSeeding(false);
    }
  }

  const { data: membersData } = useQuery({
    queryKey: ["admin", "members"],
    queryFn: () => profilesApi.list({ limit: 0 }),
    retry: false,
  });
  const { data: pendingData } = useQuery({
    queryKey: ["admin", "pending"],
    queryFn: () => profilesApi.list({ "filter[approved]": "false", limit: 0 }),
    retry: false,
  });

  // H3: 처리 대기 통합 큐 — 포트폴리오 검증 (external_activities + awards)
  const { data: pfExternals = [] } = useQuery({
    queryKey: ["console", "pf-externals-pending"],
    queryFn: async () => {
      const r = await externalActivitiesApi.listPending();
      return r.data;
    },
    staleTime: 3 * 60 * 1000,
    retry: false,
  });
  const { data: pfAwards = [] } = useQuery({
    queryKey: ["console", "pf-awards-pending"],
    queryFn: async () => {
      const r = await awardsApi.listPending();
      return r.data;
    },
    staleTime: 3 * 60 * 1000,
    retry: false,
  });
  // H3: 처리 대기 통합 큐 — 미매핑 졸업논문 (alumni_theses)
  const { data: alumniUnmapped = [] } = useQuery({
    queryKey: ["console", "alumni-unmapped-pending"],
    queryFn: async () => {
      const r = await alumniThesesApi.listUnmapped();
      return r.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  // H3: 처리 대기 통합 큐 — 콘텐츠 초안 (content_drafts pending)
  const { data: pendingDrafts = [] } = useQuery({
    queryKey: ["console", "content-drafts-pending"],
    queryFn: fetchPendingDrafts,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const pfPendingCount = pfExternals.length + pfAwards.length;
  const alumniPendingCount = alumniUnmapped.length;
  const draftPendingCount = pendingDrafts.length;
  const totalManualQueueCount = pfPendingCount + alumniPendingCount + draftPendingCount;

  const pfOldest = oldestElapsedLabel([...pfExternals, ...pfAwards]);
  const alumniOldest = oldestElapsedLabel(alumniUnmapped);
  const draftOldest = oldestElapsedLabel(pendingDrafts);

  // Sprint UX-2: "오늘 처리할 일" 가시성 — 학술활동 pending 신청 총합 (1쿼리)
  const { data: pendingAppsCount = 0 } = useQuery({
    queryKey: ["console", "pending-applications-count"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "activity_applicants"));
      let count = 0;
      snap.forEach((d) => {
        const list = (d.data().applicants as { status?: string }[] | undefined) ?? [];
        count += list.filter((x) => x.status === "pending").length;
      });
      return count;
    },
    retry: false,
  });

  // Sprint UX-2: 예정 세미나의 기한 경과 미완료 타임라인 항목 총합 (academic-admin Dashboard 와 동일 기준)
  const { data: overdueTimelineCount = 0 } = useQuery({
    queryKey: ["console", "overdue-timeline-count"],
    queryFn: async () => {
      const res = await seminarsApi.list({ limit: 100 });
      const seminars = res.data as unknown as Seminar[];
      const now = new Date();
      let count = 0;
      for (const s of seminars) {
        if (getComputedStatus(s) !== "upcoming") continue;
        const timeline = s.timeline ?? [];
        const diffDays = Math.round((new Date(s.date).getTime() - now.getTime()) / 86400000);
        count += timeline.filter((t) => !t.done && t.dDay <= 0 && diffDays <= Math.abs(t.dDay)).length;
      }
      return count;
    },
    retry: false,
  });

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={LayoutDashboard}
        title="운영 콘솔"
        description={`${user?.name}님, 안녕하세요.`}
      />

      {(pendingData?.total ?? 0) > 0 && (
        <ActionableBanner
          kind="warning"
          title={`승인 대기 회원 ${pendingData?.total ?? 0}명`}
          description="새 가입 신청이 누적되어 있습니다. 자동 승인 가능한 회원도 함께 처리하세요."
          action={{ label: "회원 관리로 이동", href: "/console/members" }}
        />
      )}
      {unansweredCount > 0 && (
        <ActionableBanner
          kind="error"
          title={`미답변 문의 ${unansweredCount}건`}
          description="답변 대기 중인 회원 문의가 있습니다. 24시간 내 응답이 학회 운영 표준입니다."
          action={{ label: "문의 답변하기", href: "/console/inquiries" }}
        />
      )}
      {pendingAppsCount > 0 && (
        <ActionableBanner
          kind="warning"
          title={`학술활동 신청 처리 대기 ${pendingAppsCount}건`}
          description="프로젝트·스터디·대외 학술대회에 승인 대기 중인 신청이 있습니다."
          action={{ label: "신청 승인 대시보드", href: "/console/academic/applications" }}
        />
      )}
      {overdueTimelineCount > 0 && (
        <ActionableBanner
          kind="warning"
          title={`세미나 준비 기한 경과 ${overdueTimelineCount}건`}
          description="예정 세미나의 타임라인 준비 항목이 목표일을 지났습니다."
          action={{ label: "학술 대시보드 확인", href: "/console/academic/manage" }}
        />
      )}

      {/* H1: 다가오는 시즌 카운트다운 — 해커톤/개강 준비 역산 */}
      <UpcomingSeasonCard
        pendingMemberCount={pendingData?.total}
        calendarData={calendarData}
      />

      {/* H3: 처리 대기 통합 큐 — 침묵하는 수동 백로그 수확 */}
      {totalManualQueueCount > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Inbox size={16} className="text-warning" />
            <h2 className="text-sm font-semibold text-warning">처리 대기 통합 큐</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">
              총 {totalManualQueueCount}건 — 수동 개입 필요
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {pfPendingCount > 0 && (
              <Link
                href="/console/portfolio-verification"
                className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition-shadow hover:shadow-sm"
              >
                <div>
                  <p className="text-lg font-bold">{pfPendingCount}</p>
                  <p className="text-xs text-muted-foreground">포트폴리오 검증</p>
                  {pfOldest && (
                    <p className="mt-0.5 text-[10px] text-warning">{pfOldest}</p>
                  )}
                </div>
                <ArrowRight size={14} className="shrink-0 text-muted-foreground" />
              </Link>
            )}
            {alumniPendingCount > 0 && (
              <Link
                href="/console/alumni-mapping"
                className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition-shadow hover:shadow-sm"
              >
                <div>
                  <p className="text-lg font-bold">{alumniPendingCount}</p>
                  <p className="text-xs text-muted-foreground">미매핑 졸업논문</p>
                  {alumniOldest && (
                    <p className="mt-0.5 text-[10px] text-warning">{alumniOldest}</p>
                  )}
                </div>
                <ArrowRight size={14} className="shrink-0 text-muted-foreground" />
              </Link>
            )}
            {draftPendingCount > 0 && (
              <Link
                href="/console/content-drafts"
                className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition-shadow hover:shadow-sm"
              >
                <div>
                  <p className="text-lg font-bold">{draftPendingCount}</p>
                  <p className="text-xs text-muted-foreground">콘텐츠 초안</p>
                  {draftOldest && (
                    <p className="mt-0.5 text-[10px] text-warning">{draftOldest}</p>
                  )}
                </div>
                <ArrowRight size={14} className="shrink-0 text-muted-foreground" />
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="전체 회원" value={membersData?.total ?? 0} color="bg-info/5 text-info" href="/console/members" />
        <StatCard icon={Clock} label="승인 대기" value={pendingData?.total ?? 0} color="bg-warning/5 text-warning" href="/console/members" />
        <StatCard icon={FileText} label="게시글" value={posts.length} color="bg-green-50 text-green-600" href="/console/posts" />
        <StatCard icon={HelpCircle} label="미답변 문의" value={unansweredCount} color="bg-destructive/5 text-destructive" href="/console/inquiries" />
      </div>

      {!seedDone && (
        <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <FileUp size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">운영진 콘텐츠 시드 — 1-click 일괄 등록</p>
              <p className="text-xs text-muted-foreground">
                docs/board-content/ 의 운영진 콘텐츠 초안을 게시판에 한 번에 등록. Idempotent — 중복 등록되지 않습니다.
              </p>
            </div>
            <Button onClick={handleSeedContent} disabled={seeding} className="gap-1.5">
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
              {seeding ? "등록 중…" : "콘텐츠 일괄 등록"}
            </Button>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          신규 관리 도구
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/console/ai-forum"
            className="flex items-center gap-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Bot size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">AI 포럼 운영</p>
              <p className="text-xs text-muted-foreground">
                AI 자율 토론 — 등록·개최·중지·수동 진행
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              새 기능
            </span>
          </Link>

          <Link
            href="/console/roadmap"
            className="flex items-center gap-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Map size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">학기별 로드맵 관리</p>
              <p className="text-xs text-muted-foreground">
                디딤판 단계 카드 — 즉시 편집·순서 변경
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              새 기능
            </span>
          </Link>

          {/* Sprint 70: 신청 승인 통합 대시보드 — 단독 진입 가능 */}
          <Link
            href="/console/academic/applications"
            className="flex items-center gap-3 rounded-2xl border-2 border-warning/30 bg-warning/5 p-4 transition-shadow hover:shadow-md sm:col-span-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <ClipboardCheck size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">신청 승인 통합 대시보드</p>
              <p className="text-xs text-muted-foreground">
                모든 학술활동(외부·프로젝트·스터디)의 pending 신청자를 한 화면에서 확인·즉시 처리
              </p>
            </div>
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
              🆕 신설
            </span>
          </Link>
        </div>
      </div>

      {/* Sprint 70 신설 — 학술대회 운영 통합 (활동 상세 진입 후 사용) */}
      <div>
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-primary">
          🆕 학술대회 운영 통합
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          아래 4개 기능은 <strong className="text-foreground">활동 상세 페이지</strong> 진입 후 사용합니다. 카드를 클릭해 대외 학술대회 목록으로 이동 → 활동 클릭 → 상세 페이지 우측 운영 영역에서 진입 버튼 표시.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/console/academic/external"
            className="flex items-start gap-3 rounded-2xl border-2 border-info/20 bg-info/5 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
              <MessageSquareQuote size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">참석자 후기 모니터링</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                회원이 작성한 종합 후기·재참석 의사·연구 시사점·별점을 통계로 분석.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-semibold text-info">
              신설
            </span>
          </Link>

          <Link
            href="/console/academic/external"
            className="flex items-start gap-3 rounded-2xl border-2 border-success/20 bg-success/5 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
              <HeartHandshake size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">자원봉사자 운영</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                전체 봉사자 명부·역할·시간대·임무 체크 진행률 + 본부석 인쇄.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
              신설
            </span>
          </Link>

          <Link
            href="/console/academic/external"
            className="flex items-start gap-3 rounded-2xl border-2 border-cat-5/20 bg-cat-5/5 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cat-5/10 text-cat-5">
              <BarChart3 size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">세션 분석 통계</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                인기 세션 TOP 10·카테고리 분포·선택 이유 분포·출석률·평균 별점.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-cat-5/10 px-2 py-0.5 text-[10px] font-semibold text-cat-5">
              신설
            </span>
          </Link>

          <Link
            href="/console/academic/external"
            className="flex items-start gap-3 rounded-2xl border-2 border-destructive/20 bg-destructive/5 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <ListChecks size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">워크북 관리</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                과제 task CRUD + 제출 모니터링 + 검토 워크플로우.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
              console 통합
            </span>
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">오늘 할 일</h2>
        <AdminTodoTab />
      </div>
    </div>
  );
}
