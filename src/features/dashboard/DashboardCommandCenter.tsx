"use client";

/**
 * 대시보드 3영역 종합 커맨드 센터 (사이클 81) — 대시보드 시각적 대개편
 * 대학원 생활 · 연구 활동 · 학술 활동을 그라데이션 카드로 한눈에 보여주고,
 * 각 영역의 핵심 수치와 바로가기를 제공해 회원이 계획·공부·소통하도록 한다.
 * 모바일에서는 1열로 스택, 데스크톱에서는 3열.
 */

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, FlaskConical, GraduationCap, ArrowRight, CalendarDays, BookOpen, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDday } from "@/lib/dday";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  networkingEventsApi,
  gradLifePositionsApi,
  researchPapersApi,
  seminarsApi,
} from "@/lib/bkend";
import { useWritingPaper } from "@/features/research/useWritingPaper";
import { computeThesisProgress } from "@/features/research/thesis-progress";
import type { NetworkingEvent, GradLifePosition, ResearchPaper, Seminar } from "@/types";

interface AreaStat {
  icon: typeof Users;
  label: string;
  href: string;
  cardClass: string;
  iconClass: string;
  accentText: string;
  primary: { value: string; caption: string };
  secondary?: { value: string; caption: string };
  cta: string;
  /** 임박 행사 D-day 배지 (≤7일 이내 가장 가까운 행사) */
  badge?: { label: string; name: string };
}

