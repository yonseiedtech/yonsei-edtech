"use client";

/**
 * 운영 콘솔 — 대외 학술대회 세션 분석 통계 (Sprint 70).
 *
 * 매칭 분석 GAP #5: 회원이 선택·참석·후기 기록한 세션 데이터(UserSessionPlan)를
 * 운영진이 한곳에서 통계로 확인 — 인기도·출석률·별점·선택 이유 분포·인사이트 작성률.
 * 학술대회 개최 후 콘텐츠 개선 의사결정 + 차회 운영 인사이트 도출용.
 */

import { use, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Star,
  NotebookPen,
  Sparkles,
  Users,
} from "lucide-react";
import {
  activitiesApi,
  conferenceProgramsApi,
  userSessionPlansApi,
} from "@/lib/bkend";
import {
  SESSION_SELECTION_REASONS,
  CONFERENCE_SESSION_CATEGORY_LABELS,
  type ConferenceProgram,
  type ConferenceSession,
  type UserSessionPlan,
  type ConferenceSessionCategory,
  type Activity,
} from "@/types";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import EmptyState from "@/components/ui/empty-state";

interface SessionStats {
  session: ConferenceSession;
  date?: string;
  planned: number;
  attended: number;
  skipped: number;
  attendanceRate: number | null; // 0~1, null = no plans
  avgRating: number | null;
  withNote: number;
  withInsights: number;
}

