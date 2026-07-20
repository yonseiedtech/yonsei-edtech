"use client";

/**
 * 진단평가 인사이트 (데이터 활용 MVP ①) — admin 전용.
 *
 * 운영진이 회원별 논문/연구 준비도·약점을 한눈에 보고 "누구에게 무엇을 지원할지" 파악한다.
 *  - 회원별 카드/테이블: 이름·최근 논문작성/연구분석 준비도(%)·약점 영역·진단 횟수·최근 진단일
 *  - 준비도 낮은 순 정렬(지원 필요 회원 우선)
 *  - 공통 약점 개념 top N (세미나·워크숍 기획 근거)
 *
 * 데이터 소스: diagnostic_results (운영진 전체 read — firestore.rules·diagnosticResultsApi.listAll).
 * 회원 이름은 profilesApi.listByIds 로 일괄 매핑(N+1 금지).
 *
 * ⚠️ 준비도·약점은 개인정보이므로 isAdminOrSysadmin 가드. 진단평가 러너/리포트/시드는 건드리지 않는다.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert, Stethoscope, AlertTriangle, Users, Search, Download,
  FileText, Microscope, TrendingDown,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminOrSysadmin } from "@/lib/permissions";
import { diagnosticResultsApi, profilesApi } from "@/lib/bkend";
import {
  DIAGNOSTIC_AREA_LABELS,
  DIAGNOSTIC_AREA_ORDER,
  areaScorePercent,
  type DiagnosticArea,
  type DiagnosticResult,
} from "@/types/diagnostic";
import type { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportCSV } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/ui/empty-state";

const STALE_TIME = 5 * 60_000;

/** 준비도 낮을수록(지원 필요) 진한 경고색 */
function readinessTone(pct: number): string {
  if (pct < 40) return "text-rose-600";
  if (pct < 70) return "text-amber-600";
  return "text-emerald-600";
}

