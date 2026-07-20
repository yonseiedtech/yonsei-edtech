"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, User as UserIcon, Printer, AlertTriangle, Clock, CheckCircle2,
} from "lucide-react";
import { useOrgChart } from "@/features/admin/settings/useOrgChart";
import { dataApi } from "@/lib/bkend";
import EmptyState from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HandoverDocument } from "@/types";

/** 업무노트 최신 갱신이 이 일수를 넘으면 '노후'로 표시 (인수인계 내구성 감사 H3) */
const STALE_DAYS = 90;

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

type Readiness = "gap" | "stale" | "ready";

interface PositionReadiness {
  id: string;
  title: string;
  userName?: string;
  department?: string;
  hasMemo: boolean;
  noteCount: number;
  latestNoteDays: number | null;
  status: Readiness;
}

export default function OverviewView() {
  const { positions, isLoading } = useOrgChart();

  // 업무수행철(업무노트) — 직책별 건수·최신 갱신일 산출용 (기존 컬렉션 재사용, 신규 없음)
  const { data: handoverDocs = [] } = useQuery({
    queryKey: ["handover_docs"],
    queryFn: async () => {
      const res = await dataApi.list<HandoverDocument>("handover_docs", {
        sort: "role:asc,priority:asc",
        limit: 500,
      });
      return res.data;
    },
  });

  const withHandover = positions.filter((p) => (p.handover ?? "").trim().length > 0);
  const sorted = [...withHandover].sort((a, b) => a.level - b.level || a.order - b.order);

  // ── 인수인계 준비도(공백 지도) — 조직도 직책 × (인수 메모·업무노트 유무·최신성) ──
  // 공석(담당자 미배정) 직책은 인수 대상이 아니므로 제외 — 배정된 직책만 커버리지 집계.
  const readiness = useMemo<PositionReadiness[]>(() => {
    const rows = positions
      .filter((p) => (p.userName ?? "").trim().length > 0)
      .map((p) => {
        const notes = handoverDocs.filter((d) => d.role === p.title);
        const hasMemo = (p.handover ?? "").trim().length > 0;
        const latestNoteDays = notes.length
          ? notes.reduce<number | null>((min, d) => {
              const ds = daysSince(d.updatedAt || d.createdAt);
              if (ds == null) return min;
              return min == null ? ds : Math.min(min, ds);
            }, null)
          : null;
        let status: Readiness;
        if (!hasMemo && notes.length === 0) {
          status = "gap";
        } else if (notes.length > 0 && latestNoteDays != null && latestNoteDays > STALE_DAYS) {
          status = "stale";
        } else {
          status = "ready";
        }
        return {
          id: p.id,
          title: p.title,
          userName: p.userName,
          department: p.department,
          hasMemo,
          noteCount: notes.length,
          latestNoteDays,
          status,
        };
      });
    // 공백 → 노후 → 준비됨 순으로 (문제 직책이 위로)
    const rank: Record<Readiness, number> = { gap: 0, stale: 1, ready: 2 };
    return rows.sort((a, b) => rank[a.status] - rank[b.status] || a.title.localeCompare(b.title));
  }, [positions, handoverDocs]);

  const gapCount = readiness.filter((r) => r.status === "gap").length;
  const staleCount = readiness.filter((r) => r.status === "stale").length;
  const readyCount = readiness.filter((r) => r.status === "ready").length;
  const problem = readiness.filter((r) => r.status !== "ready");

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            각 직책별 인수인계 메모를 한눈에 확인합니다. 수정은{" "}
            <Link href="/console/org" className="text-primary underline underline-offset-2">
              운영진 설정(조직도)
            </Link>
            에서 할 수 있습니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer size={14} className="mr-1" /> 인쇄/PDF
        </Button>
      </div>

      {/* ── 인수인계 준비도(공백 지도) — 배정된 직책 기준 ── */}
      {!isLoading && readiness.length > 0 && (
        <div className="mt-4 rounded-2xl border bg-card p-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">인수인계 준비도 (배정 {readiness.length}직책)</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-green-700">
                <CheckCircle2 size={13} /> 준비 {readyCount}
              </span>
              <span className={cn("inline-flex items-center gap-1", staleCount > 0 ? "text-warning" : "text-muted-foreground")}>
                <Clock size={13} /> 노후 {staleCount}
              </span>
              <span className={cn("inline-flex items-center gap-1", gapCount > 0 ? "text-destructive" : "text-muted-foreground")}>
                <AlertTriangle size={13} /> 공백 {gapCount}
              </span>
            </div>
          </div>

          {problem.length === 0 ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-green-700">
              <CheckCircle2 size={14} /> 배정된 모든 직책에 인수 메모 또는 업무노트가 있습니다. 교체 시즌 준비 양호.
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {problem.map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs",
                    r.status === "gap" ? "border-destructive/20 bg-destructive/5" : "border-warning/20 bg-warning/5",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {r.status === "gap"
                      ? <AlertTriangle size={13} className="shrink-0 text-destructive" />
                      : <Clock size={13} className="shrink-0 text-warning" />}
                    <span className="font-medium">{r.title}</span>
                    <span className="text-muted-foreground">
                      {r.userName}
                      {r.department && ` · ${r.department}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(r.status === "gap" ? "text-destructive" : "text-warning")}>
                      {r.status === "gap"
                        ? "인수 메모·업무노트 없음"
                        : `업무노트 ${r.latestNoteDays}일째 미갱신`}
                    </span>
                    <Link
                      href={`/console/handover?tab=worklog&role=${encodeURIComponent(r.title)}&compose=1`}
                      className="rounded-md border bg-card px-2 py-0.5 font-medium text-primary hover:bg-muted"
                    >
                      노트 작성 →
                    </Link>
                    <Link
                      href="/console/org"
                      className="rounded-md border bg-card px-2 py-0.5 font-medium text-muted-foreground hover:bg-muted"
                    >
                      메모 편집
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            공석(담당자 미배정) 직책은 인수 대상이 아니므로 집계에서 제외합니다. 노후 기준: 업무노트 최신 갱신 {STALE_DAYS}일 경과.
          </p>
        </div>
      )}

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">불러오는 중...</p>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="인수인계 메모가 없습니다"
          description="운영진 설정(조직도)에서 각 직책에 인수인계 노하우를 기록해두면, 차기 임원이 바로 확인할 수 있습니다."
          actionLabel="운영진 설정 열기"
          actionHref="/console/org"
          className="mt-8"
        />
      ) : (
        <ul className="mt-6 space-y-4">
          {sorted.map((p) => (
            <li key={p.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {p.userName?.[0] ?? <UserIcon size={14} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.userName ?? "공석"}
                    {p.department && ` · ${p.department}`}
                    {p.team && ` · ${p.team}`}
                  </p>
                </div>
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 font-sans text-sm text-foreground">
{p.handover}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
