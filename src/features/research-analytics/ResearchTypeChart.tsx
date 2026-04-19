"use client";

import { useMemo, useState } from "react";
import type { AlumniThesis } from "@/types";
import { classifyTitle, analyzeAbstract, type AbstractMethodType } from "./title-analysis";
import {
  yearFrom,
  dynamicEras,
  bucketIndexOf,
  thesesYearRange,
  STEP_OPTIONS,
  type StepYears,
  type EraBucket,
} from "./shared";

interface AxisCounts {
  buckets: EraBucket[];
  left: number[];
  right: number[];
  neither: number[];
}

function buildAxis(
  theses: AlumniThesis[],
  buckets: EraBucket[],
  pickLeft: (t: AlumniThesis) => boolean,
  pickRight: (t: AlumniThesis) => boolean,
): AxisCounts {
  const left = buckets.map(() => 0);
  const right = buckets.map(() => 0);
  const neither = buckets.map(() => 0);
  theses.forEach((t) => {
    const y = yearFrom(t);
    if (y == null) return;
    const idx = bucketIndexOf(buckets, y);
    if (idx === -1) return;
    const l = pickLeft(t);
    const r = pickRight(t);
    if (l) left[idx]++;
    if (r) right[idx]++;
    if (!l && !r) neither[idx]++;
  });
  return { buckets, left, right, neither };
}

interface MethodCounts {
  buckets: EraBucket[];
  quant: number[];
  qual: number[];
  mixed: number[];
  unknown: number[];
}

function buildMethod(theses: AlumniThesis[], buckets: EraBucket[]): MethodCounts {
  const quant = buckets.map(() => 0);
  const qual = buckets.map(() => 0);
  const mixed = buckets.map(() => 0);
  const unknown = buckets.map(() => 0);
  theses.forEach((t) => {
    const y = yearFrom(t);
    if (y == null) return;
    const idx = bucketIndexOf(buckets, y);
    if (idx === -1) return;
    const a = analyzeAbstract(t.abstract);
    if (a.type === "quantitative") quant[idx]++;
    else if (a.type === "qualitative") qual[idx]++;
    else if (a.type === "mixed") mixed[idx]++;
    else unknown[idx]++;
  });
  return { buckets, quant, qual, mixed, unknown };
}

