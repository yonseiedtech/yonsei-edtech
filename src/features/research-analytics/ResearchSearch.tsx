"use client";

/**
 * ResearchSearch — 연구분석 통합 검색 (사이클 121 리브랜딩)
 * 제목·키워드·연구방법·변인·측정도구·대상에서 부분일치 검색 → 논문 결과 카드.
 * 변인·측정도구는 id→name 맵으로 라벨까지 검색 가능.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, GraduationCap, ArrowRight } from "lucide-react";
import type { AlumniThesis } from "@/types";
import { searchTheses } from "./multi-axis";
import { yearFrom } from "./shared";

interface Props {
  theses: AlumniThesis[];
  variableNameOf?: (id: string) => string;
  measurementNameOf?: (id: string) => string;
}

export default function ResearchSearch({ theses, variableNameOf, measurementNameOf }: Props) {
  const [q, setQ] = useState("");

  const results = useMemo(
    () =>
      searchTheses(theses, q, { variableNameOf, measurementNameOf }).slice(0, 40),
    [theses, q, variableNameOf, measurementNameOf],
  );

  const enabled = q.trim().length >= 1;

  return (
    <section id="research-search" className="scroll-mt-20">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="논문 검색 — 제목·키워드·변인·연구방법·측정도구 (예: 자기효능감, 실험연구, 플립러닝)"
          className="w-full rounded-2xl border bg-card py-3.5 pl-12 pr-11 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="졸업생 논문 통합 검색"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="검색어 지우기"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {enabled && (
        <div className="mt-2 rounded-2xl border bg-card p-3 shadow-sm">
          <p className="mb-2 px-1 text-xs text-muted-foreground">
            {results.length > 0
              ? `‘${q}’ — ${results.length}건${results.length === 40 ? "+" : ""}`
              : `‘${q}’ 검색 결과가 없습니다.`}
          </p>
          <ul className="space-y-1">
            {results.map((t) => {
              const y = yearFrom(t);
              const vars = (t.variableIds ?? [])
                .map((id) => variableNameOf?.(id) ?? "")
                .filter(Boolean)
                .slice(0, 3);
              return (
                <li key={t.id}>
                  <Link
                    href={`/alumni/thesis/${t.id}`}
                    className="group flex items-start justify-between gap-2 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                        {y && <span>{y}</span>}
                        {t.advisorName && (
                          <span className="inline-flex items-center gap-0.5">
                            <GraduationCap className="h-3 w-3" />
                            {t.advisorName}
                          </span>
                        )}
                        {vars.map((v) => (
                          <span key={v} className="rounded bg-violet-50 px-1 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                            {v}
                          </span>
                        ))}
                        {(t.researchMethods ?? []).slice(0, 1).map((m) => (
                          <span key={m} className="rounded bg-blue-50 px-1 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            {m}
                          </span>
                        ))}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
