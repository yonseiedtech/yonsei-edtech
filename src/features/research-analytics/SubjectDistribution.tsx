"use client";

import { useMemo, useState } from "react";
import type { AlumniThesis } from "@/types";
import { classifyTitle, eraOf, ERA_ORDER, AUDIENCE_DICT, CONTEXT_DICT } from "./title-analysis";
import { yearFrom } from "./shared";

type Mode = "audience" | "context";
const MODE_LABEL: Record<Mode, string> = {
  audience: "연구 대상자",
  context: "응용 영역",
};

const MODE_KEYS: Record<Mode, string[]> = {
  audience: Object.keys(AUDIENCE_DICT),
  context: Object.keys(CONTEXT_DICT),
};

const COLORS = ["#1e3a8a", "#0f766e", "#7c3aed", "#b45309", "#be185d", "#15803d", "#0369a1"];

export default function SubjectDistribution({ theses }: { theses: AlumniThesis[] }) {
  const [mode, setMode] = useState<Mode>("audience");

  const labels = MODE_KEYS[mode];

  const eraMatrix = useMemo(() => {
    // [eraIdx][labelIdx] = count
    const out: number[][] = ERA_ORDER.map(() => labels.map(() => 0));
    const eraIdx: Record<string, number> = {};
    ERA_ORDER.forEach((e, i) => (eraIdx[e] = i));
    theses.forEach((t) => {
      const y = yearFrom(t);
      if (y == null) return;
      const ei = eraIdx[eraOf(y)];
      if (ei == null) return;
      const c = classifyTitle(t.title ?? "");
      const matched = mode === "audience" ? c.audiences : c.contexts;
      matched.forEach((label) => {
        const li = labels.indexOf(label);
        if (li >= 0) out[ei][li]++;
      });
    });
    return out;
  }, [theses, labels, mode]);

  const totals = useMemo(() => {
    const out = labels.map((_, li) => eraMatrix.reduce((a, row) => a + row[li], 0));
    return out;
  }, [eraMatrix, labels]);

  const grandTotal = totals.reduce((a, b) => a + b, 0) || 1;

  // donut segments (cumulative angle)
  const segments = useMemo(() => {
    let acc = 0;
    return totals.map((v, i) => {
      const start = (acc / grandTotal) * Math.PI * 2;
      acc += v;
      const end = (acc / grandTotal) * Math.PI * 2;
      return { start, end, value: v, label: labels[i], color: COLORS[i % COLORS.length] };
    });
  }, [totals, grandTotal, labels]);

  const eraMax = useMemo(() => {
    return Math.max(...eraMatrix.map((row) => row.reduce((a, b) => a + b, 0)), 1);
  }, [eraMatrix]);

  if (theses.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="text-muted-foreground">분류 기준</span>
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => {
          const active = m === mode;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-2 py-1 font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Donut */}
        <div className="rounded-lg border bg-white p-4">
          <h5 className="mb-2 text-[12px] font-semibold text-muted-foreground">
            전체 비중
          </h5>
          <div className="flex flex-col items-center">
            <svg viewBox="-110 -110 220 220" className="h-40 w-40">
              {segments.map((s, i) => {
                if (s.value === 0) return null;
                const r = 95;
                const ir = 55;
                const x1 = r * Math.sin(s.start);
                const y1 = -r * Math.cos(s.start);
                const x2 = r * Math.sin(s.end);
                const y2 = -r * Math.cos(s.end);
                const ix1 = ir * Math.sin(s.start);
                const iy1 = -ir * Math.cos(s.start);
                const ix2 = ir * Math.sin(s.end);
                const iy2 = -ir * Math.cos(s.end);
                const large = s.end - s.start > Math.PI ? 1 : 0;
                const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z`;
                return (
                  <path key={i} d={d} fill={s.color} stroke="white" strokeWidth={1.5}>
                    <title>{`${s.label}: ${s.value}건 (${Math.round((s.value / grandTotal) * 100)}%)`}</title>
                  </path>
                );
              })}
              <text textAnchor="middle" dy="0.3em" fontSize={14} fontWeight={700} fill="#0f172a">
                {grandTotal}
              </text>
              <text textAnchor="middle" dy="2em" fontSize={9} fill="#64748b">
                건 매칭
              </text>
            </svg>
            <ul className="mt-3 w-full space-y-1 text-[11px]">
              {segments.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-sm"
                      style={{ background: s.color }}
                    />
                    <span className="truncate">{s.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {s.value}건 ({Math.round((s.value / grandTotal) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Stacked bars by era */}
        <div className="rounded-lg border bg-white p-4">
          <h5 className="mb-3 text-[12px] font-semibold text-muted-foreground">
            시대별 분포
          </h5>
          <div className="space-y-2">
            {ERA_ORDER.map((era, ei) => {
              const row = eraMatrix[ei];
              const sum = row.reduce((a, b) => a + b, 0);
              const widthRel = (sum / eraMax) * 100;
              return (
                <div key={era} className="grid grid-cols-[60px_minmax(0,1fr)_56px] items-center gap-2 text-[11px]">
                  <span className="text-right text-muted-foreground">{era}</span>
                  <div className="h-4 w-full overflow-hidden rounded-md bg-slate-50">
                    <div className="flex h-full" style={{ width: `${widthRel}%` }}>
                      {row.map((v, li) => {
                        if (sum === 0 || v === 0) return null;
                        return (
                          <div
                            key={li}
                            style={{ width: `${(v / sum) * 100}%`, background: COLORS[li % COLORS.length] }}
                            title={`${era} · ${labels[li]}: ${v}건`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    <span className="font-semibold text-foreground">{sum}</span>건
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10.5px] text-muted-foreground">
            ※ 한 논문 제목이 여러 {MODE_LABEL[mode]} 카테고리에 동시 해당될 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
