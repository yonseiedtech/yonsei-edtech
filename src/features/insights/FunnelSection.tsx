"use client";

/**
 * FunnelSection — 온보딩·진단 퍼널 전환율 (M2, 2026-07-19)
 *
 * user_activity_logs 에서 funnelType == "onboarding" / "diagnostic" 이벤트를
 * 읽어 단계별 고유 회원 수·전환율·최대 이탈 지점을 표시.
 *  - 최근 30일 범위 (클라이언트 필터)
 *  - 개인 식별 미노출: 카운트만 표시
 *  - read 권한: staff 이상 (기존 user_activity_logs firestore.rules 그대로)
 */

import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  limit,
  query as buildQuery,
  where,
} from "firebase/firestore";
import { GitBranch, TrendingDown, Users } from "lucide-react";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

// ── 퍼널 정의 ──────────────────────────────────────────────────────────────

interface FunnelStep {
  event: string;
  label: string;
}

const ONBOARDING_STEPS: FunnelStep[] = [
  { event: "ui:onboarding/enter", label: "진입" },
  { event: "ui:onboarding/progress", label: "첫 항목 완료" },
  { event: "ui:onboarding/complete", label: "전체 완료" },
];

const DIAGNOSTIC_STEPS: FunnelStep[] = [
  { event: "ui:diagnostic/start", label: "진단 진입" },
  { event: "ui:diagnostic/q1", label: "문항 시작" },
  { event: "ui:diagnostic/complete", label: "제출 완료" },
  { event: "ui:diagnostic/report", label: "리포트 열람" },
];

// ── 데이터 패치 ────────────────────────────────────────────────────────────

interface FunnelRow {
  path: string;
  userId: string;
  createdAt: string;
}

async function fetchFunnelRows(funnelType: "onboarding" | "diagnostic"): Promise<FunnelRow[]> {
  const q = buildQuery(
    collection(db, "user_activity_logs"),
    where("funnelType", "==", funnelType),
    limit(500),
  );
  const snap = await getDocs(q);

  // 최근 30일 클라이언트 필터
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffISO = cutoff.toISOString();

  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        path: (data.path as string) ?? "",
        userId: (data.userId as string) ?? "",
        createdAt: (data.createdAt as string) ?? "",
      };
    })
    .filter((r) => r.createdAt >= cutoffISO && r.userId && r.path);
}

interface FunnelData {
  onboarding: FunnelRow[];
  diagnostic: FunnelRow[];
}

async function fetchAllFunnelData(): Promise<FunnelData> {
  const [onboarding, diagnostic] = await Promise.all([
    fetchFunnelRows("onboarding"),
    fetchFunnelRows("diagnostic"),
  ]);
  return { onboarding, diagnostic };
}

// ── 집계 ───────────────────────────────────────────────────────────────────

/** 단계별 고유 userId 수 계산 */
function computeStepCounts(rows: FunnelRow[], steps: FunnelStep[]): number[] {
  return steps.map(({ event }) => {
    const ids = new Set<string>();
    for (const r of rows) {
      if (r.path === event && r.userId) ids.add(r.userId);
    }
    return ids.size;
  });
}

/** 전환율(이전 단계 대비 %) */
function convRate(current: number, prev: number): string {
  if (prev === 0) return "—";
  return `${Math.round((current / prev) * 100)}%`;
}

/** 최대 이탈 단계 인덱스 (감소폭 최대인 step → 다음 step 전환) */
function maxDropIdx(counts: number[]): number {
  let maxDrop = 0;
  let idx = -1;
  for (let i = 1; i < counts.length; i++) {
    const drop = counts[i - 1] - counts[i];
    if (drop > maxDrop) {
      maxDrop = drop;
      idx = i;
    }
  }
  return idx;
}

// ── UI 컴포넌트 ────────────────────────────────────────────────────────────

interface StepRowProps {
  step: FunnelStep;
  count: number;
  prevCount: number | null;
  isMaxDrop: boolean;
  isFirst: boolean;
}

