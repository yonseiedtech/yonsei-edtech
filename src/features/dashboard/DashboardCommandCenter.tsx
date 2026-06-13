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
        cta: "모임·네트워킹",
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
        cta: "나의 연구",
      },
      {
        icon: GraduationCap,
        label: "학술 활동",
        href: "/seminars",
        cardClass: "from-emerald-500/10 to-emerald-500/[0.02] border-emerald-200/70 dark:border-emerald-900/40",
        iconClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        accentText: "text-emerald-700 dark:text-emerald-300",
        primary: { value: `${upcomingSeminars}`, caption: "예정 세미나" },
        cta: "세미나·활동",
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
            <div className="mt-2 flex items-end gap-4">
              <div>
                <p className={cn("text-3xl font-extrabold leading-none tabular-nums", s.accentText)}>{s.primary.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{s.primary.caption}</p>
              </div>
              {s.secondary && (
                <div className="border-l pl-4">
                  <p className="text-xl font-bold leading-none tabular-nums text-foreground/70">{s.secondary.value}</p>
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
