"use client";

/**
 * 연구 설계 프로파일 (사이클 49)
 *
 * 졸업생 논문의 구조화 분석 데이터(thesis.analysis — 제목+초록 자동 추출, 사이클 43)를
 * 집계해 전공의 연구 설계 경향을 보여준다:
 *   · 통계 분석 방법 Top — 어떤 통계로 검증했나
 *   · 연구방법 분포 — 어떤 설계(준실험·개발연구 등)를 택했나
 * 막대 클릭 시 해당 방법의 아카이브 가이드 검색으로 이동 (학습 루프 연결).
 * 기존 위젯(제목 사전 기반)과 달리 초록까지 본 추출이라 방법론 집계가 정확하다.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { AlumniThesis } from "@/types";

type Mode = "stat" | "method";

const MODE_LABEL: Record<Mode, string> = {
  stat: "통계 분석 방법",
  method: "연구방법 설계",
};

const GUIDE_PATH: Record<Mode, string> = {
  stat: "/archive/statistical-methods",
  method: "/archive/research-methods",
};

const BAR_COLORS = ["#1e3a8a", "#0f766e", "#2563eb", "#b45309", "#be185d", "#15803d", "#0369a1", "#0e7490", "#c2410c", "#047857"];

function countMethods(theses: AlumniThesis[], kind: Mode): [string, number][] {
  const counter = new Map<string, number>();
  for (const t of theses) {
    const a = t.analysis;
    if (!a) continue;
    const names = kind === "stat" ? a.statMethods ?? [] : a.researchMethods ?? [];
    for (const n of names) counter.set(n, (counter.get(n) ?? 0) + 1);
  }
  return [...counter.entries()].sort((x, y) => y[1] - x[1]);
}

/**
 * 상단 노출용 컴팩트 스트립 — 통계·연구방법 Top 5 를 모든 탭 위에서 한눈에 (모바일 1열).
 * 칩 클릭 시 해당 아카이브 가이드 검색으로 이동.
 */
export function MethodTopStrip({ theses }: { theses: AlumniThesis[] }) {
  const statTop = useMemo(() => countMethods(theses, "stat").slice(0, 5), [theses]);
  const methodTop = useMemo(() => countMethods(theses, "method").slice(0, 5), [theses]);
  if (statTop.length === 0 && methodTop.length === 0) return null;

  const renderChips = (rows: [string, number][], kind: Mode) => (
    <div className="flex flex-wrap gap-1.5">
      {rows.map(([name, count], i) => (
        <Link
          key={name}
          href={`${GUIDE_PATH[kind]}?q=${encodeURIComponent(name)}`}
          className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:text-primary"
          title={`${name} 가이드 보기`}
        >
          <span className="font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
          <span className="max-w-[150px] truncate sm:max-w-none">{name}</span>
          <span className="tabular-nums text-[10px] text-muted-foreground">{count}편</span>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="mt-6 grid gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-2 sm:p-5">
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">통계 분석 방법 Top 5</p>
        {statTop.length > 0 ? renderChips(statTop, "stat") : <p className="text-xs text-muted-foreground">데이터 없음</p>}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">연구방법 설계 Top 5</p>
        {methodTop.length > 0 ? renderChips(methodTop, "method") : <p className="text-xs text-muted-foreground">데이터 없음</p>}
      </div>
    </div>
  );
}

export default function MethodProfile({ theses }: { theses: AlumniThesis[] }) {
  const [mode, setMode] = useState<Mode>("stat");

  const { rows, analyzedCount } = useMemo(() => {
    const all = countMethods(theses, mode);
    const analyzed = theses.filter((t) => t.analysis).length;
    return { rows: all.slice(0, 10), analyzedCount: analyzed };
  }, [theses, mode]);

  const max = rows[0]?.[1] ?? 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                mode === m
                  ? "rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                  : "rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
              }
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          분석 데이터 보유 {analyzedCount}편 기준 · 제목+초록 자동 추출(참고용)
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">집계할 분석 데이터가 없습니다.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map(([name, count], i) => (
            <li key={name} className="group">
              <Link
                href={`${GUIDE_PATH[mode]}?q=${encodeURIComponent(name)}`}
                className="block"
                title={`${name} 가이드 보기`}
              >
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 font-medium group-hover:text-primary group-hover:underline">
                    {name}
                    <ExternalLink size={10} className="opacity-0 transition group-hover:opacity-100" />
                  </span>
                  <span className="tabular-nums text-muted-foreground">{count}편</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max((count / max) * 100, 4)}%`,
                      backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    }}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        막대를 클릭하면 해당 방법의 아카이브 가이드(언제 쓰는지·가정·절차)로 이동합니다.
      </p>
    </div>
  );
}