function StepRow({ step, count, prevCount, isMaxDrop, isFirst }: StepRowProps) {
  const rate = prevCount !== null ? convRate(count, prevCount) : null;
  const drop = prevCount !== null ? prevCount - count : 0;

  // 진행 바 너비: 첫 단계 대비 비율
  const barPct = prevCount !== null
    ? prevCount > 0
      ? Math.round((count / prevCount) * 100)
      : 0
    : 100;

  return (
    <div className="space-y-1">
      {!isFirst && (
        <div className={cn(
          "flex items-center gap-1.5 py-0.5 text-[11px]",
          isMaxDrop ? "font-semibold text-destructive" : "text-muted-foreground",
        )}>
          {isMaxDrop && <TrendingDown size={11} className="shrink-0" />}
          <span>
            전환 {rate}
            {drop > 0 && (
              <span className={cn("ml-1", isMaxDrop ? "text-destructive" : "text-muted-foreground")}>
                (−{drop}명 이탈{isMaxDrop ? " ← 최대 이탈 지점" : ""})
              </span>
            )}
          </span>
        </div>
      )}
      <div className={cn(
        "flex items-center justify-between rounded-xl border px-3 py-2.5",
        isMaxDrop ? "border-destructive/30 bg-destructive/5" : "bg-card",
      )}>
        <span className="text-sm font-medium">{step.label}</span>
        <span className="flex items-center gap-1.5">
          <span className="text-base font-bold tabular-nums">{count}</span>
          <span className="text-xs text-muted-foreground">명</span>
        </span>
      </div>
      {/* 진행 바 */}
      <div className="h-1 overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isMaxDrop ? "bg-destructive/60" : count === 0 ? "bg-muted" : "bg-primary/60",
          )}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  );
}

interface FunnelCardProps {
  title: string;
  subtitle: string;
  steps: FunnelStep[];
  counts: number[];
}

function FunnelCard({ title, subtitle, steps, counts }: FunnelCardProps) {
  const dropIdx = maxDropIdx(counts);
  const topCount = counts[0] ?? 0;
  const bottomCount = counts[counts.length - 1] ?? 0;
  const overallRate = convRate(bottomCount, topCount);

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-start gap-2">
        <GitBranch size={15} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {topCount > 0 && (
          <span className="ml-auto shrink-0 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary">
            전체 전환 {overallRate}
          </span>
        )}
      </div>

      {topCount === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          아직 기록된 퍼널 이벤트가 없습니다.
        </p>
      ) : (
        <div className="space-y-1">
          {steps.map((step, i) => (
            <StepRow
              key={step.event}
              step={step}
              count={counts[i] ?? 0}
              prevCount={i > 0 ? (counts[i - 1] ?? null) : null}
              isMaxDrop={i === dropIdx}
              isFirst={i === 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────

export default function FunnelSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["funnel-section-30d"],
    staleTime: 5 * 60_000,
    queryFn: fetchAllFunnelData,
  });

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl border bg-muted/40" />;
  }

  if (isError) {
    return null; // 권한 부족 또는 오류 시 조용히 숨김
  }

  const onboardingCounts = computeStepCounts(data?.onboarding ?? [], ONBOARDING_STEPS);
  const diagnosticCounts = computeStepCounts(data?.diagnostic ?? [], DIAGNOSTIC_STEPS);

  const totalUsers =
    (data?.onboarding ?? []).reduce((acc, r) => {
      acc.add(r.userId);
      return acc;
    }, new Set<string>()).size +
    (data?.diagnostic ?? []).reduce((acc, r) => {
      acc.add(r.userId);
      return acc;
    }, new Set<string>()).size;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold">
        <GitBranch size={15} className="text-primary" />
        온보딩·진단 퍼널 전환
        <span className="text-[11px] font-normal text-muted-foreground">
          — 최근 30일 · 로그인 회원 기준
        </span>
      </h2>
      <p className="mb-4 text-[11px] text-muted-foreground">
        단계별 고유 회원 수 · 이전 단계 대비 전환율 · 최대 이탈 지점(빨강)
        {totalUsers > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users size={10} />
            {totalUsers}명 기록
          </span>
        )}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <FunnelCard
          title="온보딩 퍼널"
          subtitle="신입생 체크리스트 완료 흐름"
          steps={ONBOARDING_STEPS}
          counts={onboardingCounts}
        />
        <FunnelCard
          title="진단평가 퍼널"
          subtitle="연구 준비도 진단 완료 흐름"
          steps={DIAGNOSTIC_STEPS}
          counts={diagnosticCounts}
        />
      </div>
    </section>
  );
}
