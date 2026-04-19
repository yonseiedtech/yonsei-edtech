"use client";

import { useMemo, useState } from "react";

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
  "#7c3aed", // violet
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

/** Spiral packing word cloud (deterministic, no JS lib needed). */
function packWords(items: CloudItem[], width: number, height: number): PlacedWord[] {
  if (items.length === 0) return [];
  const maxCount = items[0].count;
  const minCount = items[items.length - 1]?.count ?? 1;
  const span = Math.max(1, maxCount - minCount);

  const cx = width / 2;
  const cy = height / 2;
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const result: PlacedWord[] = [];

  items.forEach((item, idx) => {
    const norm = (item.count - minCount) / span;
    const fontSize = Math.round(14 + norm * 38);
    const charW = fontSize * 0.95;
    const w = item.word.length * charW * 0.55 + 6;
    const h = fontSize * 1.05;

    let placedSuccess = false;
    let x = cx;
    let y = cy;

    // Archimedean spiral
    const stepAngle = 0.35;
    const stepRadius = 1.2;
    for (let t = idx === 0 ? 0 : 0; t < 6000; t++) {
      const angle = t * stepAngle;
      const radius = t * stepRadius * 0.06;
      x = cx + radius * Math.cos(angle) - w / 2;
      y = cy + radius * Math.sin(angle) - h / 2;
      if (x < 0 || y < 0 || x + w > width || y + h > height) continue;
      let collide = false;
      for (const p of placed) {
        if (rectsOverlap(x, y, w, h, p.x, p.y, p.w, p.h, 4)) {
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

export default function KeywordCloud({ items }: { items: CloudItem[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const width = 880;
  const height = 460;

  const placed = useMemo(() => packWords(items, width, height), [items]);

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        키워드 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto block w-full max-w-[920px]"
        role="img"
        aria-label="연구 키워드 워드 클라우드"
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
              fontWeight={p.fontSize > 28 ? 700 : 500}
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
      {hover && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{hover}</span>{" "}
          ({placed.find((p) => p.word === hover)?.count}건)
        </p>
      )}
    </div>
  );
}
