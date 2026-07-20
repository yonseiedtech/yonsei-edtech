"use client";

/**
 * /console/cron-logs — cron 실행 이력 조회 (admin)
 *
 * push_logs 컬렉션을 종류(kind)별로 집계하고 최근 100건의 발송 내역을 표시.
 * - 종류별 합계 표 (총 발송수, 마지막 실행 시각)
 * - 최근 발송 리스트 (시각·종류·발송수·attempted)
 * - kind 필터 드롭다운
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ScrollText,
  RefreshCw,
  Calendar,
  Mail,
  Bell,
  Filter,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { dataApi } from "@/lib/bkend";
import { auth } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminOrSysadmin } from "@/lib/permissions";

interface PushLog {
  id: string;
  kind?: string;
  sentAt?: string;
  attempted?: number;
  successful?: number;
  activityId?: string;
  activityProgressId?: string;
  assignmentId?: string;
  seminarId?: string;
  userId?: string;
  date?: string;
  /** newcomer_sequence 전용 — 단계 키 (d1/d3/d7/d10/d14) */
  step?: string;
  /** newcomer_sequence 전용 — 발송 대상 학기 키 */
  semKey?: string;
}

/** M4(v11): 신입 시퀀스 단계 메타 */
const NEWCOMER_SEQ_STEPS: { step: string; label: string }[] = [
  { step: "d1",  label: "D+1 프로필 완성" },
  { step: "d3",  label: "D+3 온보딩 시작" },
  { step: "d7",  label: "D+7 연구 준비도 진단" },
  { step: "d10", label: "D+10 아카이브 즐겨찾기" },
  { step: "d14", label: "D+14 첫 2주 회고" },
];

/**
 * M4(v11): 신입 첫 2주 시퀀스 단계별 발송 현황 소표면.
 * 부모 `CronLogsPage` 가 이미 fetch 한 push_logs 200건을 props 로 받아
 * kind=newcomer_sequence 인 레코드를 step 별로 집계한다 — 신규 쿼리·컬렉션 없음.
 */
