"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { AlumniThesis } from "@/types";
import { topNgrams, eraOf, ERA_ORDER } from "./title-analysis";
import { yearFrom, thesesYearRange } from "./shared";

const N_OPTIONS = [2, 3] as const;
const TOP_OPTIONS = [10, 20, 30, 50] as const;
type NSize = (typeof N_OPTIONS)[number];
type TopSize = (typeof TOP_OPTIONS)[number];

export default function TitleNgramTrend({ theses }: { theses: AlumniThesis[] }) {
  const [n, setN] = useState<NSize>(2);
  const [topN, setTopN] = useState<TopSize>(20);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // 사용자 정의 기간
  const dataRange = useMemo(() => thesesYearRange(theses), [theses]);
  const [yearStart, setYearStart] = useState<number>(dataRange.min);
  const [yearEnd, setYearEnd] = useState<number>(dataRange.max);
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (!synced && theses.length > 0) {
      setYearStart(dataRange.min);
      setYearEnd(dataRange.max);
      setSynced(true);
    }
  }, [theses.length, dataRange.min, dataRange.max, synced]);

  const lo = Math.min(yearStart, yearEnd);
  const hi = Math.max(yearStart, yearEnd);

  // 기간 필터 적용된 theses
  const filteredTheses = useMemo(
    () =>
      theses.filter((t) => {
        const y = yearFrom(t);
        return y != null && y >= lo && y <= hi;
      }),
    [theses, lo, hi],
  );

  const items = useMemo(
    () => topNgrams(filteredTheses, n, topN),
    [filteredTheses, n, topN],
  );
  const maxCount = items[0]?.count ?? 1;

  // era 단위 분포 (sparkline용)
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

  // hover된 N-gram의 최근 논문 (포함하는 제목)
  const hoverPapers = useMemo(() => {
    if (hoverIdx == null) return [];
    const ngram = items[hoverIdx]?.ngram;
    if (!ngram) return [];
    const tokens = ngram.split(" ");
    return filteredTheses
      .filter((t) => tokens.every((tok) => (t.title ?? "").includes(tok)))
      .sort((a, b) => (b.awardedYearMonth ?? "").localeCompare(a.awardedYearMonth ?? ""))
      .slice(0, 5);
  }, [hoverIdx, items, filteredTheses]);

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
        <div className="flex flex-wrap items-center gap-3">
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
        <span className="text-muted-foreground">
          분석 대상 {filteredTheses.length}건 / 전체 {theses.length}건
        </span>
      </div>

      {/* 사용자 정의 기간 */}
      <div className="mb-3 rounded-lg border bg-slate-50/50 px-3 py-2.5">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="font-medium text-muted-foreground">분석 기간</span>
          <span className="font-semibold text-foreground">
            {lo}년 – {hi}년 ({hi - lo + 1}년간)
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-3">
          <label className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
            <span className="w-10 shrink-0 text-right">시작</span>
            <input
              type="range"
              min={dataRange.min}
              max={dataRange.max}
              value={yearStart}
              onChange={(e) => setYearStart(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer accent-primary"
              aria-label="분석 시작 연도"
            />
            <span className="w-10 shrink-0 text-right tabular-nums font-medium text-foreground">
              {yearStart}
            </span>
          </label>
          <label className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
            <span className="w-10 shrink-0 text-right">종료</span>
            <input
              type="range"
              min={dataRange.min}
              max={dataRange.max}
              value={yearEnd}
              onChange={(e) => setYearEnd(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer accent-primary"
              aria-label="분석 종료 연도"
            />
            <span className="w-10 shrink-0 text-right tabular-nums font-medium text-foreground">
              {yearEnd}
            </span>
          </label>
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          해당 N-gram이 추출되지 않았습니다.
        </p>
      ) : (
        <div className="rounded-lg border bg-white">
          {/* 타이틀 행 */}
          <div className="grid grid-cols-[28px_minmax(0,1fr)_140px_36px] items-center gap-3 border-b bg-slate-50/70 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="text-right">순위</span>
            <span>{n}어절 키워드</span>
            <span className="grid grid-cols-5 gap-[2px] text-center text-[9.5px] normal-case tracking-normal">
              {ERA_ORDER.map((era) => (
                <span key={era} title={`${era}년대`}>
                  {era}
                </span>
              ))}
            </span>
            <span className="text-right">빈도</span>
          </div>
          <ul className="divide-y">
            {items.map((it, i) => {
              const widthPct = (it.count / maxCount) * 100;
              const series = eraSeries[i];
              const isHover = hoverIdx === i;
              return (
                <li
                  key={it.ngram}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  className={`grid grid-cols-[28px_minmax(0,1fr)_140px_36px] items-center gap-3 px-3 py-2 text-[12px] transition-colors ${
                    isHover ? "bg-primary/5" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-right tabular-nums text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{it.ngram}</p>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-[width] duration-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
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
                              isHover && c > 0
                                ? "bg-primary"
                                : c > 0
                                  ? "bg-primary/40"
                                  : "bg-slate-200"
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
        </div>
      )}

      {/* Hover 상세 — 해당 N-gram 포함 논문 미리보기 */}
      <div className="mt-3 min-h-[88px] rounded-xl border bg-gradient-to-br from-slate-50 to-white p-3 transition-all duration-200">
        {hoverIdx != null && hoverPapers.length > 0 ? (
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-200">
            <div className="mb-2 flex items-baseline justify-between border-b pb-1.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-primary">
                "{items[hoverIdx]?.ngram}" 포함 최근 논문
              </p>
              <span className="text-[10.5px] tabular-nums text-muted-foreground">
                {items[hoverIdx]?.count}건 중 최근 5건
              </span>
            </div>
            <ul className="space-y-1">
              {hoverPapers.map((t) => {
                const y = yearFrom(t);
                return (
                  <li key={t.id} className="text-[11px] leading-snug">
                    <Link
                      href={`/alumni/thesis/${t.id}`}
                      className="group flex items-start gap-1.5 rounded-md px-1.5 py-1 hover:bg-primary/5"
                    >
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 text-[10px] tabular-nums text-muted-foreground">
                        {y ?? "—"}
                      </span>
                      <span className="line-clamp-1 text-foreground/80 group-hover:text-primary">
                        {t.title}
                      </span>
                      <ExternalLink
                        size={9}
                        className="mt-1 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="flex h-full min-h-[64px] items-center justify-center text-[11px] text-muted-foreground">
            행에 마우스를 올리면 <span className="ml-1 font-semibold text-primary">해당 키워드 포함 최근 논문</span>이 표시됩니다
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
        <span>막대: 시대별 등장 빈도 ({ERA_ORDER.join(" / ")})</span>
        <span>데이터: {filteredTheses.length}건 제목 토큰화</span>
      </div>
    </div>
  );
}
