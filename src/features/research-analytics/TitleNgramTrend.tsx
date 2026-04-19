"use client";

import { useMemo, useState } from "react";
import type { AlumniThesis } from "@/types";
import { topNgrams, eraOf, ERA_ORDER } from "./title-analysis";
import { yearFrom } from "./shared";

const N_OPTIONS = [2, 3] as const;
const TOP_OPTIONS = [10, 20, 30, 50] as const;
type NSize = (typeof N_OPTIONS)[number];
type TopSize = (typeof TOP_OPTIONS)[number];

export default function TitleNgramTrend({ theses }: { theses: AlumniThesis[] }) {
  const [n, setN] = useState<NSize>(2);
  const [topN, setTopN] = useState<TopSize>(20);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const items = useMemo(() => topNgrams(theses, n, topN), [theses, n, topN]);
  const maxCount = items[0]?.count ?? 1;

  // 연도별 분포 (sparkline용 — era 단위)
  const eraSeries = useMemo(() => {
    return items.map((it) => {
      const eraCounts: Record<string, number> = {};
      ERA_ORDER.forEach((e) => (eraCounts[e] = 0));
      Object.entries(it.byYear).forEach(([y, c]) => {
        const era = eraOf(Number(y));
        if (era in eraCounts) eraCounts[era] += c;
      });
      const max = Math.max(...Object.values(eraCounts), 1);
      return { eraCounts, max };
    });
  }, [items]);

  // 빠른 통계
  const yearsCovered = useMemo(() => {
    const ys = theses.map(yearFrom).filter((y): y is number => y != null);
    return ys.length > 0 ? `${Math.min(...ys)}–${Math.max(...ys)}` : "—";
  }, [theses]);

  if (theses.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        제목 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">N-gram</span>
            {N_OPTIONS.map((opt) => {
              const active = opt === n;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setN(opt)}
                  className={`rounded-md px-2 py-1 font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {opt}어절
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">상위</span>
            {TOP_OPTIONS.map((opt) => {
              const active = opt === topN;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTopN(opt)}
                  className={`rounded-md px-2 py-1 font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {opt}개
                </button>
              );
            })}
          </div>
        </div>
        <span className="text-muted-foreground">기간 {yearsCovered}</span>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          해당 N-gram이 추출되지 않았습니다.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {items.map((it, i) => {
            const widthPct = (it.count / maxCount) * 100;
            const series = eraSeries[i];
            const isHover = hoverIdx === i;
            return (
              <li
                key={it.ngram}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                className="grid grid-cols-[28px_minmax(0,1fr)_140px_36px] items-center gap-3 px-3 py-2 text-[12px] hover:bg-slate-50"
              >
                <span className="text-right tabular-nums text-muted-foreground">{i + 1}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{it.ngram}</p>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
                {/* Era sparkline */}
                <div className="flex h-7 items-end gap-0.5">
                  {ERA_ORDER.map((era) => {
                    const c = series.eraCounts[era] ?? 0;
                    const h = (c / series.max) * 100;
                    return (
                      <div
                        key={era}
                        className="group relative flex-1"
                        style={{ height: "100%" }}
                      >
                        <div
                          className={`absolute bottom-0 w-full rounded-t-sm transition-colors ${
                            isHover && c > 0 ? "bg-primary" : c > 0 ? "bg-primary/40" : "bg-slate-200"
                          }`}
                          style={{ height: `${h}%`, minHeight: c > 0 ? 2 : 0 }}
                          title={`${era}: ${c}건`}
                        />
                      </div>
                    );
                  })}
                </div>
                <span className="text-right tabular-nums font-semibold text-foreground">
                  {it.count}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
        <span>막대: 시대별 등장 빈도 ({ERA_ORDER.join(" / ")})</span>
        <span>데이터: 졸업생 학위논문 {theses.length}건 제목 토큰화</span>
      </div>
    </div>
  );
}