export default function ExternalActivitySessionAnalyticsConsole({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: activityId } = use(params);

  const { data: activity } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: () => activitiesApi.get(activityId) as Promise<Activity>,
    retry: false,
  });

  const { data: programRes } = useQuery({
    queryKey: ["conference-program", activityId],
    queryFn: () => conferenceProgramsApi.listByActivity(activityId),
    retry: false,
  });
  const program = ((programRes?.data ?? []) as ConferenceProgram[])[0];

  const { data: planRes, isLoading } = useQuery({
    queryKey: ["console", "session-plans", program?.id],
    queryFn: () => userSessionPlansApi.listByProgram(program!.id),
    enabled: !!program?.id,
    retry: false,
  });
  const plans = (planRes?.data ?? []) as UserSessionPlan[];

  // 모든 세션 평탄화 (date + session)
  const allSessions = useMemo<Array<{ date: string; session: ConferenceSession }>>(() => {
    if (!program?.days) return [];
    return program.days.flatMap((d) =>
      (d.sessions ?? []).map((s) => ({ date: d.date, session: s })),
    );
  }, [program]);

  // session 별 통계
  const sessionStats = useMemo<SessionStats[]>(() => {
    return allSessions.map(({ date, session }) => {
      const sessionPlans = plans.filter((p) => p.sessionId === session.id);
      const planned = sessionPlans.length;
      const attended = sessionPlans.filter((p) => p.status === "attended").length;
      const skipped = sessionPlans.filter((p) => p.status === "skipped").length;
      const ratings = sessionPlans
        .map((p) => p.rating)
        .filter((x): x is number => typeof x === "number" && x > 0);
      const avgRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;
      const withNote = sessionPlans.filter(
        (p) => (p.analysisNote ?? "").trim().length > 0 || (p.reflection ?? "").trim().length > 0,
      ).length;
      const withInsights = sessionPlans.filter((p) => (p.keyInsights?.length ?? 0) > 0).length;
      return {
        session,
        date,
        planned,
        attended,
        skipped,
        attendanceRate: planned > 0 ? attended / planned : null,
        avgRating,
        withNote,
        withInsights,
      };
    });
  }, [allSessions, plans]);

  // 전체 통계
  const overall = useMemo(() => {
    const uniqueUsers = new Set(plans.map((p) => p.userId)).size;
    const totalPlanned = plans.length;
    const totalAttended = plans.filter((p) => p.status === "attended").length;
    const totalRatings = plans
      .map((p) => p.rating)
      .filter((x): x is number => typeof x === "number" && x > 0);
    const avgOverallRating = totalRatings.length > 0
      ? totalRatings.reduce((a, b) => a + b, 0) / totalRatings.length
      : null;
    const totalWithNote = plans.filter(
      (p) => (p.analysisNote ?? "").trim().length > 0 || (p.reflection ?? "").trim().length > 0,
    ).length;
    return {
      uniqueUsers,
      totalPlanned,
      totalAttended,
      attendanceRate: totalPlanned > 0 ? totalAttended / totalPlanned : null,
      avgOverallRating,
      noteRate: totalPlanned > 0 ? totalWithNote / totalPlanned : null,
    };
  }, [plans]);

  // 선택 이유 분포
  const reasonStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of SESSION_SELECTION_REASONS) counts.set(r, 0);
    for (const p of plans) {
      const list = p.reasons ?? [];
      for (const r of list) {
        counts.set(r, (counts.get(r) ?? 0) + 1);
      }
    }
    return SESSION_SELECTION_REASONS
      .map((r) => ({ reason: r, count: counts.get(r) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [plans]);

  // 카테고리별 인기도
  const categoryStats = useMemo(() => {
    const counts = new Map<ConferenceSessionCategory, number>();
    for (const ss of sessionStats) {
      const cat = ss.session.category;
      counts.set(cat, (counts.get(cat) ?? 0) + ss.planned);
    }
    return Array.from(counts.entries())
      .map(([cat, count]) => ({
        category: cat,
        label: CONFERENCE_SESSION_CATEGORY_LABELS[cat],
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [sessionStats]);

  // 인기도 TOP 5
  const topSessions = useMemo(() => {
    return sessionStats
      .slice()
      .sort((a, b) => b.planned - a.planned)
      .filter((s) => s.planned > 0)
      .slice(0, 10);
  }, [sessionStats]);

  const maxPlannedAcrossAll = Math.max(1, ...sessionStats.map((s) => s.planned));
  const maxReasonCount = Math.max(1, ...reasonStats.map((r) => r.count));
  const maxCategoryCount = Math.max(1, ...categoryStats.map((c) => c.count));

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={BarChart3}
        title={`세션 분석 통계 — ${activity?.title ?? "대외 학술대회"}`}
        description="회원이 선택·참석·후기 기록한 세션 데이터(UserSessionPlan)를 통계로 분석. 차회 운영 인사이트 도출용."
      />

      <div className="flex items-center justify-between">
        <Link
          href={`/console/academic/external/${activityId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={12} /> 활동 상세로
        </Link>
        {program && (
          <Link
            href={`/activities/external/${activityId}/program`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            target="_blank"
          >
            사용자 세션 페이지 열기 ↗
          </Link>
        )}
      </div>

      {!program ? (
        <div className="rounded-2xl border bg-card p-5">
          <EmptyState
            icon={BarChart3}
            title="등록된 학술대회 프로그램이 없습니다"
            description="시간표(프로그램)를 먼저 등록하면 회원 세션 선택 데이터가 누적되고 본 통계에 표시됩니다."
          />
        </div>
      ) : isLoading ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-xs text-muted-foreground">
          분석 데이터 불러오는 중…
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border bg-card p-5">
          <EmptyState
            icon={Sparkles}
            title="아직 회원의 세션 선택이 없습니다"
            description="회원이 사용자 세션 페이지에서 관심 세션을 선택·참석 표시·후기를 기록하면 본 페이지에 통계가 누적됩니다."
          />
        </div>
      ) : (
        <>
          {/* 전체 지표 카드 */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              icon={Users}
              label="고유 참여자"
              value={String(overall.uniqueUsers)}
              hint={`총 ${overall.totalPlanned} 선택`}
              color="text-primary bg-primary/10"
            />
            <StatCard
              icon={CheckCircle2}
              label="평균 출석률"
              value={overall.attendanceRate != null ? `${Math.round(overall.attendanceRate * 100)}%` : "—"}
              hint={`${overall.totalAttended} / ${overall.totalPlanned}`}
              color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
            />
            <StatCard
              icon={Star}
              label="평균 별점"
              value={overall.avgOverallRating != null ? overall.avgOverallRating.toFixed(2) : "—"}
              hint="회원이 기록한 별점"
              color="text-amber-600 bg-amber-50 dark:bg-amber-950/30"
            />
            <StatCard
              icon={NotebookPen}
              label="노트 작성률"
              value={overall.noteRate != null ? `${Math.round(overall.noteRate * 100)}%` : "—"}
              hint="분석 노트·회고 보유"
              color="text-blue-600 bg-blue-50 dark:bg-blue-950/30"
            />
          </div>

          {/* 인기 세션 TOP 10 */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="text-sm font-bold">인기 세션 TOP {topSessions.length}</h2>
            </div>
            {topSessions.length === 0 ? (
              <p className="text-xs text-muted-foreground">선택된 세션이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {topSessions.map((s, i) => (
                  <li key={s.session.id} className="rounded-xl border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary tabular-nums">
                            {i + 1}
                          </span>
                          {s.session.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {s.date} · {s.session.startTime}~{s.session.endTime}
                          {s.session.track && ` · ${s.session.track}`}
                          {" · "}
                          {CONFERENCE_SESSION_CATEGORY_LABELS[s.session.category]}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-[11px]">
                        <p className="font-bold tabular-nums">{s.planned}명 선택</p>
                        <p className="text-muted-foreground tabular-nums">
                          출석 {s.attended}
                          {s.attendanceRate != null && ` (${Math.round(s.attendanceRate * 100)}%)`}
                        </p>
                        {s.avgRating != null && (
                          <p className="inline-flex items-center gap-0.5 text-amber-600">
                            <Star size={9} className="fill-current" />
                            {s.avgRating.toFixed(1)}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* 인기도 막대 */}
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(s.planned / maxPlannedAcrossAll) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 카테고리별 분포 */}
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">카테고리별 선택 분포</h2>
            <div className="space-y-1.5">
              {categoryStats.map((c) => (
                <div key={c.category} className="flex items-center gap-3 text-xs">
                  <span className="w-24 shrink-0 text-muted-foreground">{c.label}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(c.count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-semibold tabular-nums">{c.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 선택 이유 분포 */}
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">선택 이유 분포 (다중 선택)</h2>
            <div className="space-y-1.5">
              {reasonStats.map((r) => (
                <div key={r.reason} className="flex items-center gap-3 text-xs">
                  <span className="w-28 shrink-0 text-muted-foreground">{r.reason}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${(r.count / maxReasonCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-semibold tabular-nums">{r.count}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
              회원이 세션을 선택할 때 기록한 다중 이유(SESSION_SELECTION_REASONS). 개최 후 추천 알고리즘·홍보 톤 결정에 활용.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
          {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
