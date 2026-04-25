"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import type { AlumniThesis } from "@/types";
import { STOPWORDS, normalizeKeyword, yearFrom } from "./shared";

const TOP_PER_ERA = 5;
const MAX_LABEL_CHARS = 8;
const VIEW_ERAS_DESKTOP = 2;
const INTERVAL_OPTIONS = [3, 5, 10] as const;
type IntervalYears = (typeof INTERVAL_OPTIONS)[number];

const PALETTE = ["#1e3a8a", "#0f766e", "#7c3aed", "#b45309"];

interface Era {
  id: string;
  label: string;
  from: number;
  to: number;
}

function buildEras(intervalYears: number): Era[] {
  const START = 2000;
  const THIS_YEAR = new Date().getFullYear();
  const out: Era[] = [];
  for (let y = START; y <= THIS_YEAR; y += intervalYears) {
    const end = y + intervalYears - 1;
    if (end >= THIS_YEAR) {
      out.push({ id: `${y}-`, label: `${y}–현재`, from: y, to: 9999 });
      break;
    }
    out.push({ id: `${y}-${end}`, label: `${y}–${end}`, from: y, to: end });
  }
  return out;
}

function colorFor(word: string): string {
  let h = 0;
  for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function truncateLabel(word: string, max: number = MAX_LABEL_CHARS): string {
  if (word.length <= max) return word;
  return word.slice(0, max - 1) + "…";
}

function pickEraId(year: number | null, eras: Era[]): string | null {
  if (year == null) return null;
  for (const e of eras) if (year >= e.from && year <= e.to) return e.id;
  return null;
}

interface Node {
  era: string;
  word: string;
  count: number;
  x: number;
  y: number;
  r: number;
  isNew: boolean;
}

interface Link {
  source: Node;
  target: Node;
  weight: number;
}

function curve(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export default function ResearchLineageMap({ theses }: { theses: AlumniThesis[] }) {
  const [hoverWord, setHoverWord] = useState<string | null>(null);
  const [intervalYears, setIntervalYears] = useState<IntervalYears>(5);
  const [startIdx, setStartIdx] = useState(0);
  const wheelHostRef = useRef<HTMLDivElement>(null);

  const eras = useMemo(() => buildEras(intervalYears), [intervalYears]);
  const visibleCount = Math.min(VIEW_ERAS_DESKTOP, eras.length);
  const maxStart = Math.max(0, eras.length - visibleCount);
  const safeStart = Math.min(startIdx, maxStart);
  const visibleEras = eras.slice(safeStart, safeStart + visibleCount);

  // Mouse-wheel zoom: scroll up = zoom in (smaller interval), down = zoom out (larger interval)
  useEffect(() => {
    const el = wheelHostRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1; // down -> wider span
      setIntervalYears((curr) => {
        const idx = INTERVAL_OPTIONS.indexOf(curr);
        const next = Math.max(0, Math.min(INTERVAL_OPTIONS.length - 1, idx + dir));
        return INTERVAL_OPTIONS[next];
      });
      setStartIdx(0);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const eraTops = useMemo(() => {
    const byEra: Record<string, AlumniThesis[]> = {};
    eras.forEach((e) => {
      byEra[e.id] = [];
    });
    theses.forEach((t) => {
      const id = pickEraId(yearFrom(t), eras);
      if (id) byEra[id].push(t);
    });

    const result: Record<string, { word: string; count: number }[]> = {};
    eras.forEach((e) => {
      const m = new Map<string, number>();
      byEra[e.id].forEach((t) =>
        (t.keywords ?? []).forEach((raw) => {
          const k = normalizeKeyword(raw);
          if (!k || k.length < 2 || STOPWORDS.has(k)) return;
          m.set(k, (m.get(k) ?? 0) + 1);
        }),
      );
      result[e.id] = Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_PER_ERA)
        .map(([word, count]) => ({ word, count }));
    });
    return result;
  }, [theses, eras]);

  const { nodes, links, viewWidth, height } = useMemo(() => {
    const colW = 280;
    const rowH = 56;
    const topPadding = 24;
    const leftPadding = 56;
    const rightPadding = 168;
    const heightCalc = topPadding + rowH * (TOP_PER_ERA - 1) + 56;

    const nodes: Node[] = [];
    const nodeIndex: Record<string, Node> = {};

    visibleEras.forEach((era, ei) => {
      const tops = eraTops[era.id] ?? [];
      const x = leftPadding + ei * colW;
      const prevAbsoluteIdx = safeStart + ei - 1;
      const prevWords =
        prevAbsoluteIdx < 0
          ? new Set<string>()
          : new Set((eraTops[eras[prevAbsoluteIdx].id] ?? []).map((t) => t.word));
      const maxC = Math.max(...tops.map((x) => x.count), 1);
      tops.forEach((t, ri) => {
        const y = topPadding + ri * rowH;
        const r = 7 + (t.count / maxC) * 14;
        const node: Node = {
          era: era.id,
          word: t.word,
          count: t.count,
          x,
          y,
          r,
          isNew: prevAbsoluteIdx >= 0 && !prevWords.has(t.word),
        };
        nodes.push(node);
        nodeIndex[`${era.id}::${t.word}`] = node;
      });
    });

    const links: Link[] = [];
    for (let ei = 0; ei < visibleEras.length - 1; ei++) {
      const cur = eraTops[visibleEras[ei].id] ?? [];
      cur.forEach((t) => {
        const target = nodeIndex[`${visibleEras[ei + 1].id}::${t.word}`];
        const source = nodeIndex[`${visibleEras[ei].id}::${t.word}`];
        if (target && source) {
          links.push({
            source,
            target,
            weight: Math.min(source.count, target.count),
          });
        }
      });
    }

    return {
      nodes,
      links,
      viewWidth: leftPadding + colW * (visibleEras.length - 1) + rightPadding,
      height: heightCalc,
    };
  }, [eraTops, visibleEras, safeStart, eras]);

  if (theses.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        데이터가 없습니다.
      </div>
    );
  }

  const colW = 220;
  const leftPadding = 72;

  const intervalIdx = INTERVAL_OPTIONS.indexOf(intervalYears);
  const canZoomIn = intervalIdx > 0;
  const canZoomOut = intervalIdx < INTERVAL_OPTIONS.length - 1;

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Interval selector */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-muted-foreground">간격</span>
          {INTERVAL_OPTIONS.map((n) => {
            const active = n === intervalYears;
            return (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setIntervalYears(n);
                  setStartIdx(0);
                }}
                className={`rounded-md px-2 py-1 font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {n}년
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (canZoomIn) {
                setIntervalYears(INTERVAL_OPTIONS[intervalIdx - 1]);
                setStartIdx(0);
              }
            }}
            disabled={!canZoomIn}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-30 hover:enabled:bg-slate-50"
            aria-label="확대 (간격 줄이기)"
            title="확대"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (canZoomOut) {
                setIntervalYears(INTERVAL_OPTIONS[intervalIdx + 1]);
                setStartIdx(0);
              }
            }}
            disabled={!canZoomOut}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-30 hover:enabled:bg-slate-50"
            aria-label="축소 (간격 늘리기)"
            title="축소"
          >
            <ZoomOut size={14} />
          </button>
        </div>
      </div>
      <p className="mb-2 text-[10.5px] text-muted-foreground">
        💡 마우스 휠로 연도 간격을 조정할 수 있습니다 (위: 확대, 아래: 축소)
      </p>

      {/* Pagination header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setStartIdx((i) => Math.max(0, i - 1))}
          disabled={safeStart === 0}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-30 hover:enabled:bg-slate-50"
          aria-label="이전 시대"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
          {eras.map((e, idx) => {
            const inView = idx >= safeStart && idx < safeStart + visibleCount;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() =>
                  setStartIdx(Math.min(maxStart, Math.max(0, idx - Math.floor(visibleCount / 2))))
                }
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                  inView
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-slate-50"
                }`}
              >
                {e.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setStartIdx((i) => Math.min(maxStart, i + 1))}
          disabled={safeStart === maxStart}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-30 hover:enabled:bg-slate-50"
          aria-label="다음 시대"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div ref={wheelHostRef}>
        {/* 스크린리더용 동적 요약: 시대 페이지 변경 시 자동 알림 */}
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {visibleEras.length > 0
            ? `${visibleEras[0].label}부터 ${visibleEras[visibleEras.length - 1].label}까지 ${visibleEras.length}개 시대 표시 중`
            : "표시할 시대가 없습니다."}
        </p>
        <svg
          viewBox={`0 0 ${viewWidth} ${height}`}
          className="block w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={
            visibleEras.length > 0
              ? `연도별 연구 키워드 계보도 (${visibleEras[0].label}~${visibleEras[visibleEras.length - 1].label})`
              : "연도별 연구 키워드 계보도"
          }
        >
          {/* Era column headers + dashed guide */}
          {visibleEras.map((era, ei) => (
            <g key={era.id}>
              <text
                x={leftPadding + ei * colW}
                y={height - 16}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="#0f172a"
              >
                {era.label}
              </text>
              <line
                x1={leftPadding + ei * colW}
                x2={leftPadding + ei * colW}
                y1={18}
                y2={height - 38}
                stroke="#e2e8f0"
                strokeDasharray="3 4"
                strokeWidth={1}
              />
            </g>
          ))}

          {/* Links */}
          {links.map((l, i) => {
            const active = hoverWord === l.source.word;
            const dim = hoverWord && !active;
            const stroke = colorFor(l.source.word);
            const sw = Math.max(1.5, Math.min(8, l.weight * 0.7));
            return (
              <path
                key={i}
                d={curve(l.source.x + 4, l.source.y, l.target.x - 4, l.target.y)}
                stroke={stroke}
                strokeWidth={sw}
                fill="none"
                opacity={dim ? 0.08 : active ? 0.85 : 0.3}
                style={{ transition: "opacity 120ms" }}
              />
            );
          })}

          {/* Nodes + labels */}
          {nodes.map((n) => {
            const active = hoverWord === n.word;
            const dim = hoverWord && !active;
            const fill = colorFor(n.word);
            const display = truncateLabel(n.word);
            return (
              <g
                key={`${n.era}-${n.word}`}
                onMouseEnter={() => setHoverWord(n.word)}
                onMouseLeave={() => setHoverWord(null)}
                style={{ cursor: "default" }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={fill}
                  fillOpacity={dim ? 0.15 : 0.85}
                  stroke={n.isNew ? "#fbbf24" : "white"}
                  strokeWidth={n.isNew ? 2 : 1.5}
                  style={{ transition: "fill-opacity 120ms" }}
                />
                <text
                  x={n.x + n.r + 6}
                  y={n.y + 4}
                  fontSize={11}
                  fontWeight={active ? 700 : 500}
                  fill={dim ? "#94a3b8" : "#1e293b"}
                  style={{
                    fontFamily:
                      "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif",
                    transition: "fill 120ms",
                  }}
                >
                  {display}
                  <tspan fontSize={9} fill="#64748b" dx={3}>
                    ×{n.count}
                  </tspan>
                </text>
                <title>{`${n.word} · ${n.era} · ${n.count}건${n.isNew ? " (신규 등장)" : ""}`}</title>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-amber-400 bg-slate-200" />
          신규 등장 키워드
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-1 w-6 bg-slate-400" />
          시대 간 연결 (굵기 = 비중)
        </span>
        <span>원 크기 = 해당 시대 등장 빈도</span>
      </div>
    </div>
  );
}
