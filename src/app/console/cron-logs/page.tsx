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
                      {s.lastRunAt
                        ? new Date(s.lastRunAt).toLocaleString("ko-KR")
                        : "—"}
                    </td>
                    <td className="py-1.5 px-2">
                      {s.lastSuccess ? (
                        <span className="flex items-center gap-1 text-emerald-600">
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
                        <span className="text-amber-600">1회</span>
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
  class_reminder_daily: { label: "수업 일일 리마인드", color: "bg-blue-50 text-blue-700" },
  study_session_reminder: { label: "스터디 회차 D-1", color: "bg-purple-50 text-purple-700" },
  study_assignment_reminder: { label: "스터디 과제 마감 D-1", color: "bg-rose-50 text-rose-700" },
  seminar_push_reminder: { label: "세미나 D-1 (push)", color: "bg-emerald-50 text-emerald-700" },
  seminar_push_review_request: { label: "세미나 D+1 후기 (push)", color: "bg-amber-50 text-amber-700" },
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
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700",
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
