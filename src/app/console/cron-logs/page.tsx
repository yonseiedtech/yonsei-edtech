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
} from "lucide-react";
import { dataApi } from "@/lib/bkend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdmin } from "@/lib/permissions";

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

export default function CronLogsPage() {
  const { user } = useAuthStore();
  const admin = isAdmin(user);

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
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
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
