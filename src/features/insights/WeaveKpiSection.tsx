"use client";

/**
 * 연결 지표 (Weave KPI) — v17-H2.
 *
 * v16 이 심은 연결고리(진단→가이드, 가이드 이어읽기/완독, 수요→개설 전환)가
 * 실제로 쓰이는지 한 장에서 측정한다. 세 블록으로 구성한다.
 *  (a) 러닝 가이드 진행/완독 — /api/console/weave (Admin SDK 서버 집계)
 *  (b) 수요→개설 전환 — 수요 보드 status 분포·전환율 (staff 클라이언트 읽기)
 *  (c) 진단 후속행동 — 진단 완료 수·약점 태그 분포 (staff 클라이언트 읽기)
 *
 * 제약: DB/rules 무변경(읽기 집계만). 운영진 전용(isAtLeast staff 가드). 시맨틱 토큰만.
 * 표본 0/미달 시 "데이터 부족" 안전 표시 — null/undefined/빈배열 방어.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Link2,
  BookOpenCheck,
  TrendingUp,
  Stethoscope,
  AlertTriangle,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import {
  commBoardsApi,
  commQuestionsApi,
  diagnosticResultsApi,
} from "@/lib/bkend";
import { DEMAND_CONTEXT_ID } from "@/features/demand/ensure-demand-board";
import type { CommBoard, CommQuestion } from "@/types";
import type { DiagnosticResult } from "@/types/diagnostic";
import type { WeaveGuideMetrics } from "@/features/insights/weave-metrics";

const STALE_TIME = 5 * 60_000;

// ── 수요 개설 퍼널 (demand 콘솔과 동일 정의) ─────────────────────────────────
type DemandStage = "collecting" | "reviewing" | "leader" | "designing" | "opened";
const STAGE_LABELS: Record<DemandStage, string> = {
  collecting: "수집중",
  reviewing: "검토중",
  leader: "모임장",
  designing: "설계중",
  opened: "개설됨",
};
const FUNNEL_ORDER: DemandStage[] = [
  "collecting",
  "reviewing",
  "leader",
  "designing",
  "opened",
];
function stageOf(q: CommQuestion): DemandStage | "declined" {
  const s = q.demandPref?.status as DemandStage | "declined" | undefined;
  return s ?? "collecting";
}

/** 양호/주의 판정 뱃지 — 색만이 아니라 텍스트 병기(a11y) */
function ToneBadge({ rate, goodAt }: { rate: number | null; goodAt: number }) {
  if (rate === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        데이터 부족
      </span>
    );
  }
  const good = rate >= goodAt;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        good ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
      )}
    >
      {good ? "양호" : "주의"}
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function WeaveKpiSection() {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");

  // (a) 러닝 가이드 진행/완독 — 서버 집계 ────────────────────────────────────
  const { data: guideData, isLoading: guideLoading } = useQuery({
    enabled: isStaff,
    staleTime: STALE_TIME,
    queryKey: ["weave-guides"],
    queryFn: async (): Promise<WeaveGuideMetrics> => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("로그인이 필요합니다.");
      const res = await fetch("/api/console/weave", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("집계 실패");
      const json = (await res.json()) as { guides: WeaveGuideMetrics };
      return json.guides;
    },
  });

  // (b) 수요→개설 전환 — staff 클라이언트 읽기 ────────────────────────────────
  const { data: demandQuestions, isLoading: demandLoading } = useQuery({
    enabled: isStaff,
    staleTime: STALE_TIME,
    queryKey: ["weave-demand"],
    queryFn: async (): Promise<CommQuestion[]> => {
      const boardRes = await commBoardsApi.listByContext("demand", DEMAND_CONTEXT_ID);
      const board = (boardRes.data as unknown as CommBoard[])[0] ?? null;
      if (!board) return [];
      const qRes = await commQuestionsApi.listByBoard(board.id);
      return (qRes.data as CommQuestion[]) ?? [];
    },
  });

  const demand = useMemo(() => {
    const questions = demandQuestions ?? [];
    // 개설(opening) 전환은 스터디 수요 대상 — demand 콘솔 퍼널과 동일 모집단
    const studyItems = questions.filter((q) => q.presenter === "스터디 희망");
    const dist = FUNNEL_ORDER.reduce(
      (acc, s) => {
        acc[s] = studyItems.filter((q) => stageOf(q) === s).length;
        return acc;
      },
      {} as Record<DemandStage, number>,
    );
    const total = studyItems.length;
    const opened = dist.opened;
    const conversionRate = total > 0 ? Math.round((opened / total) * 100) : null;
    return { dist, total, opened, conversionRate };
  }, [demandQuestions]);

  // (c) 진단 후속행동 — staff 클라이언트 읽기 ──────────────────────────────────
  const { data: diagResults, isLoading: diagLoading } = useQuery({
    enabled: isStaff,
    staleTime: STALE_TIME,
    queryKey: ["weave-diagnostics"],
    queryFn: async (): Promise<DiagnosticResult[]> => {
      const res = await diagnosticResultsApi.listAll(2000);
      return (res.data ?? []) as DiagnosticResult[];
    },
  });

  const diag = useMemo(() => {
    const results = diagResults ?? [];
    // 회원당 최신 1건만 약점 분포에 기여 (반복 응시 왜곡 방지 — DiagnosticInsightsView 준용)
    const latestByUser = new Map<string, DiagnosticResult>();
    for (const r of results) {
      if (!r.userId) continue;
      if (!latestByUser.has(r.userId)) latestByUser.set(r.userId, r); // 정렬상 첫 등장 = 최신
    }
    const members = latestByUser.size;
    const byTag = new Map<string, number>();
    for (const r of latestByUser.values()) {
      const seen = new Set<string>();
      for (const raw of r.weakConceptNames ?? []) {
        const key = raw.trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        byTag.set(key, (byTag.get(key) ?? 0) + 1);
      }
    }
    const topTags = [...byTag.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return { attempts: results.length, members, topTags };
  }, [diagResults]);

  if (!isStaff) {
    return (
      <div className="rounded-2xl border border-warning/20 bg-warning/5 p-6 text-center text-sm text-warning">
        <ShieldAlert className="mx-auto mb-2" size={24} aria-hidden />
        운영진 전용 지표입니다.
      </div>
    );
  }

  const anyLoading = guideLoading || demandLoading || diagLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-info/20 bg-info/5 p-3 text-xs text-info">
        <Link2 size={15} className="mt-0.5 shrink-0 text-info" aria-hidden />
        <p>
          v16 이 심은 <b>연결고리</b>(진단→가이드, 가이드 완독, 수요→개설)가 실제로
          쓰이는지 측정합니다. 절대값과 전환율을 함께 보고 다음 기획 근거로 활용하세요.
          {anyLoading && " (집계 중…)"}
        </p>
      </div>

      {/* (a) 러닝 가이드 진행/완독 ───────────────────────────────────────────── */}
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <BookOpenCheck size={15} className="text-primary" aria-hidden />
          러닝 가이드 진행·완독
          <span className="ml-auto">
            <ToneBadge rate={guideData?.completionRate ?? null} goodAt={40} />
          </span>
        </h2>
        {guideLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-muted-foreground" size={18} role="img" aria-label="집계 불러오는 중" />
          </div>
        ) : !guideData || guideData.started === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            데이터 부족 — 가이드를 읽기 시작한 회원이 아직 없습니다.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="진행 시작" value={guideData.started} sub="1페이지 이상 읽음" />
            <Stat label="완독" value={guideData.completed} sub="전체 페이지 읽음" />
            <Stat
              label="완독률"
              value={guideData.completionRate === null ? "—" : `${guideData.completionRate}%`}
              sub="완독 / 진행 시작"
            />
            <Stat label="페이지 보유 가이드" value={guideData.guidesWithPages} sub="분모 기준" />
          </div>
        )}
      </section>

      {/* (b) 수요→개설 전환 ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <TrendingUp size={15} className="text-primary" aria-hidden />
          수요 → 개설 전환
          <span className="ml-auto">
            <ToneBadge rate={demand.conversionRate} goodAt={25} />
          </span>
        </h2>
        {demandLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-muted-foreground" size={18} role="img" aria-label="집계 불러오는 중" />
          </div>
        ) : demand.total === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            데이터 부족 — 등록된 스터디 수요가 아직 없습니다.
          </p>
        ) : (
          <>
            <div className="mt-3 flex items-stretch gap-1.5 overflow-x-auto">
              {FUNNEL_ORDER.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "flex min-w-[68px] flex-col items-center rounded-xl border px-3 py-2",
                      s === "opened" && "border-success/30",
                    )}
                  >
                    <span
                      className={cn(
                        "text-xl font-bold tabular-nums",
                        s === "opened" ? "text-success" : "text-foreground",
                      )}
                    >
                      {demand.dist[s] || 0}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {STAGE_LABELS[s]}
                    </span>
                  </div>
                  {i < FUNNEL_ORDER.length - 1 && (
                    <span className="text-muted-foreground/40" aria-hidden>
                      ›
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              전환율 = 개설 {demand.opened}건 / 전체 스터디 수요 {demand.total}건 ={" "}
              <span
                className={cn(
                  "font-semibold",
                  (demand.conversionRate ?? 0) >= 25 ? "text-success" : "text-warning",
                )}
              >
                {demand.conversionRate === null ? "—" : `${demand.conversionRate}%`}
              </span>
            </p>
          </>
        )}
      </section>

      {/* (c) 진단 후속행동 ───────────────────────────────────────────────────── */}
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Stethoscope size={15} className="text-primary" aria-hidden />
          진단 후속행동
          <span className="text-[11px] font-normal text-muted-foreground">
            · 완료 수·약점 태그 분포
          </span>
        </h2>
        {diagLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-muted-foreground" size={18} role="img" aria-label="집계 불러오는 중" />
          </div>
        ) : diag.attempts === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            데이터 부족 — 진단평가 응시 기록이 아직 없습니다.
          </p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="진단 완료(누적)" value={diag.attempts} sub="응시 건수" />
              <Stat label="응시 회원" value={diag.members} sub="1회 이상" />
            </div>
            {diag.topTags.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <AlertTriangle size={13} className="text-warning" aria-hidden />
                  공통 약점 태그 Top {diag.topTags.length}
                </p>
                <div className="flex flex-wrap gap-2">
                  {diag.topTags.map((t) => (
                    <span
                      key={t.name}
                      className="inline-flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/5 px-3 py-1 text-xs text-warning"
                    >
                      <span className="font-medium">{t.name}</span>
                      <span className="rounded-full bg-warning/20 px-1.5 text-[10px] font-bold tabular-nums text-warning">
                        {t.count}명
                      </span>
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  회원 최신 진단 기준 약점 개념 빈도 — 가이드·세미나 기획 근거.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
