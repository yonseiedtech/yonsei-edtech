"use client";

/**
 * OperationalKpiSection — 운영진 분석 대시보드 핵심 KPI 섹션
 *
 * 5개 통계 카드 + 3개 차트:
 *   1. 신규 가입 (이번 달 / 지난달 대비 증감)
 *   2. 활성 활동 (recruiting + in_progress + ongoing 상태)
 *   3. 평균 세미나 출석률 (최근 3개월)
 *   4. 체크리스트 평균 완료율
 *   5. 개인화 적용률 (dashboardLayout 보유 회원 비율)
 *
 * 차트:
 *   - 월별 신규 가입 추세 (BarChart)
 *   - 최근 3개월 세미나 출석률 (LineChart)
 *   - 활동 유형별 분포 (BarChart)
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  activitiesApi,
  dataApi,
  onboardingChecklistApi,
  profilesApi,
  seminarsApi,
} from "@/lib/bkend";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Activity,
  CalendarCheck,
  CheckSquare,
  Download,
  Layout,
  Loader2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Minus,
} from "lucide-react";
import type { SeminarAttendee } from "@/types";
import type { OnboardingChecklistItem } from "@/types/onboarding-checklist";
import type { DashboardLayout } from "@/types/dashboard-layout";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminOrSysadmin } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { exportCSV } from "@/lib/export-csv";

// ── helpers ──────────────────────────────────────────────────────────────────

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [, m] = key.split("-");
  return `${Number(m)}월`;
}

/** 최근 N개월 키 배열 (오래된 순) */
function recentMonthKeys(n: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return keys;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  color: string;
  loading?: boolean;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  trendLabel,
  color,
  loading,
}: KpiCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}
        >
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
          {sub && (
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          )}
          {trendLabel && (
            <div className={`mt-1 flex items-center gap-1 text-xs ${trendColor}`}>
              <TrendIcon size={12} />
              <span>{trendLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OperationalKpiSection() {
  const { user } = useAuthStore();
  const canExport = isAdminOrSysadmin(user);

  // ── parallel queries ──
  const { data: membersRes, isLoading: membersLoading } = useQuery({
    queryKey: ["op-kpi", "members"],
    queryFn: () => profilesApi.list({ limit: 2000 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: activitiesRes, isLoading: activitiesLoading } = useQuery({
    queryKey: ["op-kpi", "activities"],
    queryFn: () => activitiesApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: seminarsRes, isLoading: seminarsLoading } = useQuery({
    queryKey: ["op-kpi", "seminars"],
    queryFn: () => seminarsApi.list({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: attendeesRes, isLoading: attendeesLoading } = useQuery({
    queryKey: ["op-kpi", "attendees"],
    queryFn: () =>
      dataApi.list<SeminarAttendee>("seminar_attendees", { limit: 5000 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: checklistRes } = useQuery({
    queryKey: ["op-kpi", "checklist"],
    queryFn: () => onboardingChecklistApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const members = membersRes?.data ?? [];
  const activities = activitiesRes?.data ?? [];
  const seminars = seminarsRes?.data ?? [];
  const attendees = attendeesRes?.data ?? [];
  const checklistItems = (checklistRes?.data ?? []) as OnboardingChecklistItem[];

  // ── KPI 계산 ──────────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    // 1. 신규 가입 추세 (12개월)
    const monthKeys12 = recentMonthKeys(12);
    const memberByMonth = new Map<string, number>(
      monthKeys12.map((k) => [k, 0]),
    );
    for (const m of members) {
      if (!m.createdAt) continue;
      const mk = monthKey(m.createdAt);
      if (memberByMonth.has(mk)) {
        memberByMonth.set(mk, (memberByMonth.get(mk) ?? 0) + 1);
      }
    }
    const memberGrowth = monthKeys12.map((k) => ({
      month: monthLabel(k),
      count: memberByMonth.get(k) ?? 0,
    }));
    const thisMonthNew = memberByMonth.get(thisMonthKey) ?? 0;
    const prevMonthNew = memberByMonth.get(prevMonthKey) ?? 0;
    const memberTrend: "up" | "down" | "neutral" =
      thisMonthNew > prevMonthNew
        ? "up"
        : thisMonthNew < prevMonthNew
          ? "down"
          : "neutral";
    const memberTrendLabel =
      prevMonthNew === 0
        ? "지난달 데이터 없음"
        : memberTrend === "up"
          ? `지난달 대비 +${thisMonthNew - prevMonthNew}명`
          : memberTrend === "down"
            ? `지난달 대비 ${thisMonthNew - prevMonthNew}명`
            : "지난달과 동일";

    // 2. 활성 활동 — recruitmentStatus: recruiting|in_progress OR status: ongoing
    const activeActivities = activities.filter((a) => {
      const rs = (a as { recruitmentStatus?: string }).recruitmentStatus;
      const st = (a as { status?: string }).status;
      return (
        rs === "recruiting" ||
        rs === "in_progress" ||
        st === "ongoing"
      );
    });

    // 활동 유형별 분포
    const typeCounts: Record<string, number> = { study: 0, project: 0, external: 0 };
    for (const a of activities) {
      const t = (a as { type?: string }).type ?? "external";
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    }
    const activityTypeChart = [
      { name: "스터디", count: typeCounts["study"] ?? 0 },
      { name: "프로젝트", count: typeCounts["project"] ?? 0 },
      { name: "대외활동", count: typeCounts["external"] ?? 0 },
    ];

    // 3. 세미나 출석률 최근 3개월
    const monthKeys3 = recentMonthKeys(3);
    const seminarAttendeeMap = new Map<string, { total: number; checkedIn: number }>();
    for (const a of attendees) {
      const stat = seminarAttendeeMap.get(a.seminarId) ?? { total: 0, checkedIn: 0 };
      stat.total++;
      if (a.checkedIn) stat.checkedIn++;
      seminarAttendeeMap.set(a.seminarId, stat);
    }

    const attendanceByMonth = new Map<string, { total: number; checkedIn: number }>(
      monthKeys3.map((k) => [k, { total: 0, checkedIn: 0 }]),
    );
    for (const s of seminars) {
      if (!s.date) continue;
      const mk = monthKey(s.date);
      if (!attendanceByMonth.has(mk)) continue;
      const entry = attendanceByMonth.get(mk)!;
      const stat = seminarAttendeeMap.get(s.id);
      if (stat) {
        entry.total += stat.total;
        entry.checkedIn += stat.checkedIn;
      }
    }
    const seminarAttendanceChart = monthKeys3.map((k) => {
      const entry = attendanceByMonth.get(k)!;
      const rate =
        entry.total > 0
          ? Math.round((entry.checkedIn / entry.total) * 100)
          : 0;
      return { month: monthLabel(k), rate, total: entry.total, checkedIn: entry.checkedIn };
    });

    const recentAttendanceRates = seminarAttendanceChart.filter((d) => d.total > 0);
    const avgAttendanceRate =
      recentAttendanceRates.length > 0
        ? Math.round(
            recentAttendanceRates.reduce((s, d) => s + d.rate, 0) /
              recentAttendanceRates.length,
          )
        : 0;

    // 4. 체크리스트 완료율 — 항목 수 대비 enabled 비율 (proxy: enabled 항목 비율)
    const enabledItems = checklistItems.filter((it) => it.enabled !== false);
    const checklistRate =
      checklistItems.length > 0
        ? Math.round((enabledItems.length / checklistItems.length) * 100)
        : 0;

    // 5. 개인화 적용률 — dashboardLayout 있는 회원 비율
    const approvedMembers = members.filter((m) => m.approved);
    const withLayout = approvedMembers.filter(
      (m) =>
        (m as { dashboardLayout?: DashboardLayout }).dashboardLayout != null,
    );
    const personalizationRate =
      approvedMembers.length > 0
        ? Math.round((withLayout.length / approvedMembers.length) * 100)
        : 0;

    return {
      thisMonthNew,
      memberTrend,
      memberTrendLabel,
      memberGrowth,
      activeActivityCount: activeActivities.length,
      totalActivityCount: activities.length,
      activityTypeChart,
      avgAttendanceRate,
      seminarAttendanceChart,
      checklistRate,
      enabledItemCount: enabledItems.length,
      totalItemCount: checklistItems.length,
      personalizationRate,
      withLayoutCount: withLayout.length,
      approvedMemberCount: approvedMembers.length,
    };
  }, [members, activities, seminars, attendees, checklistItems]);

  const isLoading =
    membersLoading || activitiesLoading || seminarsLoading || attendeesLoading;

  // ── CSV 내보내기 (집계 데이터만 — 개인정보 미포함) ──────────────────────────
  // 학과 제출·보고·백업용. 회원 이름·식별자 등 PII 없이 운영 KPI 집계만 내보낸다.
  function downloadCsv() {
    const rows: (string | number)[][] = [];
    rows.push(["[요약 지표]", ""]);
    rows.push(["이번 달 신규 가입", kpi.thisMonthNew]);
    rows.push(["활성 활동 수", kpi.activeActivityCount]);
    rows.push(["전체 활동 수", kpi.totalActivityCount]);
    rows.push(["평균 세미나 출석률(%)", kpi.avgAttendanceRate]);
    rows.push(["체크리스트 활성률(%)", kpi.checklistRate]);
    rows.push(["개인화 적용률(%)", kpi.personalizationRate]);
    rows.push(["", ""]);
    rows.push(["[월별 신규 가입]", ""]);
    for (const m of kpi.memberGrowth) rows.push([m.month, m.count]);
    rows.push(["", ""]);
    rows.push(["[세미나 출석률(최근 3개월)]", "", ""]);
    rows.push(["월", "출석률(%)", "대상/체크인"]);
    for (const s of kpi.seminarAttendanceChart) {
      rows.push([s.month, s.rate, `${s.checkedIn}/${s.total}`]);
    }
    rows.push(["", ""]);
    rows.push(["[활동 유형별 분포]", ""]);
    for (const a of kpi.activityTypeChart) rows.push([a.name, a.count]);

    exportCSV("operational-kpi", ["항목", "값", "비고"], rows);
  }

  return (
    <div className="space-y-6">
      {/* 헤더 + CSV 내보내기 (admin 전용 · 집계 데이터만) */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          운영 KPI 집계 지표 — 학과 제출·보고·백업용
        </p>
        {canExport && (
          <Button
            size="sm"
            variant="outline"
            onClick={downloadCsv}
            disabled={isLoading}
          >
            <Download size={12} className="mr-1" />
            CSV
          </Button>
        )}
      </div>

      {/* KPI 카드 그리드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={UserPlus}
          label="이번 달 신규 가입"
          value={kpi.thisMonthNew}
          trend={kpi.memberTrend}
          trendLabel={kpi.memberTrendLabel}
          color="bg-cat-1/5 text-cat-1"
          loading={membersLoading}
        />
        <KpiCard
          icon={Activity}
          label="활성 활동"
          value={kpi.activeActivityCount}
          sub={`전체 ${kpi.totalActivityCount}건 중`}
          color="bg-cat-5/5 text-cat-5"
          loading={activitiesLoading}
        />
        <KpiCard
          icon={CalendarCheck}
          label="평균 세미나 출석률"
          value={isLoading ? "-" : `${kpi.avgAttendanceRate}%`}
          sub="최근 3개월"
          color="bg-success/5 text-success"
          loading={seminarsLoading || attendeesLoading}
        />
        <KpiCard
          icon={CheckSquare}
          label="체크리스트 활성률"
          value={`${kpi.checklistRate}%`}
          sub={`${kpi.enabledItemCount} / ${kpi.totalItemCount} 항목`}
          color="bg-warning/5 text-warning"
        />
        <KpiCard
          icon={Layout}
          label="개인화 적용률"
          value={`${kpi.personalizationRate}%`}
          sub={`${kpi.withLayoutCount} / ${kpi.approvedMemberCount} 명`}
          color="bg-info/5 text-info"
          loading={membersLoading}
        />
      </div>

      {/* 차트 행 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="월별 신규 가입 추세 (최근 12개월)">
          {membersLoading ? (
            <div className="flex h-[220px] items-center justify-center">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={kpi.memberGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name="신규 가입"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="세미나 출석률 추세 (최근 3개월)">
          {seminarsLoading || attendeesLoading ? (
            <div className="flex h-[220px] items-center justify-center">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : kpi.seminarAttendanceChart.every((d) => d.total === 0) ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              최근 3개월 세미나 출석 데이터가 없습니다.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={kpi.seminarAttendanceChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "출석률"]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name="출석률 (%)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* 차트 행 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="활동 유형별 분포">
          {activitiesLoading ? (
            <div className="flex h-[220px] items-center justify-center">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={kpi.activityTypeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name="활동 수"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 개인화 적용률 텍스트 카드 */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">대시보드 개인화 현황</h3>
          {membersLoading ? (
            <div className="flex h-[180px] items-center justify-center">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-info">
                  {kpi.personalizationRate}%
                </span>
                <span className="mb-1 text-sm text-muted-foreground">
                  승인 회원 중 개인화 레이아웃 저장
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-info transition-all"
                  style={{ width: `${kpi.personalizationRate}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {kpi.withLayoutCount}명이 대시보드 위젯 배치를 직접 저장했습니다.
                (전체 승인 회원 {kpi.approvedMemberCount}명 중)
              </p>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">체크리스트 항목 현황</p>
                <p>
                  활성 항목 {kpi.enabledItemCount}개 / 전체 {kpi.totalItemCount}개
                  {kpi.totalItemCount > 0 &&
                    ` — 활성률 ${kpi.checklistRate}%`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
