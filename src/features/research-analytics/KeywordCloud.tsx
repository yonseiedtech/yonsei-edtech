"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { AlumniThesis } from "@/types";
import { STOPWORDS, normalizeKeyword, yearFrom, thesesYearRange } from "./shared";

interface CloudItem {
  word: string;
  count: number;
}

interface PlacedWord extends CloudItem {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  rotation: 0;
}

const PALETTE = [
  "#1e3a8a", // navy
  "#0369a1", // sky
  "#2563eb", // blue
  "#be185d", // pink
  "#b45309", // amber
  "#15803d", // emerald
  "#0f766e", // teal
];

function hashColor(word: string): string {
  let h = 0;
  for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  pad: number,
): boolean {
  return !(
    ax + aw + pad < bx ||
    bx + bw + pad < ax ||
    ay + ah + pad < by ||
    by + bh + pad < ay
  );
}

/** 텍스트 추정 너비 (한글 = 거의 fontSize 폭, ASCII = 약 0.6×). */
function estimateTextWidth(word: string, fontSize: number): number {
  let total = 0;
  for (const ch of word) {
    const code = ch.charCodeAt(0);
    // CJK Unified, Hangul Syllables, Hangul Jamo, Halfwidth/Fullwidth
    const isWide =
      (code >= 0x1100 && code <= 0x11ff) ||
      (code >= 0x3000 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff00 && code <= 0xffef);
    total += isWide ? fontSize * 1.0 : fontSize * 0.6;
  }
  return total;
}

/** Spiral packing word cloud (deterministic, no JS lib needed). */
function packWords(
  items: CloudItem[],
  width: number,
  height: number,
  maxFont: number,
  minFont: number,
): PlacedWord[] {
  if (items.length === 0) return [];
  const maxCount = items[0].count;
  const minCount = items[items.length - 1]?.count ?? 1;
  const span = Math.max(1, maxCount - minCount);

  const cx = width / 2;
  const cy = height / 2;
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const result: PlacedWord[] = [];

  // 폰트 크기에 비례한 패딩 — 큰 단어 주변에 더 넓은 여백
  const padFor = (fontSize: number) => Math.max(8, Math.round(fontSize * 0.35));

  items.forEach((item) => {
    const norm = (item.count - minCount) / span;
    const fontSize = Math.round(minFont + norm * (maxFont - minFont));
    // 실제 렌더 폭에 맞춘 추정 + 좌우 여백
    const w = estimateTextWidth(item.word, fontSize) + 12;
    // 한글은 디센더가 거의 없지만 안전 마진
    const h = fontSize * 1.3;
    const pad = padFor(fontSize);

    let placedSuccess = false;
    let x = cx;
    let y = cy;

    const stepAngle = 0.32;
    // QA-v3 M: 고정 계수(√t×2.4, 최대 ≈263px)는 확대된 캔버스(1040×760 등)의
    // 가장자리 ~40%에 도달 불가 — 대각 절반까지 닿도록 캔버스 비례 계수 사용
    const radiusStep = (Math.hypot(width, height) / 2) / Math.sqrt(12000);
    for (let t = 0; t < 12000; t++) {
      const angle = t * stepAngle;
      const radius = Math.sqrt(t) * radiusStep;
      x = cx + radius * Math.cos(angle) - w / 2;
      y = cy + radius * Math.sin(angle) - h / 2;
      if (x < 4 || y < 4 || x + w > width - 4 || y + h > height - 4) continue;
      let collide = false;
      for (const p of placed) {
        if (rectsOverlap(x, y, w, h, p.x, p.y, p.w, p.h, pad)) {
          collide = true;
          break;
        }
      }
      if (!collide) {
        placedSuccess = true;
        break;
      }
    }

    if (placedSuccess) {
      placed.push({ x, y, w, h });
      result.push({
        ...item,
        x: x + w / 2,
        y: y + h / 2,
        fontSize,
        color: hashColor(item.word),
        rotation: 0,
      });
    }
  });

  return result;
}

// UX(2026-07-04 사용자 피드백): 중간 단위 3종(20·40·60) 추가
const TOPN_OPTIONS = [10, 20, 30, 40, 50, 60, 80] as const;
type TopN = (typeof TOPN_OPTIONS)[number];

