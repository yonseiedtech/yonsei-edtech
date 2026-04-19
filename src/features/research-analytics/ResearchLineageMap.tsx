"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AlumniThesis } from "@/types";

const STOPWORDS = new Set([
  "연구",
  "교육",
  "교육공학",
  "학습",
  "분석",
  "사례",
  "효과",
  "관계",
  "영향",
  "방안",
  "모형",
  "프로그램",
  "활용",
  "탐색",
  "고찰",
  "개발",
  "적용",
  "설계",
  "수행",
  "조사",
  "비교",
  "검증",
  "구조",
  "변인",
  "특성",
  "수업",
  "학생",
  "학교",
  "학",
]);

const ERAS = [
  { id: "2000-2004", label: "2000–2004", from: 2000, to: 2004 },
  { id: "2005-2009", label: "2005–2009", from: 2005, to: 2009 },
  { id: "2010-2014", label: "2010–2014", from: 2010, to: 2014 },
  { id: "2015-2019", label: "2015–2019", from: 2015, to: 2019 },
  { id: "2020-", label: "2020–현재", from: 2020, to: 9999 },
] as const;

const TOP_PER_ERA = 5;
const MAX_LABEL_CHARS = 9;
const VIEW_ERAS_DESKTOP = 3;

const PALETTE = ["#1e3a8a", "#0f766e", "#7c3aed", "#b45309"];

function colorFor(word: string): string {
  let h = 0;
  for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function truncateLabel(word: string, max: number = MAX_LABEL_CHARS): string {
  if (word.length <= max) return word;
  return word.slice(0, max - 1) + "…";
}

function normalizeKeyword(raw: string): string {
  return raw.replace(/[\s·,()<>「」『』\[\]'"]/g, "").trim();
}

function yearFrom(t: AlumniThesis): number | null {
  const m = (t.awardedYearMonth ?? "").match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

function pickEra(year: number | null): string | null {
  if (year == null) return null;
  for (const e of ERAS) if (year >= e.from && year <= e.to) return e.id;
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
  const [startIdx, setStartIdx] = useState(0);
  const visibleCount = Math.min(VIEW_ERAS_DESKTOP, ERAS.length);
  const maxStart = Math.max(0, ERAS.length - visibleCount);
  const safeStart = Math.min(startIdx, maxStart);
  const visibleEras = ERAS.slice(safeStart, safeStart + visibleCount);

  const eraTops = useMemo(() => {
    const byEra: Record<string, AlumniThesis[]> = {};
    ERAS.forEach((e) => {
      byEra[e.id] = [];
    });
    theses.forEach((t) => {
      const era = pickEra(yearFrom(t));
      if (era) byEra[era].push(t);
    });

    const result: Record<string, { word: string; count: number }[]> = {};
    ERAS.forEach((e) => {
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
  }, [theses]);

  const { nodes, links, viewWidth, height } = useMemo(() => {
    const colW = 220;
    const rowH = 84;
    const topPadding = 36;
    const leftPadding = 72;
    const rightPadding = 72;
    const heightCalc = topPadding + rowH * (TOP_PER_ERA - 1) + 80;

    const nodes: Node[] = [];
    const nodeIndex: Record<string, Node> = {};

    visibleEras.forEach((era, ei) => {
      const tops = eraTops[era.id];
      const x = leftPadding + ei * colW;
      const prevAbsoluteIdx = safeStart + ei - 1;
      const prevWords =
        prevAbsoluteIdx < 0
          ? new Set<string>()
          : new Set(eraTops[ERAS[prevAbsoluteIdx].id].map((t) => t.word));
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
      const cur = eraTops[visibleEras[ei].id];
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
  }, [eraTops, visibleEras, safeStart]);

  if (theses.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        데이터가 없습니다.
      </div>
    );
  }

  const colW = 220;
  const leftPadding = 72;

  return (
    <div className="w-full">
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
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {ERAS.map((e, idx) => {
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

      <svg
        viewBox={`0 0 ${viewWidth} ${height}`}
        className="block w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="연도별 연구 키워드 계보도"
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
