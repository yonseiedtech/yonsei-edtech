"use client";

/**
 * WeeklyOperationsSummary — 주간 운영 요약 단일 대시보드 (백로그 H4).
 *
 * 소수 운영진의 의사결정 시간을 단축하기 위해, 콘솔 여러 화면을 순회하지 않고
 * 한 화면에서 운영 핵심 지표 4종을 집계한다:
 *   1. 신규 회원      — 최근 7일/30일 가입 + 승인 대기(신뢰도 분리)
 *   2. 활동 추이      — 최근 30일 vs 이전 30일 활동 모멘텀(상승/하강/휴면)
 *   3. 이탈 위험      — 활동 모멘텀 falling/inactive + 장기 미접속 승인 회원
 *   4. 미응답 신청    — 가입 대기 + 학술활동 pending 신청 누적
 *
 * 모든 데이터는 기존 insights/member api 를 읽기 전용으로 재사용한다.
 *  - useMemberMetrics: 회원·활동 모멘텀(12개 컬렉션 집계, 5분 캐시)
 *  - usePendingMembers + partitionPending: 가입 대기 + 자동 매칭 신뢰도
 *  - activitiesApi + activityApplicantsApi: 활동별 pending 신청
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  UserPlus,
  Activity as ActivityIcon,
  AlertTriangle,
  Inbox,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { activitiesApi, activityApplicantsApi } from "@/lib/bkend";
import { usePendingMembers, useAllMembers } from "@/features/member/useMembers";
import { partitionPending } from "@/lib/auth/approval-rules";
import { useMemberMetrics } from "./useMemberMetrics";
import type { Activity, ActivityType, User } from "@/types";

const DAY_MS = 86_400_000;

function daysSince(iso?: string, nowMs = Date.now()): number {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Infinity;
  return Math.max(0, Math.floor((nowMs - t) / DAY_MS));
}

function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

const TYPE_CONSOLE_SEGMENT: Record<ActivityType, string> = {
  external: "external",
  project: "projects",
  study: "studies",
};

const TYPE_LABEL: Record<ActivityType, string> = {
  external: "대외 학술대회",
  project: "프로젝트",
  study: "스터디",
};

// ── 요약 카드 (상단 4종) ──
interface SummaryCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  loading?: boolean;
}

function SummaryCard({ icon: Icon, label, value, sub, color, loading }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="flex h-8 items-center">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <p className="truncate text-2xl font-bold">{value}</p>
          )}
          <p className="text-sm text-muted-foreground">{label}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon size={16} className="text-muted-foreground" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function WeeklyOperationsSummary() {
  // 렌더마다 흔들리지 않도록 마운트 시점의 기준 시각을 한 번만 고정 (집계 기준일).
  const [nowMs] = useState(() => Date.now());

  // ── 회원·활동 모멘텀 (기존 insights 훅 재사용) ──
  const { rows, momentumByUser, isLoading: metricsLoading } = useMemberMetrics(true);

  // ── 승인 대기 회원 + 자동 매칭 신뢰도 ──
  const { pendingMembers, isLoading: pendingLoading } = usePendingMembers();
  const { members: allMembers } = useAllMembers();

  const truePending = useMemo(
    () => pendingMembers.filter((m) => !m.rejected),
    [pendingMembers],
  );
  const { qualifying, risky } = useMemo(
    () => partitionPending(truePending, allMembers),
    [truePending, allMembers],
  );

  // ── 학술활동 pending 신청 ──
  const { data: activities = [], isLoading: actsLoading } = useQuery({
    queryKey: ["weekly-ops", "activities"],
    queryFn: async () => {
      const [external, project, study] = await Promise.all([
        activitiesApi.list("external"),
        activitiesApi.list("project"),
        activitiesApi.list("study"),
      ]);
      return [...external.data, ...project.data, ...study.data] as Activity[];
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: applicantsByActivity = {}, isLoading: applicantsLoading } = useQuery({
    queryKey: ["weekly-ops", "applicants", activities.map((a) => a.id).join(",")],
    enabled: activities.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const map: Record<string, { status?: string }[]> = {};
      await Promise.all(
        activities.map(async (a) => {
          map[a.id] = await activityApplicantsApi.get(a.id);
        }),
      );
      return map;
    },
  });

  // ── 1. 신규 회원 (가입일 기반) ──
  const newMembers = useMemo(() => {
    let last7 = 0;
    let last30 = 0;
    for (const m of allMembers) {
      const d = daysSince(m.createdAt, nowMs);
      if (d <= 7) last7 += 1;
      if (d <= 30) last30 += 1;
    }
    return { last7, last30 };
  }, [allMembers, nowMs]);

  // ── 2. 활동 추이 (모멘텀 집계) ──
  const activityTrend = useMemo(() => {
    let rising = 0;
    let falling = 0;
    let flat = 0;
    let recentEvents = 0;
    let prevEvents = 0;
    for (const m of momentumByUser.values()) {
      recentEvents += m.recentCount;
      prevEvents += m.prevCount;
      if (m.trend === "rising") rising += 1;
      else if (m.trend === "falling") falling += 1;
      else if (m.trend === "flat") flat += 1;
    }
    const activeMembers = rising + falling + flat;
    const delta = recentEvents - prevEvents;
    return { rising, falling, flat, recentEvents, prevEvents, activeMembers, delta };
  }, [momentumByUser]);

  // ── 3. 이탈 위험 (활동 하강·휴면 + 장기 미접속 승인 회원) ──
  const churnRisk = useMemo(() => {
    const byId = new Map(rows.map((r) => [r.userId, r]));
    const list: {
      user: User;
      reason: string;
      daysSinceLogin: number;
      trend?: "falling" | "inactive";
    }[] = [];
    for (const m of allMembers) {
      if (!m.approved || m.rejected) continue;
      // 신규(가입 30일 이내)는 이탈 위험에서 제외 — 온보딩 단계
      if (daysSince(m.createdAt, nowMs) <= 30) continue;
      const mom = momentumByUser.get(m.id);
      const row = byId.get(m.id);
      const dLogin = daysSince(m.lastLoginAt, nowMs);

      // 위험 신호: 최근 30일 활동 0 (이전엔 있었거나) + 60일+ 미접속
      const momFalling = mom?.trend === "falling";
      const momInactive = !mom || mom.recentCount === 0;
      const longInactive = dLogin >= 60;

      // at_risk/dormant segment 이면서 최근 활동 없음 OR 장기 미접속
      const risky =
        (momInactive && (row?.segment === "at_risk" || row?.segment === "dormant")) ||
        (momInactive && longInactive) ||
        momFalling;

      if (!risky) continue;
      list.push({
        user: m,
        reason: momFalling
          ? "활동 감소"
          : longInactive
            ? "장기 미접속"
            : "최근 30일 활동 없음",
        daysSinceLogin: dLogin,
        trend: momFalling ? "falling" : "inactive",
      });
    }
    // 미접속 오래된 순 정렬
    list.sort((a, b) => b.daysSinceLogin - a.daysSinceLogin);
    return list;
  }, [allMembers, rows, momentumByUser, nowMs]);

  // ── 4. 미응답 신청 (학술활동 pending) ──
  const pendingActivities = useMemo(() => {
    return activities
      .map((a) => {
        const applicants = applicantsByActivity[a.id] ?? [];
        const pending = applicants.filter((x) => x.status === "pending").length;
        return { activity: a, pendingCount: pending };
      })
      .filter((x) => x.pendingCount > 0)
      .sort((a, b) => b.pendingCount - a.pendingCount);
  }, [activities, applicantsByActivity]);

  const totalActivityPending = useMemo(
    () => pendingActivities.reduce((acc, x) => acc + x.pendingCount, 0),
    [pendingActivities],
  );

  const isLoading = metricsLoading || pendingLoading;

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="rounded-xl border border-dashed bg-muted/10 p-3 text-[11px] leading-relaxed text-muted-foreground">
        한 화면에서 <strong className="text-foreground">신규 회원 · 활동 추이 · 이탈 위험 · 미응답 신청</strong>{" "}
        4개 운영 지표를 집계합니다. 데이터는 5분간 캐시되며, 항목 클릭 시 해당 처리 화면으로 이동합니다.
      </div>

      {/* 상단 요약 4종 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={UserPlus}
          label="신규 회원 (최근 7일)"
          value={newMembers.last7}
          sub={`최근 30일 ${newMembers.last30}명`}
          color="bg-cat-1/5 text-cat-1"
          loading={metricsLoading}
        />
        <SummaryCard
          icon={ActivityIcon}
          label="활동 모멘텀 (30일)"
          value={`${activityTrend.delta >= 0 ? "+" : ""}${activityTrend.delta}`}
          sub={`이벤트 ${activityTrend.recentEvents} (이전 ${activityTrend.prevEvents})`}
          color="bg-cat-5/5 text-cat-5"
          loading={metricsLoading}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="이탈 위험 회원"
          value={churnRisk.length}
          sub="활동 감소·장기 미접속"
          color="bg-destructive/5 text-destructive"
          loading={metricsLoading}
        />
        <SummaryCard
          icon={Inbox}
          label="미응답 신청"
          value={truePending.length + totalActivityPending}
          sub={`가입 ${truePending.length} · 활동 ${totalActivityPending}`}
          color="bg-warning/5 text-warning"
          loading={isLoading || actsLoading || applicantsLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 1. 신규 회원 + 승인 대기 신뢰도 */}
        <SectionCard
          title="신규 회원 · 가입 승인 대기"
          icon={UserPlus}
          action={
            <Link
              href="/console/members"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              회원 관리 <ArrowRight size={12} />
            </Link>
          }
        >
          {/* 승인 대기 신뢰도 분리 */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-success/20 bg-success/5 p-3">
              <p className="flex items-center gap-1 text-xs font-medium text-success">
                <ShieldCheck size={13} /> 자동 승인 가능
              </p>
              <p className="mt-1 text-xl font-bold text-success">
                {qualifying.length}
                <span className="ml-1 text-xs font-normal text-muted-foreground">명</span>
              </p>
            </div>
            <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
              <p className="flex items-center gap-1 text-xs font-medium text-warning">
                <AlertTriangle size={13} /> 수동 검토 필요
              </p>
              <p className="mt-1 text-xl font-bold text-warning">
                {risky.length}
                <span className="ml-1 text-xs font-normal text-muted-foreground">명</span>
              </p>
            </div>
          </div>

          {pendingLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground">불러오는 중…</div>
          ) : truePending.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              승인 대기 중인 가입 신청이 없습니다.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {truePending.slice(0, 6).map((u) => {
                const isQualifying = qualifying.some((q) => q.id === u.id);
                return (
                  <li
                    key={u.id}
                    className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {u.studentId ? `${u.studentId} · ` : ""}
                        {u.email || "-"} · {formatDate(u.createdAt)} 가입
                      </p>
                    </div>
                    <span
                      className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isQualifying
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {isQualifying ? "신뢰" : "검토"}
                    </span>
                  </li>
                );
              })}
              {truePending.length > 6 && (
                <li className="pt-1 text-center text-[11px] text-muted-foreground">
                  외 {truePending.length - 6}명 — 회원 관리에서 일괄 처리
                </li>
              )}
            </ul>
          )}
        </SectionCard>

        {/* 2. 활동 추이 */}
        <SectionCard title="활동 추이 (최근 30일 vs 이전 30일)" icon={ActivityIcon}>
          {metricsLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground">집계 중…</div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-success/5 p-3 text-center">
                  <TrendingUp size={16} className="mx-auto text-success" />
                  <p className="mt-1 text-lg font-bold text-success">
                    {activityTrend.rising}
                  </p>
                  <p className="text-[10px] text-muted-foreground">상승</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <Minus size={16} className="mx-auto text-muted-foreground" />
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {activityTrend.flat}
                  </p>
                  <p className="text-[10px] text-muted-foreground">유지</p>
                </div>
                <div className="rounded-lg bg-destructive/5 p-3 text-center">
                  <TrendingDown size={16} className="mx-auto text-destructive" />
                  <p className="mt-1 text-lg font-bold text-destructive">
                    {activityTrend.falling}
                  </p>
                  <p className="text-[10px] text-muted-foreground">하강</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                최근 60일 내 활동한 회원{" "}
                <strong className="text-foreground">{activityTrend.activeMembers}명</strong> 중,
                활동 이벤트는 직전 30일 대비{" "}
                <strong
                  className={
                    activityTrend.delta > 0
                      ? "text-success"
                      : activityTrend.delta < 0
                        ? "text-destructive"
                        : "text-foreground"
                  }
                >
                  {activityTrend.delta >= 0 ? "+" : ""}
                  {activityTrend.delta}건
                </strong>{" "}
                ({activityTrend.recentEvents}건 vs {activityTrend.prevEvents}건)
                {activityTrend.delta < 0 && " — 참여 독려 필요"}
              </div>
            </div>
          )}
        </SectionCard>

        {/* 3. 이탈 위험 회원 */}
        <SectionCard
          title="이탈 위험 회원"
          icon={AlertTriangle}
          action={
            <span className="text-[11px] text-muted-foreground">
              승인 회원 한정 · 신규 30일 제외
            </span>
          }
        >
          {metricsLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground">집계 중…</div>
          ) : churnRisk.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              이탈 위험 신호가 감지된 회원이 없습니다.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {churnRisk.slice(0, 7).map(({ user, reason, daysSinceLogin }) => (
                <li key={user.id}>
                  <Link
                    href={`/console/members/${user.id}`}
                    className="group flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:border-destructive/20"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium transition-colors group-hover:text-destructive">
                        {user.name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {reason}
                        {Number.isFinite(daysSinceLogin)
                          ? ` · ${daysSinceLogin}일 미접속`
                          : " · 접속 기록 없음"}
                      </p>
                    </div>
                    <span className="ml-2 shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                      위험
                    </span>
                  </Link>
                </li>
              ))}
              {churnRisk.length > 7 && (
                <li className="pt-1 text-center text-[11px] text-muted-foreground">
                  외 {churnRisk.length - 7}명
                </li>
              )}
            </ul>
          )}
        </SectionCard>

        {/* 4. 미응답 신청 */}
        <SectionCard
          title="미응답 신청 (학술활동)"
          icon={Inbox}
          action={
            <Link
              href="/console/academic/applications"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              신청 승인 <ArrowRight size={12} />
            </Link>
          }
        >
          {actsLoading || applicantsLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground">불러오는 중…</div>
          ) : pendingActivities.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              처리 대기 중인 활동 신청이 없습니다.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {pendingActivities.slice(0, 7).map(({ activity, pendingCount }) => {
                const detailHref = `/console/academic/${TYPE_CONSOLE_SEGMENT[activity.type] ?? "external"}/${activity.id}`;
                return (
                  <li key={activity.id}>
                    <Link
                      href={detailHref}
                      className="group flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:border-warning/20"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium transition-colors group-hover:text-warning">
                          {activity.title}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {TYPE_LABEL[activity.type] ?? activity.type}
                          {activity.date ? ` · ${formatDate(activity.date)}` : ""}
                        </p>
                      </div>
                      <span className="ml-2 shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                        <Clock size={10} className="-mt-0.5 mr-0.5 inline" />
                        {pendingCount}건
                      </span>
                    </Link>
                  </li>
                );
              })}
              {pendingActivities.length > 7 && (
                <li className="pt-1 text-center text-[11px] text-muted-foreground">
                  외 {pendingActivities.length - 7}건
                </li>
              )}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