// 항목 수에 따라 폰트/캔버스 동적 조절 — 많을수록 작게, 적을수록 크게
// 패딩이 fontSize * 0.35 + 한글 폭 1.0× 반영하여 캔버스 여유 확보
function dimensionsFor(n: number, narrow = false): {
  width: number;
  height: number;
  maxFont: number;
  minFont: number;
} {
  // UX(2026-07-04): 모바일(<640px)은 좁고 긴 캔버스 — 넓은 캔버스를 축소 렌더하면 글자가 뭉개짐
  if (narrow) {
    if (n <= 10) return { width: 460, height: 420, maxFont: 38, minFont: 17 };
    if (n <= 30) return { width: 480, height: 560, maxFont: 30, minFont: 13 };
    if (n <= 50) return { width: 500, height: 700, maxFont: 26, minFont: 11 };
    return { width: 520, height: 820, maxFont: 22, minFont: 10 };
  }
  if (n <= 10) return { width: 900, height: 380, maxFont: 52, minFont: 22 };
  if (n <= 30) return { width: 960, height: 520, maxFont: 42, minFont: 16 };
  if (n <= 50) return { width: 1000, height: 640, maxFont: 36, minFont: 13 };
  return { width: 1040, height: 760, maxFont: 30, minFont: 11 };
}