function StackedBars({
  data,
  labels,
  colors,
}: {
  data: { buckets: EraBucket[]; series: number[][] };
  labels: string[];
  colors: string[];
}) {
  const totals = data.buckets.map((_, i) =>
    data.series.reduce((sum, s) => sum + (s[i] ?? 0), 0),
  );
  const maxTotal = Math.max(...totals, 1);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        {labels.map((label, i) => (
          <span key={label} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-3 rounded-sm"
              style={{ background: colors[i] }}
            />
            {label}
          </span>
        ))}
      </div>
      <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
        {data.buckets.map((bucket, i) => {
          const total = totals[i] || 0;
          const widthRel = (total / maxTotal) * 100;
          return (
            <div
              key={bucket.label}
              className="grid grid-cols-[76px_minmax(0,1fr)_64px] items-center gap-2 text-[11px]"
            >
              <span className="truncate text-right text-muted-foreground">{bucket.label}</span>
              <div className="h-4 w-full overflow-hidden rounded-md bg-slate-50">
                <div
                  className="flex h-full transition-[width] duration-500"
                  style={{ width: `${widthRel}%` }}
                  title={`${bucket.label}: ${labels.map((l, li) => `${l} ${data.series[li]?.[i] ?? 0}`).join(" / ")}`}
                >
                  {data.series.map((s, li) => {
                    const v = s[i] ?? 0;
                    if (total === 0 || v === 0) return null;
                    return (
                      <div
                        key={li}
                        style={{
                          width: `${(v / total) * 100}%`,
                          background: colors[li],
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              <span className="tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{total}</span>건
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const METHOD_LABELS: Record<AbstractMethodType, string> = {
  quantitative: "양적",
  qualitative: "질적",
  mixed: "혼합",
  unknown: "미상",
};

export default function ResearchTypeChart({ theses }: { theses: AlumniThesis[] }) {
  const [step, setStep] = useState<StepYears>(5);

  const dataRange = useMemo(() => thesesYearRange(theses), [theses]);
  const buckets = useMemo(
    () => dynamicEras(dataRange.min, dataRange.max, step),
    [dataRange.min, dataRange.max, step],
  );

  const classified = useMemo(() => {
    const map = new Map<AlumniThesis, ReturnType<typeof classifyTitle>>();
    theses.forEach((t) => map.set(t, classifyTitle(t.title ?? "")));
    return map;
  }, [theses]);

  const quantQual = useMemo(
    () =>
      buildAxis(
        theses,
        buckets,
        (t) => classified.get(t)?.quant ?? false,
        (t) => classified.get(t)?.qual ?? false,
      ),
    [theses, classified, buckets],
  );

  const devAnalyze = useMemo(
    () =>
      buildAxis(
        theses,
        buckets,
        (t) => classified.get(t)?.dev ?? false,
        (t) => classified.get(t)?.analyze ?? false,
      ),
    [theses, classified, buckets],
  );

  const methodFromAbstract = useMemo(() => buildMethod(theses, buckets), [theses, buckets]);

  // 초록 분석 가능 비율 (unknown 제외)
  const abstractCoverage = useMemo(() => {
    const total =
      methodFromAbstract.quant.reduce((a, b) => a + b, 0) +
      methodFromAbstract.qual.reduce((a, b) => a + b, 0) +
      methodFromAbstract.mixed.reduce((a, b) => a + b, 0);
    const grand = total + methodFromAbstract.unknown.reduce((a, b) => a + b, 0);
    if (grand === 0) return null;
    return { analyzed: total, total: grand, pct: Math.round((total / grand) * 100) };
  }, [methodFromAbstract]);

  // 자동 인사이트 (제목 기준)
  const insight = useMemo(() => {
    const n = quantQual.buckets.length;
    if (n < 2) return null;
    const recentIdx = n - 1;
    const prevIdx = n - 2;
    const recent = quantQual.left[recentIdx] + quantQual.right[recentIdx];
    const recentQual = quantQual.right[recentIdx];
    const prev = quantQual.left[prevIdx] + quantQual.right[prevIdx];
    const prevQual = quantQual.right[prevIdx];
    if (recent < 5 || prev < 5) return null;
    const recentPct = Math.round((recentQual / Math.max(1, recent)) * 100);
    const prevPct = Math.round((prevQual / Math.max(1, prev)) * 100);
    const delta = recentPct - prevPct;
    if (Math.abs(delta) < 5) return null;
    const recentLabel = quantQual.buckets[recentIdx].label;
    const prevLabel = quantQual.buckets[prevIdx].label;
    return delta > 0
      ? `${prevLabel}→${recentLabel}: 정성 연구 비중이 ${prevPct}% → ${recentPct}%로 ${delta}%p 증가했습니다.`
      : `${prevLabel}→${recentLabel}: 정량 연구 비중이 ${100 - prevPct}% → ${100 - recentPct}%로 ${-delta}%p 증가했습니다.`;
  }, [quantQual]);

  if (theses.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 시대 단위 */}
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">시대 단위</span>
          {STEP_OPTIONS.map((opt) => {
            const active = opt === step;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setStep(opt)}
                className={`rounded-md px-2 py-1 font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {opt}년
              </button>
            );
          })}
        </div>
        <span className="text-muted-foreground">{buckets.length}개 구간</span>
      </div>

      {/* 초록 기반 양적/질적/혼합 (NEW) */}
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h4 className="text-sm font-bold">
            초록 기반 연구 방법
            <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              NEW · 초록 키워드 매칭
            </span>
          </h4>
          {abstractCoverage && (
            <span className="text-[10.5px] text-muted-foreground">
              초록 분석 가능 {abstractCoverage.analyzed}/{abstractCoverage.total}건 ({abstractCoverage.pct}%)
            </span>
          )}
        </div>
        <StackedBars
          data={{
            buckets: methodFromAbstract.buckets,
            series: [
              methodFromAbstract.quant,
              methodFromAbstract.qual,
              methodFromAbstract.mixed,
              methodFromAbstract.unknown,
            ],
          }}
          labels={[
            METHOD_LABELS.quantitative + " (통계·설문·검증)",
            METHOD_LABELS.qualitative + " (면담·관찰·코딩)",
            METHOD_LABELS.mixed + " (양적+질적)",
            METHOD_LABELS.unknown + " (초록 부족·미분류)",
          ]}
          colors={["#1e3a8a", "#7c3aed", "#0f766e", "#cbd5e1"]}
        />
      </div>

      {/* 제목 기반 정량 ↔ 정성 */}
      <div className="rounded-lg border bg-white p-4">
        <h4 className="mb-3 text-sm font-bold">
          제목 기반 정량 ↔ 정성
          <span className="ml-2 text-[10px] font-normal text-muted-foreground">
            제목 키워드 사전 매칭
          </span>
        </h4>
        <StackedBars
          data={{
            buckets: quantQual.buckets,
            series: [quantQual.left, quantQual.right, quantQual.neither],
          }}
          labels={["정량 (효과·영향·관계)", "정성 (사례·경험·인식)", "기타"]}
          colors={["#1e3a8a", "#7c3aed", "#e2e8f0"]}
        />
      </div>

      {/* 제목 기반 개발 ↔ 분석 */}
      <div className="rounded-lg border bg-white p-4">
        <h4 className="mb-3 text-sm font-bold">제목 기반 개발 ↔ 분석</h4>
        <StackedBars
          data={{
            buckets: devAnalyze.buckets,
            series: [devAnalyze.left, devAnalyze.right, devAnalyze.neither],
          }}
          labels={["개발 (개발·설계·구축)", "분석 (분석·비교·검증)", "기타"]}
          colors={["#15803d", "#b45309", "#e2e8f0"]}
        />
      </div>

      {insight && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900 animate-in fade-in slide-in-from-bottom-1 duration-300">
          <span className="font-semibold">📊 자동 인사이트:</span> {insight}
        </div>
      )}

      <p className="text-[10.5px] text-muted-foreground">
        ※ 제목 기반 분류는 키워드 사전 매칭으로 자동 추정. 초록 기반 분류는 통계·면담 등 방법론 단서를 카운트하여 양적 ≥2 + 질적 ≥2 → 혼합으로 판정합니다. 초록이 짧거나 미수록인 논문은 "미상"으로 분류됩니다.
      </p>
    </div>
  );
}
