"use client";

import { useMemo } from "react";
import type { AlumniThesis } from "@/types";
import { classifyTitle, eraOf, ERA_ORDER } from "./title-analysis";
import { yearFrom } from "./shared";

interface AxisCounts {
  // index aligned with ERA_ORDER
  left: number[]; // e.g. quant
  right: number[]; // e.g. qual
  neither: number[];
}

function buildAxis(
  theses: AlumniThesis[],
  pickLeft: (t: AlumniThesis) => boolean,
  pickRight: (t: AlumniThesis) => boolean,
): AxisCounts {
  const eraIdx: Record<string, number> = {};
  ERA_ORDER.forEach((e, i) => (eraIdx[e] = i));
  const left = ERA_ORDER.map(() => 0);
  const right = ERA_ORDER.map(() => 0);
  const neither = ERA_ORDER.map(() => 0);
  theses.forEach((t) => {
    const y = yearFrom(t);
    if (y == null) return;
    const era = eraOf(y);
    const idx = eraIdx[era];
    if (idx == null) return;
    const l = pickLeft(t);
    const r = pickRight(t);
    if (l) left[idx]++;
    if (r) right[idx]++;
    if (!l && !r) neither[idx]++;
  });
  return { left, right, neither };
}

function StackedBars({
  data,
  leftLabel,
  rightLabel,
  leftColor,
  rightColor,
}: {
  data: AxisCounts;
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
}) {
  const totals = data.left.map((_, i) => data.left[i] + data.right[i] + data.neither[i]);
  const maxTotal = Math.max(...totals, 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ background: leftColor }} />
            {leftLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ background: rightColor }} />
            {rightLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="inline-block h-2 w-3 rounded-sm bg-slate-200" />
            기타
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {ERA_ORDER.map((era, i) => {
          const total = totals[i] || 1;
          const lPct = (data.left[i] / total) * 100;
          const rPct = (data.right[i] / total) * 100;
          const nPct = (data.neither[i] / total) * 100;
          const widthRel = (totals[i] / maxTotal) * 100;
          return (
            <div key={era} className="grid grid-cols-[60px_minmax(0,1fr)_64px] items-center gap-2 text-[11px]">
              <span className="text-right text-muted-foreground">{era}</span>
              <div className="h-4 w-full overflow-hidden rounded-md bg-slate-50">
                <div
                  className="h-full"
                  style={{ width: `${widthRel}%`, display: "flex" }}
                  title={`${era}: ${leftLabel} ${data.left[i]} / ${rightLabel} ${data.right[i]} / 기타 ${data.neither[i]}`}
                >
                  <div style={{ width: `${lPct}%`, background: leftColor }} />
                  <div style={{ width: `${rPct}%`, background: rightColor }} />
                  <div style={{ width: `${nPct}%`, background: "#e2e8f0" }} />
                </div>
              </div>
              <span className="tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{totals[i]}</span>건
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ResearchTypeChart({ theses }: { theses: AlumniThesis[] }) {
  const classified = useMemo(
    () => theses.map((t) => ({ t, c: classifyTitle(t.title ?? "") })),
    [theses],
  );

  const quantQual = useMemo(
    () =>
      buildAxis(
        theses,
        (t) => classified.find((x) => x.t === t)?.c.quant ?? false,
        (t) => classified.find((x) => x.t === t)?.c.qual ?? false,
      ),
    [theses, classified],
  );

  const devAnalyze = useMemo(
    () =>
      buildAxis(
        theses,
        (t) => classified.find((x) => x.t === t)?.c.dev ?? false,
        (t) => classified.find((x) => x.t === t)?.c.analyze ?? false,
      ),
    [theses, classified],
  );

  // 인사이트 자동 생성: 최근 5년 vs 이전 5년 정량/정성 비율 변화
  const insight = useMemo(() => {
    const recent = quantQual.left[4] + quantQual.right[4]; // 2020-
    const recentQual = quantQual.right[4];
    const prev = quantQual.left[3] + quantQual.right[3]; // 2015-19
    const prevQual = quantQual.right[3];
    if (recent < 5 || prev < 5) return null;
    const recentPct = Math.round((recentQual / Math.max(1, recent)) * 100);
    const prevPct = Math.round((prevQual / Math.max(1, prev)) * 100);
    const delta = recentPct - prevPct;
    if (Math.abs(delta) < 5) return null;
    return delta > 0
      ? `최근 5년간 정성 연구 비중이 ${prevPct}% → ${recentPct}%로 ${delta}%p 증가했습니다.`
      : `최근 5년간 정량 연구 비중이 ${100 - prevPct}% → ${100 - recentPct}%로 ${-delta}%p 증가했습니다.`;
  }, [quantQual]);

  if (theses.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-white p-4">
        <h4 className="mb-3 text-sm font-bold">정량 ↔ 정성 연구 추세</h4>
        <StackedBars
          data={quantQual}
          leftLabel="정량 (효과·영향·관계)"
          rightLabel="정성 (사례·경험·인식)"
          leftColor="#1e3a8a"
          rightColor="#7c3aed"
        />
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h4 className="mb-3 text-sm font-bold">개발 ↔ 분석 연구 추세</h4>
        <StackedBars
          data={devAnalyze}
          leftLabel="개발 (개발·설계·구축)"
          rightLabel="분석 (분석·비교·검증)"
          leftColor="#15803d"
          rightColor="#b45309"
        />
      </div>

      {insight && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
          <span className="font-semibold">📊 자동 인사이트:</span> {insight}
        </div>
      )}

      <p className="text-[10.5px] text-muted-foreground">
        ※ 분류는 제목에 포함된 키워드 사전 매칭으로 자동 추정한 결과로, 한 논문이 여러 축에 동시 해당될 수 있습니다.
      </p>
    </div>
  );
}
