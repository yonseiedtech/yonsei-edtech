"use client";

import { useMemo, useState } from "react";
import type { AlumniThesis } from "@/types";

const STOPWORDS = new Set([
  "연구",
  "교육",
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
  { id: "~1999", label: "~1999", from: 0, to: 1999 },
  { id: "2000s", label: "2000s", from: 2000, to: 2009 },
  { id: "2010s", label: "2010s", from: 2010, to: 2019 },
  { id: "2020s", label: "2020s", from: 2020, to: 9999 },
] as const;

const TOP_PER_ERA = 6;

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

const PALETTE = [
  "#1e3a8a",
  "#0369a1",
  "#7c3aed",
  "#be185d",
  "#b45309",
  "#15803d",
  "#0f766e",
  "#9333ea",
  "#dc2626",
  "#0891b2",
];

function colorFor(word: string): string {
  let h = 0;
  for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function curve(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export default function ResearchLineageMap({ theses }: { theses: AlumniThesis[] }) {
  const [hoverWord, setHoverWord] = useState<string | null>(null);

  const { nodes, links, columnWidth, height } = useMemo(() => {
    // Group theses by era
    const byEra: Record<string, AlumniThesis[]> = {};
    ERAS.forEach((e) => {
      byEra[e.id] = [];
    });
    theses.forEach((t) => {
      const era = pickEra(yearFrom(t));
      if (era) byEra[era].push(t);
    });

    // Top keywords per era
    const eraTopMaps: Record<string, Map<string, number>> = {};
    ERAS.forEach((e) => {
      const m = new Map<string, number>();
      byEra[e.id].forEach((t) =>
        (t.keywords ?? []).forEach((raw) => {
          const k = normalizeKeyword(raw);
          if (!k || k.length < 2 || STOPWORDS.has(k)) return;
          m.set(k, (m.get(k) ?? 0) + 1);
        }),
      );
      eraTopMaps[e.id] = m;
    });

    const eraTops: Record<string, { word: string; count: number }[]> = {};
    ERAS.forEach((e) => {
      eraTops[e.id] = Array.from(eraTopMaps[e.id].entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_PER_ERA)
        .map(([word, count]) => ({ word, count }));
    });

    // Layout
    const colW = 200;
    const rowH = 70;
    const topPadding = 30;
    const leftPadding = 60;
    const maxRows = TOP_PER_ERA;
    const heightCalc = topPadding * 2 + rowH * (maxRows - 1) + 60;

    const nodes: Node[] = [];
    const nodeIndex: Record<string, Node> = {};

    ERAS.forEach((era, ei) => {
      const tops = eraTops[era.id];
      const x = leftPadding + ei * colW;
      const prevWords = ei === 0 ? new Set<string>() : new Set(eraTops[ERAS[ei - 1].id].map((t) => t.word));
      tops.forEach((t, ri) => {
        const y = topPadding + ri * rowH;
        // Radius scaled by count
        const maxC = Math.max(...tops.map((x) => x.count), 1);
        const r = 8 + (t.count / maxC) * 18;
        const node: Node = {
          era: era.id,
          word: t.word,
          count: t.count,
          x,
          y,
          r,
          isNew: ei > 0 && !prevWords.has(t.word),
        };
        nodes.push(node);
        nodeIndex[`${era.id}::${t.word}`] = node;
      });
    });

    // Links: same word in adjacent eras
    const links: Link[] = [];
    for (let ei = 0; ei < ERAS.length - 1; ei++) {
      const cur = eraTops[ERAS[ei].id];
      cur.forEach((t) => {
        const target = nodeIndex[`${ERAS[ei + 1].id}::${t.word}`];
        const source = nodeIndex[`${ERAS[ei].id}::${t.word}`];
        if (target && source) {
          links.push({
            source,
            target,
            weight: Math.min(source.count, target.count),
          });
        }
      });
    }

    return { nodes, links, columnWidth: colW, height: heightCalc };
  }, [theses]);

  const totalWidth = 60 + ERAS.length * columnWidth;

  if (theses.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="mx-auto block w-full"
        style={{ minWidth: "640px" }}
        role="img"
        aria-label="연도별 연구 키워드 계보도"
      >
        {/* Era column headers */}
        {ERAS.map((era, ei) => (
          <g key={era.id}>
            <text
              x={60 + ei * columnWidth}
              y={height - 20}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill="#0f172a"
            >
              {era.label}
            </text>
            <line
              x1={60 + ei * columnWidth}
              x2={60 + ei * columnWidth}
              y1={15}
              y2={height - 40}
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
          const sw = Math.max(1.5, Math.min(10, l.weight * 0.8));
          return (
            <path
              key={i}
              d={curve(l.source.x + 4, l.source.y, l.target.x - 4, l.target.y)}
              stroke={stroke}
              strokeWidth={sw}
              fill="none"
              opacity={dim ? 0.08 : active ? 0.85 : 0.35}
              style={{ transition: "opacity 120ms" }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const active = hoverWord === n.word;
          const dim = hoverWord && !active;
          const fill = colorFor(n.word);
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
                {n.word}
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