export default function KeywordCloud({
  theses,
  defaultTopN = 30,
}: {
  theses: AlumniThesis[];
  defaultTopN?: TopN;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [topN, setTopN] = useState<TopN>(defaultTopN);
  // 모바일 판정 — matchMedia 구독
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const dataRange = useMemo(() => thesesYearRange(theses), [theses]);
  const [yearStart, setYearStart] = useState<number>(dataRange.min);
  const [yearEnd, setYearEnd] = useState<number>(dataRange.max);

  // 데이터 로드 후 슬라이더 초기값을 데이터 실제 범위로 동기화 (1회)
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (!synced && theses.length > 0) {
      setYearStart(dataRange.min);
      setYearEnd(dataRange.max);
      setSynced(true);
    }
  }, [theses.length, dataRange.min, dataRange.max, synced]);

  // 슬라이더 좌(start) 우(end) 교차 방지
  const lo = Math.min(yearStart, yearEnd);
  const hi = Math.max(yearStart, yearEnd);

  const filteredCounts = useMemo(() => {
    const map = new Map<string, number>();
    theses.forEach((t) => {
      const y = yearFrom(t);
      if (y == null || y < lo || y > hi) return;
      (t.keywords ?? []).forEach((raw) => {
        const k = normalizeKeyword(raw);
        if (!k || k.length < 2 || STOPWORDS.has(k)) return;
        map.set(k, (map.get(k) ?? 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);
  }, [theses, lo, hi]);

  const sliced = useMemo(() => filteredCounts.slice(0, topN), [filteredCounts, topN]);
  const dims = useMemo(() => dimensionsFor(sliced.length, narrow), [sliced.length, narrow]);

  const placed = useMemo(
    () => packWords(sliced, dims.width, dims.height, dims.maxFont, dims.minFont),
    [sliced, dims],
  );

  const dropped = sliced.length - placed.length;

  // hover된 키워드 상세 데이터 (논문 목록·연도 분포·공출현 키워드)
  const hoverDetail = useMemo(() => {
    if (!hover) return null;
    const matched = theses.filter((t) =>
      (t.keywords ?? []).some((raw) => normalizeKeyword(raw) === hover),
    );
    if (matched.length === 0) return null;

    // 연도 분포 (시작-종료 범위 내)
    const yearCounts = new Map<number, number>();
    for (let y = lo; y <= hi; y++) yearCounts.set(y, 0);
    matched.forEach((t) => {
      const y = yearFrom(t);
      if (y != null && y >= lo && y <= hi) {
        yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1);
      }
    });

    // 공출현 키워드 top 5
    const coOccur = new Map<string, number>();
    matched.forEach((t) => {
      (t.keywords ?? []).forEach((raw) => {
        const k = normalizeKeyword(raw);
        if (!k || k === hover || k.length < 2 || STOPWORDS.has(k)) return;
        coOccur.set(k, (coOccur.get(k) ?? 0) + 1);
      });
    });
    const coKeywords = Array.from(coOccur.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 최근 논문 5건
    const recentPapers = [...matched]
      .sort((a, b) => (b.awardedYearMonth ?? "").localeCompare(a.awardedYearMonth ?? ""))
      .slice(0, 5);

    return {
      total: matched.length,
      yearCounts,
      coKeywords,
      recentPapers,
    };
  }, [hover, theses, lo, hi]);

  if (theses.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        키워드 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Top-N 선택 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-muted-foreground">상위</span>
          {TOPN_OPTIONS.map((n) => {
            const active = n === topN;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setTopN(n)}
                className={`rounded-md px-2 py-1 font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {n}개
              </button>
            );
          })}
        </div>
        {dropped > 0 && (
          <span className="text-[10.5px] text-amber-700">
            ⓘ 공간 부족으로 {dropped}개 키워드는 표시되지 않았습니다
          </span>
        )}
      </div>

      {/* 연도 범위 슬라이더 */}
      <div className="mb-4 rounded-lg border bg-muted/40 px-3 py-2.5">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="font-medium text-muted-foreground">조회 기간</span>
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
              aria-label="시작 연도"
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
              aria-label="종료 연도"
            />
            <span className="w-10 shrink-0 text-right tabular-nums font-medium text-foreground">
              {yearEnd}
            </span>
          </label>
        </div>
        {filteredCounts.length === 0 && (
          <p className="mt-2 text-[10.5px] text-amber-700">
            ⓘ 선택한 기간에 해당하는 키워드가 없습니다
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        {/* 스크린리더용 동적 요약: 필터 변경 시 자동 알림 */}
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {`${lo}년부터 ${hi}년까지 상위 ${placed.length}개 키워드를 표시합니다.`}
        </p>
        <svg
          viewBox={`0 0 ${dims.width} ${dims.height}`}
          className="mx-auto block w-full max-w-[1040px]"
          role="img"
          aria-label={`연구 키워드 워드 클라우드 (${lo}년~${hi}년, ${placed.length}개 키워드)`}
        >
          {placed.map((p) => {
            const active = hover === p.word;
            return (
              <text
                key={p.word}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={p.fontSize}
                fontWeight={p.fontSize > 26 ? 700 : 500}
                fill={p.color}
                opacity={hover && !active ? 0.25 : 1}
                style={{
                  cursor: "default",
                  transition: "opacity 120ms",
                  fontFamily:
                    "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif",
                }}
                onMouseEnter={() => setHover(p.word)}
                onMouseLeave={() => setHover(null)}
              >
                {p.word}
                <title>{`${p.word} · ${p.count}건`}</title>
              </text>
            );
          })}
        </svg>
      </div>

      {/* Hover 상세 패널 */}
      <div className="mt-3 min-h-[112px] rounded-2xl border bg-gradient-to-br from-muted/40 to-card p-3 transition-all duration-200">
        {hover && hoverDetail ? (
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-200">
            {/* 헤더: 키워드명 + 총 건수 */}
            <div className="mb-2 flex items-baseline justify-between gap-3 border-b pb-2">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-primary">
                  HOVER · 키워드 상세
                </p>
                <h6 className="mt-0.5 text-base font-bold text-foreground">{hover}</h6>
              </div>
              <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold tabular-nums text-primary">
                전체 {hoverDetail.total}건
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
              {/* 연도 분포 mini-bar */}
              <div>
                <p className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
                  연도별 분포 ({lo}–{hi})
                </p>
                <div className="flex h-10 items-end gap-[2px]">
                  {Array.from(hoverDetail.yearCounts.entries()).map(([y, c]) => {
                    const max = Math.max(...hoverDetail.yearCounts.values(), 1);
                    const h = (c / max) * 100;
                    return (
                      <div
                        key={y}
                        className="group relative flex-1"
                        title={`${y}년: ${c}건`}
                      >
                        <div
                          className={`w-full rounded-sm ${c > 0 ? "bg-primary/70" : "bg-muted"}`}
                          style={{ height: `${Math.max(h, c > 0 ? 6 : 2)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* 공출현 키워드 */}
                {hoverDetail.coKeywords.length > 0 && (
                  <div className="mt-2.5">
                    <p className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
                      함께 등장 (Top 5)
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {hoverDetail.coKeywords.map(([k, c]) => (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[10.5px]"
                        >
                          <span className="font-medium text-foreground">{k}</span>
                          <span className="tabular-nums text-muted-foreground">{c}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 최근 논문 */}
              <div>
                <p className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
                  최근 논문 (Top 5)
                </p>
                <ul className="space-y-1">
                  {hoverDetail.recentPapers.map((t) => {
                    const y = yearFrom(t);
                    return (
                      <li key={t.id} className="text-[11px] leading-snug">
                        <Link
                          href={`/alumni/thesis/${t.id}`}
                          className="group flex items-start gap-1.5 rounded-md px-1.5 py-1 hover:bg-primary/5"
                        >
                          <span className="shrink-0 rounded bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
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
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[88px] items-center justify-center text-center text-[11px] text-muted-foreground">
            <span>
              키워드 위에 마우스를 올리면 <span className="font-semibold text-primary">관련 논문·연도 분포·공출현 키워드</span>가 표시됩니다
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