function NewcomerSequenceStatusSection({ logs, isLoading }: { logs: PushLog[]; isLoading: boolean }) {
  const seqLogs = useMemo(
    () => logs.filter((l) => l.kind === "newcomer_sequence"),
    [logs],
  );

  const byStep = useMemo(() => {
    const map = new Map<string, { count: number; lastSentAt: string; semKey: string }>();
    for (const l of seqLogs) {
      const s = l.step ?? "(unknown)";
      const prev = map.get(s) ?? { count: 0, lastSentAt: "", semKey: "" };
      const sentAt = l.sentAt ?? "";
      map.set(s, {
        count: prev.count + 1,
        lastSentAt: sentAt > prev.lastSentAt ? sentAt : prev.lastSentAt,
        semKey: sentAt > prev.lastSentAt ? (l.semKey ?? "") : prev.semKey,
      });
    }
    return NEWCOMER_SEQ_STEPS.map(({ step, label }) => ({
      step,
      label,
      ...(map.get(step) ?? { count: 0, lastSentAt: "", semKey: "" }),
    }));
  }, [seqLogs]);

  const total = seqLogs.length;

  return (
    <div className="rounded-2xl border bg-card p-4">
      <h2 className="mb-2 flex flex-wrap items-center gap-1 text-xs font-semibold">
        <Mail size={12} />
        신입 첫 2주 시퀀스 발송 현황
        <Badge variant="outline" className="text-[10px]">
          push_logs · newcomer_sequence
        </Badge>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {total > 0 ? `총 ${total}건 (최근 200건 기준)` : "발송 이력 없음"}
        </span>
      </h2>
      {isLoading ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          <Loader2 size={12} className="mx-auto mb-1 animate-spin" /> 불러오는 중…
        </p>
      ) : total === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          신입 시퀀스 발송 이력이 없습니다. cron 이 실행되면 자동 집계됩니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[11px]">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-2 font-medium">단계</th>
                <th className="py-1 px-2 text-right font-medium">발송 건수</th>
                <th className="py-1 px-2 font-medium">최근 발송</th>
                <th className="py-1 pl-2 font-medium">학기</th>
              </tr>
            </thead>
            <tbody>
              {byStep.map((r) => (
                <tr key={r.step} className="border-b last:border-b-0">
                  <td className="py-1.5 pr-2">
                    <code className="rounded bg-muted px-1 text-[10px]">{r.step}</code>
                    <span className="ml-1.5 text-muted-foreground">{r.label}</span>
                  </td>
                  <td className="py-1.5 px-2 text-right font-medium">
                    {r.count > 0 ? (
                      <span className="text-foreground">{r.count}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-muted-foreground">
                    {r.lastSentAt
                      ? new Date(r.lastSentAt).toLocaleString("ko-KR")
                      : "—"}
                  </td>
                  <td className="py-1.5 pl-2 text-muted-foreground">
                    {r.semKey || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** cron_runs 컬렉션 kind별 집계 (서버 /api/console/cron-runs 반환) */
interface KindStatus {
  kind: string;
  lastRunAt: string;
  lastSuccess: boolean;
  lastDurationMs: number;
  consecutiveFailures: number;
  lastErrorMessage?: string;
  lastSummary: Record<string, number>;
  /** v9-M1: 기대 주기 × 2 초과 침묵 여부 */
  isStale?: boolean;
}

/** v12-H2: cron 추세 — 일별 집계 버킷 */
interface DayBucket {
  date: string;
  total: number;
  success: number;
  /** 0~100, -1 = 실행 없음 */
  successRate: number;
  avgMs: number;
}

/** v12-H2: kind별 성공률 시계열 */
interface KindTrend {
  kind: string;
  days: DayBucket[];
  /** 전체 기간 성공률 0~100, -1 = 데이터없음 */
  overallSuccessRate: number;
  /** 후반 절반이 전반보다 10%p 이상 하락 시 true */
  degraded: boolean;
}

/** v12-H2: kind별 스파크라인 행 */
function KindTrendRow({ trend, days }: { trend: KindTrend; days: number }) {
  const { kind, days: buckets, overallSuccessRate, degraded } = trend;
  const barW = 10;
  const barGap = 2;
  const barH = 32;
  const svgW = buckets.length * (barW + barGap) - barGap;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border p-2.5",
        degraded && "border-warning/40 bg-warning/5",
      )}
    >
      {/* kind 레이블 */}
      <div className="flex min-w-[160px] items-center gap-1.5">
        <code className="rounded bg-muted px-1 text-[10px]">{kind}</code>
        {degraded && (
          <Badge variant="outline" className="border-warning/40 text-[9px] text-warning">
            하락
          </Badge>
        )}
      </div>

      {/* SVG 스파크라인: 일별 성공률 막대 */}
      <svg
        width={svgW}
        height={barH}
        aria-label={`${kind} 성공률 추세`}
        className="shrink-0"
      >
        {buckets.map((b, i) => {
          const x = i * (barW + barGap);
          const filledH =
            b.total === 0
              ? 2
              : Math.max(2, Math.round((Math.max(0, b.successRate) / 100) * barH));
          const colorClass =
            b.total === 0
              ? "fill-muted-foreground/20"
              : b.successRate === 100
                ? "fill-success/80"
                : b.successRate >= 80
                  ? "fill-warning/70"
                  : "fill-destructive/70";
          return (
            <rect
              key={b.date}
              x={x}
              y={barH - filledH}
              width={barW}
              height={filledH}
              rx={2}
              className={colorClass}
            >
              <title>
                {b.date}:{" "}
                {b.total === 0
                  ? "실행없음"
                  : `${b.successRate}% (성공 ${b.success}/${b.total})`}
              </title>
            </rect>
          );
        })}
      </svg>

      {/* 전체 성공률 수치 */}
      <div className="ml-auto flex items-center gap-2 text-[11px]">
        <span
          className={cn(
            "font-semibold tabular-nums",
            overallSuccessRate < 0
              ? "text-muted-foreground"
              : overallSuccessRate === 100
                ? "text-success"
                : overallSuccessRate >= 80
                  ? "text-warning"
                  : "text-destructive",
          )}
        >
          {overallSuccessRate < 0 ? "—" : `${overallSuccessRate}%`}
        </span>
        <span className="text-muted-foreground">{days}일 성공률</span>
      </div>
    </div>
  );
}

/** v12-H2: cron 안정성 추세 섹션 — kind별 일별 성공률 시계열 스파크라인 */
function CronTrendSection() {
  const [windowDays, setWindowDays] = useState<14 | 30>(14);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["console", "cron-trend", windowDays],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("로그인 필요");
      const res = await fetch(`/api/console/cron-runs/trend?days=${windowDays}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`조회 실패 (${res.status})`);
      const json = (await res.json()) as { trends: KindTrend[] };
      return json.trends ?? [];
    },
    staleTime: 120_000,
  });

  const trends = data ?? [];
  const degradedKinds = trends.filter((t) => t.degraded);

  return (
    <div className="space-y-2">
      {/* 성공률 하락 경보 배너 */}
      {degradedKinds.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/5 px-3 py-2.5 text-[11px] text-warning">
          <TrendingDown size={13} className="mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">성공률 하락 감지 — </span>
            {degradedKinds.map((k) => (
              <span key={k.kind} className="mr-2">
                <code className="rounded bg-warning/10 px-1">{k.kind}</code>{" "}
                <span>전체 {k.overallSuccessRate}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 추세 카드 */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1 text-xs font-semibold">
            <TrendingUp size={12} />
            cron 안정성 추세
            <Badge variant="outline" className="text-[10px]">
              cron_runs · 일별 성공률
            </Badge>
          </h2>
          <div className="flex items-center gap-2">
            {/* 기간 선택 */}
            <div className="flex items-center gap-0.5 text-[10px]">
              {([14, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setWindowDays(d)}
                  className={cn(
                    "rounded px-1.5 py-0.5 transition-colors",
                    windowDays === d
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {d}일
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-7 gap-1 px-2 text-[11px]"
            >
              {isRefetching ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <RefreshCw size={11} />
              )}
              새로고침
            </Button>
          </div>
        </div>

        {/* 범례 */}
        <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-success/80" />
            100%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-warning/70" />
            80~99%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-destructive/70" />
            &lt;80%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground/20" />
            실행없음
          </span>
          <span className="ml-auto">M5(임계 경보)는 8월초 데이터 관찰 후</span>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            <Loader2 size={12} className="mx-auto mb-1 animate-spin" /> 불러오는 중…
          </p>
        ) : trends.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            아직 추세를 분석할 cron 실행 기록이 없습니다.
          </p>
        ) : (
          <div className="space-y-1.5">
            {trends.map((t) => (
              <KindTrendRow key={t.kind} trend={t} days={windowDays} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** v7-M6: cron 실행 상태 섹션 — cron_runs 최근 실행을 kind별 표 + 연속 실패 배너 */
function CronStatusSection() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["console", "cron-runs-status"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("로그인 필요");
      const res = await fetch("/api/console/cron-runs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`조회 실패 (${res.status})`);
      const json = (await res.json()) as { statuses: KindStatus[] };
      return json.statuses ?? [];
    },
    staleTime: 60_000,
  });

  const statuses = data ?? [];
  const failingKinds = statuses.filter((s) => s.consecutiveFailures >= 2);
  // v9-M1: stale이면서 연속 실패로 이미 경보된 kind는 별도 배너 불필요
  const staleKinds = statuses.filter((s) => s.isStale && s.consecutiveFailures < 2);

  const fmtDuration = (ms: number) =>
    ms >= 60_000
      ? `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
      : ms >= 1_000
        ? `${(ms / 1000).toFixed(1)}s`
        : `${ms}ms`;

  return (
    <div className="space-y-2">
      {/* 연속 2회+ 실패 경고 배너 */}
      {failingKinds.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-[11px] text-destructive">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">연속 실패 감지 — </span>
            {failingKinds.map((k) => (
              <span key={k.kind} className="mr-2">
                <code className="rounded bg-destructive/10 px-1">{k.kind}</code>
                {" "}
                <span className="font-semibold">{k.consecutiveFailures}회 연속 실패</span>
                {k.lastErrorMessage && (
                  <span className="ml-1 opacity-70">({k.lastErrorMessage.slice(0, 60)})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* v9-M1: stale(침묵) 경고 배너 */}
      {staleKinds.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/5 px-3 py-2.5 text-[11px] text-warning">
          <Clock size={13} className="mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">침묵(stale) 감지 — </span>
            {staleKinds.map((k) => (
              <span key={k.kind} className="mr-2">
                <code className="rounded bg-warning/10 px-1">{k.kind}</code>
                {" "}
                <span>마지막 실행: {k.lastRunAt ? new Date(k.lastRunAt).toLocaleString("ko-KR") : "—"}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 실행 상태 테이블 */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1 text-xs font-semibold">
            <Activity size={12} />
            cron 실행 상태
            <Badge variant="outline" className="text-[10px]">
              cron_runs · kind별 최신
            </Badge>
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-7 gap-1 px-2 text-[11px]"
          >
            {isRefetching ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            새로고침
          </Button>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            <Loader2 size={12} className="mx-auto mb-1 animate-spin" /> 불러오는 중…
          </p>
        ) : statuses.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            아직 cron 실행 기록이 없습니다. cron이 실행되면 자동으로 집계됩니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[11px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1 pr-2 font-medium">kind</th>
                  <th className="py-1 px-2 font-medium">마지막 실행</th>
                  <th className="py-1 px-2 font-medium">결과</th>
                  <th className="py-1 px-2 font-medium text-right">소요</th>
                  <th className="py-1 pl-2 font-medium text-right">연속 실패</th>
                </tr>
              </thead>
              <tbody>
                {statuses.map((s) => (
                  <tr key={s.kind} className="border-b last:border-b-0">
                    <td className="py-1.5 pr-2">
                      <code className="rounded bg-muted px-1 text-[10px]">{s.kind}</code>
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground">
                      {s.lastRunAt ? (
                        <span className="inline-flex items-center gap-1">
                          {new Date(s.lastRunAt).toLocaleString("ko-KR")}
                          {s.isStale && (
                            <Badge
                              variant="outline"
                              className="border-warning/40 bg-warning/5 text-[9px] text-warning"
                            >
                              stale
                            </Badge>
                          )}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-1.5 px-2">
                      {s.lastSuccess ? (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle2 size={11} /> 성공
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle size={11} /> 실패
                          {s.lastErrorMessage && (
                            <span className="ml-1 max-w-[160px] truncate opacity-70" title={s.lastErrorMessage}>
                              {s.lastErrorMessage.slice(0, 40)}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-muted-foreground">
                      {fmtDuration(s.lastDurationMs)}
                    </td>
                    <td className="py-1.5 pl-2 text-right">
                      {s.consecutiveFailures >= 2 ? (
                        <span className="font-semibold text-destructive">{s.consecutiveFailures}회</span>
                      ) : s.consecutiveFailures === 1 ? (
                        <span className="text-warning">1회</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const KIND_LABELS: Record<string, { label: string; color: string }> = {
  class_reminder_daily: { label: "수업 일일 리마인드", color: "bg-info/5 text-info" },
  study_session_reminder: { label: "스터디 회차 D-1", color: "bg-cat-5/5 text-cat-5" },
  study_assignment_reminder: { label: "스터디 과제 마감 D-1", color: "bg-destructive/5 text-destructive" },
  seminar_push_reminder: { label: "세미나 D-1 (push)", color: "bg-success/5 text-success" },
  seminar_push_review_request: { label: "세미나 D+1 후기 (push)", color: "bg-warning/5 text-warning" },
};

function kindMeta(k?: string) {
  if (!k) return { label: "(unknown)", color: "bg-muted text-muted-foreground" };
  return KIND_LABELS[k] ?? { label: k, color: "bg-muted text-muted-foreground" };
}

/** v7-H3·v8-M6 보존 정책 대상·기간과 dry-run 결과 표시 (실제 삭제는 cron 시크릿 전용 — 이 카드는 조회만) */
const RETENTION_TARGETS: { collection: keyof RetentionCounts; label: string; period: string }[] = [
  { collection: "user_activity_logs", label: "사용자 활동 로그", period: "180일 초과" },
  { collection: "daily_visits", label: "일일 방문 집계", period: "180일 초과" },
  { collection: "search_misses", label: "검색 실패 질의", period: "365일 초과" },
  { collection: "cron_runs", label: "cron 실행 기록", period: "90일 초과" },
];

interface RetentionCounts {
  user_activity_logs: number;
  daily_visits: number;
  search_misses: number;
  cron_runs: number;
}

function RetentionDryRunCard() {
  const [running, setRunning] = useState(false);
  const [counts, setCounts] = useState<RetentionCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("로그인이 필요합니다.");
      const res = await fetch("/api/cron/analytics-retention?dryRun=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`dry-run 실패 (${res.status})`);
      const json = (await res.json()) as { deleted: RetentionCounts };
      setCounts(json.deleted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "dry-run 실패");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-2xl border border-dashed bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold">로그 보존 정리 — 삭제 예정 규모 확인 (dry-run)</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            조회만 수행하며 아무것도 삭제하지 않습니다. 자동 정리 스케줄은 현재 꺼져 있습니다.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={running} className="h-7 gap-1 px-2 text-[11px]">
          {running ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          dry-run 실행
        </Button>
      </div>
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
      {counts && (
        <table className="mt-3 w-full text-[11px]">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-1 font-medium">컬렉션</th>
              <th className="py-1 font-medium">보존 기준</th>
              <th className="py-1 text-right font-medium">삭제 예정</th>
            </tr>
          </thead>
          <tbody>
            {RETENTION_TARGETS.map((t) => (
              <tr key={t.collection} className="border-b last:border-0">
                <td className="py-1">{t.label}</td>
                <td className="py-1 text-muted-foreground">{t.period}</td>
                <td className="py-1 text-right font-semibold">
                  {counts[t.collection] >= 2000 ? "2,000+ (회당 상한)" : `${counts[t.collection]}건`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function CronLogsPage() {
  const { user } = useAuthStore();
  const admin = isAdminOrSysadmin(user);

  const [kindFilter, setKindFilter] = useState<string>("all");

  const { data: logs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["console", "cron-logs"],
    enabled: admin,
    queryFn: async () => {
      // 최근 200건 — limit 200, 클라이언트 정렬 (sentAt desc)
      const res = await dataApi.list<PushLog>("push_logs", { limit: 200 });
      const data = ((res.data as PushLog[]) ?? []).sort((a, b) => {
        const at = a.sentAt ?? "";
        const bt = b.sentAt ?? "";
        return bt.localeCompare(at);
      });
      return data;
    },
    staleTime: 60_000,
  });

  const kinds = useMemo(
    () => Array.from(new Set(logs.map((l) => l.kind ?? "(unknown)"))).sort(),
    [logs],
  );

  const summary = useMemo(() => {
    const map = new Map<string, { count: number; lastSentAt: string; sentTotal: number }>();
    for (const l of logs) {
      const k = l.kind ?? "(unknown)";
      const prev = map.get(k) ?? { count: 0, lastSentAt: "", sentTotal: 0 };
      const sentAt = l.sentAt ?? "";
      map.set(k, {
        count: prev.count + 1,
        lastSentAt: sentAt > prev.lastSentAt ? sentAt : prev.lastSentAt,
        sentTotal: prev.sentTotal + (typeof l.successful === "number" ? l.successful : 0),
      });
    }
    return Array.from(map.entries())
      .map(([kind, v]) => ({ kind, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  const filtered = useMemo(
    () => (kindFilter === "all" ? logs : logs.filter((l) => l.kind === kindFilter)).slice(0, 100),
    [logs, kindFilter],
  );

  if (!admin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-muted-foreground">
        관리자(admin) 이상만 접근 가능합니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <ScrollText size={18} className="text-primary" />
          Cron 실행 이력
          <Badge variant="outline" className="text-[10px]">
            push_logs · 최근 200건
          </Badge>
        </h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="h-7 gap-1 px-2 text-[11px]"
        >
          {isRefetching ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <RefreshCw size={11} />
          )}
          새로고침
        </Button>
      </div>

      {/* v7-M6 — cron 실행 상태 (cron_runs 컬렉션 · kind별 최신 + 연속 실패 배너) */}
      <CronStatusSection />

      {/* H2(v12) — cron 안정성 추세 (cron_runs 일별 성공률 시계열 스파크라인) */}
      <CronTrendSection />

      {/* M4(v11) — 신입 첫 2주 시퀀스 단계별 발송 현황 (push_logs 재사용) */}
      <NewcomerSequenceStatusSection logs={logs} isLoading={isLoading} />

      {/* v7-H3 — 로그 보존 정리 dry-run (조회 전용, 삭제 없음).
          자동 스케줄은 vercel.json 미등록(휴면) — 여기서 삭제 예정 규모를 확인한 뒤 활성화를 결정한다. */}
      <RetentionDryRunCard />

      {/* 요약 카드 */}
      <div className="rounded-2xl border bg-card p-4">
        <h2 className="mb-2 flex items-center gap-1 text-xs font-semibold">
          <Bell size={12} /> 종류별 발송 합계
        </h2>
        {isLoading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            <Loader2 size={12} className="mx-auto mb-1 animate-spin" /> 불러오는 중…
          </p>
        ) : summary.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            발송 이력이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[11px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1 pr-2">종류</th>
                  <th className="py-1 px-2 text-right">로그 건수</th>
                  <th className="py-1 px-2 text-right">총 발송 (수신자 수 합)</th>
                  <th className="py-1 pl-2">마지막 발송</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => {
                  const meta = kindMeta(s.kind);
                  return (
                    <tr key={s.kind} className="border-b last:border-b-0">
                      <td className="py-1.5 pr-2">
                        <Badge variant="outline" className={cn("text-[10px]", meta.color)}>
                          {meta.label}
                        </Badge>
                        <span className="ml-2 text-[10px] text-muted-foreground/70">
                          {s.kind}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right font-medium">{s.count}</td>
                      <td className="py-1.5 px-2 text-right font-medium">{s.sentTotal.toLocaleString()}</td>
                      <td className="py-1.5 pl-2 text-muted-foreground">
                        {s.lastSentAt ? new Date(s.lastSentAt).toLocaleString("ko-KR") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 필터 + 상세 리스트 */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1 text-xs font-semibold">
            <Calendar size={12} /> 최근 발송 이력 (최근 100)
          </h2>
          <div className="flex items-center gap-1.5">
            <Filter size={11} className="text-muted-foreground" />
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="h-7 rounded-md border bg-background px-2 text-[11px]"
            >
              <option value="all">전체</option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {kindMeta(k).label} ({k})
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            조건에 해당하는 이력이 없습니다.
          </p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((l) => {
              const meta = kindMeta(l.kind);
              const targetRef =
                l.activityProgressId
                  ? `회차 ${l.activityProgressId.slice(0, 6)}…`
                  : l.assignmentId
                    ? `과제 ${l.assignmentId.slice(0, 6)}…`
                    : l.seminarId
                      ? `세미나 ${l.seminarId.slice(0, 6)}…`
                      : l.activityId
                        ? `활동 ${l.activityId.slice(0, 6)}…`
                        : null;
              return (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-[11px]"
                >
                  <Badge variant="outline" className={cn("text-[9px]", meta.color)}>
                    {meta.label}
                  </Badge>
                  {targetRef && (
                    <span className="text-[10px] text-muted-foreground">{targetRef}</span>
                  )}
                  {l.userId && (
                    <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                      user {l.userId.slice(0, 6)}…
                    </span>
                  )}
                  {l.date && (
                    <span className="text-[10px] text-muted-foreground">대상일 {l.date}</span>
                  )}
                  {typeof l.successful === "number" && typeof l.attempted === "number" && (
                    <span
                      className={cn(
                        "rounded px-1 py-0.5 text-[10px]",
                        l.successful === l.attempted
                          ? "bg-success/5 text-success"
                          : "bg-warning/5 text-warning",
                      )}
                    >
                      {l.successful}/{l.attempted} 성공
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {l.sentAt ? new Date(l.sentAt).toLocaleString("ko-KR") : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        <Mail size={9} className="mr-0.5 inline" />
        이메일 발송 이력은 <code className="rounded bg-muted px-1">email_logs</code> 컬렉션에 별도 저장됨.
        notifications 컬렉션은 인앱 알림 (별도 UI).
      </p>
    </div>
  );
}