function readinessBar(pct: number): string {
  if (pct < 40) return "bg-rose-500";
  if (pct < 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 회원별 진단 요약 — 최신 결과 기준 + 이력 집계 */
interface MemberDiagnosticRow {
  userId: string;
  name: string;
  /** 최신 진단의 논문 작성 준비도 0~100 */
  paperReadiness: number;
  /** 최신 진단의 연구 분석 준비도 0~100 */
  analysisReadiness: number;
  /** 두 준비도 중 낮은 값 — 정렬·지원 우선순위용 */
  minReadiness: number;
  /** 최신 진단 기준 영역별 정답률이 가장 낮은 영역(약점 영역) */
  weakestArea: DiagnosticArea | null;
  weakestAreaPct: number;
  /** 최신 진단의 약점 개념명(denorm) */
  weakConceptNames: string[];
  /** 진단 응시 횟수 */
  attemptCount: number;
  /** 최근 진단일 (ISO) */
  lastAt?: string;
}

/** 최신 결과의 영역별 정답률 중 최저 영역 추출 */
function weakestAreaOf(
  r: DiagnosticResult,
): { area: DiagnosticArea | null; pct: number } {
  let area: DiagnosticArea | null = null;
  let pct = 101;
  for (const a of DIAGNOSTIC_AREA_ORDER) {
    const s = r.areaScores?.[a];
    if (!s || s.total === 0) continue;
    const p = areaScorePercent(s);
    if (p < pct) {
      pct = p;
      area = a;
    }
  }
  return area ? { area, pct } : { area: null, pct: 0 };
}

export default function DiagnosticInsightsView() {
  const { user } = useAuthStore();
  const isAdmin = isAdminOrSysadmin(user);

  const [search, setSearch] = useState("");

  const { data: resultsRes, isLoading: loadingResults } = useQuery({
    enabled: isAdmin,
    staleTime: STALE_TIME,
    queryKey: ["diagnostic-insights-results"],
    queryFn: () => diagnosticResultsApi.listAll(2000),
  });

  const results = useMemo(
    () => (resultsRes?.data ?? []) as DiagnosticResult[],
    [resultsRes],
  );

  // 결과에 등장한 userId 만 프로필 일괄 조회 (N+1 금지)
  const userIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) if (r.userId) set.add(r.userId);
    return [...set];
  }, [results]);

  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    enabled: isAdmin && userIds.length > 0,
    staleTime: STALE_TIME,
    queryKey: ["diagnostic-insights-profiles", userIds],
    queryFn: () => profilesApi.listByIds(userIds),
  });

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of (profiles ?? []) as User[]) map.set(u.id, u.name || u.username || "이름없음");
    return map;
  }, [profiles]);

  // 회원별 최신 결과 + 이력 집계 (createdAt desc 정렬되어 옴 — 첫 등장이 최신)
  const rows = useMemo<MemberDiagnosticRow[]>(() => {
    const latest = new Map<string, DiagnosticResult>();
    const counts = new Map<string, number>();
    for (const r of results) {
      if (!r.userId) continue;
      counts.set(r.userId, (counts.get(r.userId) ?? 0) + 1);
      if (!latest.has(r.userId)) latest.set(r.userId, r); // 정렬상 첫 등장 = 최신
    }

    const out: MemberDiagnosticRow[] = [];
    for (const [userId, r] of latest) {
      const weak = weakestAreaOf(r);
      out.push({
        userId,
        name: nameById.get(userId) ?? "이름없음",
        paperReadiness: r.paperReadiness ?? 0,
        analysisReadiness: r.analysisReadiness ?? 0,
        minReadiness: Math.min(r.paperReadiness ?? 0, r.analysisReadiness ?? 0),
        weakestArea: weak.area,
        weakestAreaPct: weak.pct,
        weakConceptNames: r.weakConceptNames ?? [],
        attemptCount: counts.get(userId) ?? 1,
        lastAt: r.createdAt,
      });
    }
    // 준비도 낮은 순(지원 필요 회원 우선)
    out.sort((a, b) => a.minReadiness - b.minReadiness);
    return out;
  }, [results, nameById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  // KPI
  const kpi = useMemo(() => {
    const total = rows.length;
    const support = rows.filter((r) => r.minReadiness < 40).length;
    const avgPaper = total
      ? Math.round(rows.reduce((s, r) => s + r.paperReadiness, 0) / total)
      : 0;
    const avgAnalysis = total
      ? Math.round(rows.reduce((s, r) => s + r.analysisReadiness, 0) / total)
      : 0;
    return { total, support, avgPaper, avgAnalysis };
  }, [rows]);

  // 공통 약점 개념 top N — 회원별 최신 결과(rows)의 weakConceptNames 빈도 집계.
  // rows 는 이미 회원당 1건(최신)이므로 회원당 개념명 dedupe 후 +1 = "약점인 회원 수".
  // 라벨은 denorm 이름(weakConceptNames) 사용 — archive_concepts 추가 조회 없이 매핑.
  const commonWeakConcepts = useMemo(() => {
    const byName = new Map<string, { name: string; count: number }>();
    for (const r of rows) {
      const seen = new Set<string>();
      for (const raw of r.weakConceptNames) {
        const key = raw.trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const e = byName.get(key) ?? { name: key, count: 0 };
        e.count += 1;
        byName.set(key, e);
      }
    }
    return [...byName.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [rows]);

  function downloadCsv() {
    const headers = [
      "이름", "논문작성준비도", "연구분석준비도", "최저준비도",
      "약점영역", "약점영역정답률", "약점개념", "진단횟수", "최근진단일",
    ];
    const rowsCsv = filtered.map((r) => [
      r.name,
      r.paperReadiness,
      r.analysisReadiness,
      r.minReadiness,
      r.weakestArea ? DIAGNOSTIC_AREA_LABELS[r.weakestArea] : "",
      r.weakestArea ? r.weakestAreaPct : "",
      r.weakConceptNames.join("; "),
      r.attemptCount,
      formatDate(r.lastAt),
    ]);
    exportCSV("diagnostic-insights", headers, rowsCsv);
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border bg-amber-50 p-6 text-center text-sm text-amber-800">
        <ShieldAlert className="mx-auto mb-2" size={24} />
        관리자 전용 페이지입니다. (회원 준비도·약점은 개인정보)
      </div>
    );
  }

  if (loadingResults || (userIds.length > 0 && loadingProfiles)) {
    return <div className="py-16 text-center text-sm text-muted-foreground">불러오는 중…</div>;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="아직 진단평가 응시 기록이 없습니다."
        description="회원이 진단평가를 응시하면 준비도·약점이 여기에 집계됩니다."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-xs text-sky-900">
        <Stethoscope size={15} className="mt-0.5 shrink-0 text-sky-600" />
        <p>
          회원이 응시한 진단평가의 <b>최신 결과</b> 기준 준비도·약점을 집계합니다.
          준비도 낮은 회원이 위로 정렬되어 <b>누구에게 무엇을 지원할지</b> 파악할 수 있습니다.
          공통 약점 개념은 세미나·워크숍 기획 근거로 활용하세요.
        </p>
      </div>

      {/* KPI */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={Users} color="bg-blue-50 text-blue-700" label="응시 회원" value={kpi.total} sub="진단 1회 이상" />
        <Kpi icon={TrendingDown} color="bg-rose-50 text-rose-700" label="지원 필요" value={kpi.support} sub="준비도 40 미만" />
        <Kpi icon={FileText} color="bg-violet-50 text-violet-700" label="평균 논문작성" value={kpi.avgPaper} sub="0~100" />
        <Kpi icon={Microscope} color="bg-indigo-50 text-indigo-700" label="평균 연구분석" value={kpi.avgAnalysis} sub="0~100" />
      </section>

      {/* 공통 약점 개념 */}
      {commonWeakConcepts.length > 0 && (
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle size={16} className="text-amber-600" />
            공통 약점 개념 Top {commonWeakConcepts.length}
            <span className="text-[11px] font-normal text-muted-foreground">
              회원 최신 진단의 약점 개념 빈도 — 세미나·워크숍 기획 근거
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {commonWeakConcepts.map((c) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800"
              >
                <span className="font-medium">{c.name}</span>
                <span className="rounded-full bg-amber-200/70 px-1.5 text-[10px] font-bold tabular-nums text-amber-900">
                  {c.count}명
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 회원별 진단 테이블 */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Stethoscope size={16} />
            회원별 준비도 ({filtered.length}) · 준비도 낮은 순
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름 검색"
                className="h-8 w-40 pl-7 text-xs"
              />
            </div>
            <Button size="sm" variant="outline" onClick={downloadCsv}>
              <Download size={12} className="mr-1" />
              CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">이름</th>
                <th className="px-3 py-2 font-medium">논문작성 준비도</th>
                <th className="px-3 py-2 font-medium">연구분석 준비도</th>
                <th className="px-3 py-2 font-medium">약점 영역</th>
                <th className="px-3 py-2 font-medium">약점 개념</th>
                <th className="px-3 py-2 text-center font-medium">진단</th>
                <th className="px-3 py-2 font-medium">최근 진단일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.userId} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">
                    <a href={`/profile/${r.userId}`} className="hover:underline">{r.name}</a>
                    {r.minReadiness < 40 && (
                      <Badge variant="outline" className="ml-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700">
                        지원
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <ReadinessCell pct={r.paperReadiness} />
                  </td>
                  <td className="px-3 py-2">
                    <ReadinessCell pct={r.analysisReadiness} />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.weakestArea ? (
                      <span className="inline-flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {DIAGNOSTIC_AREA_LABELS[r.weakestArea]}
                        </Badge>
                        <span className={cn("tabular-nums", readinessTone(r.weakestAreaPct))}>
                          {r.weakestAreaPct}%
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.weakConceptNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.weakConceptNames.slice(0, 3).map((n, i) => (
                          <span
                            key={`${n}-${i}`}
                            className="rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-700"
                          >
                            {n}
                          </span>
                        ))}
                        {r.weakConceptNames.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{r.weakConceptNames.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums text-xs">{r.attemptCount}회</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(r.lastAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          준비도 = 회원 최신 진단 기준 0~100. 논문작성 = (핵심개념+연구방법) 정답률 평균 ·
          연구분석 = (통계방법+연구방법) 정답률 평균. 약점 영역 = 최신 진단에서 정답률이 가장 낮은 영역.
          준비도 40 미만(빨강)은 지원 우선 대상입니다.
        </p>
      </section>
    </div>
  );
}

function ReadinessCell({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", readinessBar(pct))} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("w-9 text-right text-xs font-bold tabular-nums", readinessTone(pct))}>
        {pct}
      </span>
    </div>
  );
}

function Kpi({ icon: Icon, color, label, value, sub }: {
  icon: React.ElementType; color: string; label: string; value: number; sub?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", color)}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