export default function DashboardCommandCenter() {
  const { user } = useAuthStore();
  const uid = user?.id ?? "";
  const nowIso = new Date().toISOString();

  // 대학원 생활
  const { data: events = [] } = useQuery({
    queryKey: ["dashboard-networking-events"],
    queryFn: async () => (await networkingEventsApi.listPublished()).data as NetworkingEvent[],
    staleTime: 3 * 60_000,
  });
  const { data: positions = [] } = useQuery({
    queryKey: ["dashboard-gradlife", uid],
    queryFn: async () => (await gradLifePositionsApi.listByUser(uid)).data as GradLifePosition[],
    enabled: !!uid,
    staleTime: 5 * 60_000,
  });
  // 연구 활동
  const { paper } = useWritingPaper(uid);
  const { data: papers = [] } = useQuery({
    queryKey: ["research-papers", uid],
    queryFn: async () => (await researchPapersApi.list(uid)).data as ResearchPaper[],
    enabled: !!uid,
    staleTime: 5 * 60_000,
  });
  // 학술 활동
  const { data: seminars = [] } = useQuery({
    queryKey: ["dashboard-upcoming-seminars"],
    queryFn: async () => (await seminarsApi.list({ limit: 100 })).data as Seminar[],
    staleTime: 3 * 60_000,
  });

  const stats = useMemo<AreaStat[]>(() => {
    const upcomingEvents = events.filter((e) => (e.endAt || e.startAt) >= nowIso && e.status !== "cancelled").length;
    const activePos = positions.filter((p) => !p.endYear).length;
    const writingPct = computeThesisProgress({ paper: paper ?? null, hasProposal: false }).percent;
    const readCount = (papers as { isDraft?: boolean; readStatus?: string }[]).filter((p) => !p.isDraft && p.readStatus === "completed").length;
    const upcomingSeminars = seminars.filter((s) => (s.date ?? "") >= nowIso.slice(0, 10)).length;

    // 임박 행사 D-day 배지 (≤7일) — 각 영역의 가장 가까운 미래 행사 (여정 문서 Medium·상황 D)
    const today = nowIso.slice(0, 10);
    const nextEvent = events
      .filter((e) => (e.startAt ?? "") >= nowIso && e.status !== "cancelled")
      .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""))[0];
    const eventDday = nextEvent?.startAt ? formatDday(nextEvent.startAt.slice(0, 10)) : null;
    const eventBadge =
      nextEvent && eventDday && eventDday.diffDays >= 0 && eventDday.diffDays <= 7
        ? { label: eventDday.kind === "today" ? "D-day" : eventDday.label, name: nextEvent.title }
        : undefined;
    const nextSeminar = seminars
      .filter((s) => (s.date ?? "") >= today)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0];
    const seminarDday = nextSeminar?.date ? formatDday(nextSeminar.date) : null;
    const seminarBadge =
      nextSeminar && seminarDday && seminarDday.diffDays >= 0 && seminarDday.diffDays <= 7
        ? { label: seminarDday.kind === "today" ? "D-day" : seminarDday.label, name: nextSeminar.title }
        : undefined;

    return [
      {
        icon: Users,
        label: "대학원 생활",
        href: "/gatherings",
        cardClass: "from-sky-500/10 to-sky-500/[0.02] border-sky-200/70 dark:border-sky-900/40",
        iconClass: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
        accentText: "text-sky-700 dark:text-sky-300",
        primary: { value: `${upcomingEvents}`, caption: "다가오는 모임" },
        secondary: { value: `${activePos}`, caption: "내 활동" },
        // 빈 상태(예정 모임·내 활동 모두 0): 시작 유도 문구로 분기 (여정 문서 High ①)
        cta: upcomingEvents === 0 && activePos === 0 ? "모임 둘러보기" : "모임·행사",
        badge: eventBadge,
      },
      {
        icon: FlaskConical,
        label: "연구 활동",
        href: "/mypage/research",
        cardClass: "from-violet-500/10 to-violet-500/[0.02] border-violet-200/70 dark:border-violet-900/40",
        iconClass: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
        accentText: "text-violet-700 dark:text-violet-300",
        primary: { value: `${writingPct}%`, caption: "논문 진행률" },
        secondary: { value: `${readCount}`, caption: "완독 논문" },
        // 아직 연구 시작 전(진행률·완독 0): 0% 부담을 시작 격려로 전환 (여정 문서 High ①)
        cta: writingPct === 0 && readCount === 0 ? "첫 논문 시작하기" : "나의 연구",
      },
      {
        icon: GraduationCap,
        label: "학술 활동",
        href: "/seminars",
        cardClass: "from-emerald-500/10 to-emerald-500/[0.02] border-emerald-200/70 dark:border-emerald-900/40",
        iconClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        accentText: "text-emerald-700 dark:text-emerald-300",
        primary: { value: `${upcomingSeminars}`, caption: "예정 세미나" },
        // 예정 세미나 없음: 둘러보기 유도 (여정 문서 High ①)
        cta: upcomingSeminars === 0 ? "세미나 둘러보기" : "세미나·활동",
        badge: seminarBadge,
      },
    ];
  }, [events, positions, paper, papers, seminars, nowIso]);

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={cn(
              "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
              s.cardClass,
            )}
          >
            <div className="flex items-start justify-between">
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", s.iconClass)}>
                <s.icon size={22} />
              </span>
              <ArrowRight
                size={16}
                className={cn("opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100", s.accentText)}
              />
            </div>
            <h3 className="mt-3 text-sm font-bold tracking-tight">{s.label}</h3>
            {s.badge && (
              <p
                className={cn(
                  "mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-bold",
                  s.accentText,
                )}
              >
                <CalendarDays size={10} className="shrink-0" />
                <span className="truncate">
                  {s.badge.label} · {s.badge.name}
                </span>
              </p>
            )}
            <div className="mt-2 flex items-end gap-4">
              <div>
                <p
                  className={cn(
                    "text-3xl font-extrabold leading-none tabular-nums",
                    // 빈 수치(0·0%)는 색을 옅게 — 부담 완화, 시작 CTA 와 함께 (여정 문서 High ①)
                    s.primary.value === "0" || s.primary.value === "0%"
                      ? "text-muted-foreground/40"
                      : s.accentText,
                  )}
                >
                  {s.primary.value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{s.primary.caption}</p>
              </div>
              {s.secondary && (
                <div className="border-l pl-4">
                  <p
                    className={cn(
                      "text-xl font-bold leading-none tabular-nums",
                      s.secondary.value === "0" ? "text-muted-foreground/40" : "text-foreground/70",
                    )}
                  >
                    {s.secondary.value}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{s.secondary.caption}</p>
                </div>
              )}
            </div>
            <p className={cn("mt-3 inline-flex items-center gap-1 text-xs font-semibold", s.accentText)}>
              {s.cta} 바로가기
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
