"use client";

/**
 * ArchiveGlobalSearch — 아카이브 통합 검색 (사이클 118, 사용자 요청)
 * 개념·변인·측정도구·연구방법·통계방법·기초용어·글쓰기를 한 번에 검색해 유형별로 묶어 표시.
 * "타당도" 처럼 연구방법 절차에 묻힌 항목도 바로 찾게 한다.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ArrowRight } from "lucide-react";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
  researchMethodsApi,
  statisticalMethodsApi,
  foundationTermsApi,
  writingTipsApi,
} from "@/lib/bkend";
import { matchesArchiveSearch } from "@/lib/archive-search";

/** 빈 검색 결과 시 제안할 인기/대표 키워드 — 클릭하면 해당 검색어로 즉시 재검색 */
const POPULAR_QUERIES = ["자기효능감", "타당도", "실험연구", "학습몰입", "신뢰도"] as const;

interface ResultItem {
  id: string;
  name: string;
  href: string;
  sub?: string;
}
interface ResultGroup {
  label: string;
  color: string;
  items: ResultItem[];
}

export default function ArchiveGlobalSearch() {
  const [q, setQ] = useState("");
  const enabled = q.trim().length >= 1;
  const opt = { enabled, staleTime: 5 * 60_000 } as const;

  const concepts = useQuery({ queryKey: ["asearch", "concepts"], queryFn: () => archiveConceptsApi.list(), ...opt });
  const variables = useQuery({ queryKey: ["asearch", "variables"], queryFn: () => archiveVariablesApi.list(), ...opt });
  const measurements = useQuery({ queryKey: ["asearch", "measurements"], queryFn: () => archiveMeasurementsApi.list(), ...opt });
  const research = useQuery({ queryKey: ["asearch", "research"], queryFn: () => researchMethodsApi.listPublished(), ...opt });
  const statistical = useQuery({ queryKey: ["asearch", "statistical"], queryFn: () => statisticalMethodsApi.listPublished(), ...opt });
  const foundation = useQuery({ queryKey: ["asearch", "foundation"], queryFn: () => foundationTermsApi.listPublished(), ...opt });
  const writing = useQuery({ queryKey: ["asearch", "writing"], queryFn: () => writingTipsApi.listPublished(), ...opt });

  const loading =
    enabled &&
    (concepts.isLoading || variables.isLoading || measurements.isLoading ||
      research.isLoading || statistical.isLoading || foundation.isLoading || writing.isLoading);

  const groups = useMemo<ResultGroup[]>(() => {
    if (!enabled) return [];
    const out: ResultGroup[] = [];
    const push = (
      label: string,
      color: string,
      data: unknown[] | undefined,
      fields: string[],
      map: (x: Record<string, unknown>) => ResultItem,
    ) => {
      const matched = (data ?? [])
        .filter((x) => matchesArchiveSearch(x as Record<string, unknown>, q, fields as never))
        .slice(0, 6)
        .map((x) => map(x as Record<string, unknown>));
      if (matched.length) out.push({ label, color, items: matched });
    };

    push("개념", "text-violet-600", concepts.data?.data, ["name", "description", "altNames", "tags"], (x) => ({
      id: x.id as string,
      name: x.name as string,
      href: `/archive/concept/${x.id}`,
    }));
    push("변인", "text-blue-600", variables.data?.data, ["name", "description", "altNames", "tags"], (x) => ({
      id: x.id as string,
      name: x.name as string,
      href: `/archive/variable/${x.id}`,
    }));
    push("측정도구", "text-emerald-600", measurements.data?.data, ["name", "originalName", "author", "description"], (x) => ({
      id: x.id as string,
      name: x.name as string,
      href: `/archive/measurement/${x.id}`,
    }));
    push("연구방법", "text-indigo-600", research.data?.data, ["name", "summary", "accessibleSummary"], (x) => ({
      id: x.id as string,
      name: x.name as string,
      href: `/archive/research-methods/${x.id}`,
    }));
    push("통계방법", "text-cyan-600", statistical.data?.data, ["name", "summary", "accessibleSummary"], (x) => ({
      id: x.id as string,
      name: x.name as string,
      href: `/archive/statistical-methods/${x.id}`,
    }));
    push("기초용어", "text-sky-600", foundation.data?.data, ["name", "definition", "summary", "accessibleSummary"], (x) => ({
      id: x.id as string,
      name: x.name as string,
      href: `/archive/foundation-terms/${x.id}`,
    }));
    push("글쓰기", "text-rose-600", writing.data?.data, ["title", "explanation", "wrongExample", "correctExample"], (x) => ({
      id: x.id as string,
      name: (x.title as string) ?? "글쓰기 팁",
      href: `/archive/writing-tips/${x.id as string}`,
    }));

    return out;
  }, [
    enabled,
    q,
    concepts.data,
    variables.data,
    measurements.data,
    research.data,
    statistical.data,
    foundation.data,
    writing.data,
  ]);

  const total = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="아카이브 전체 검색 — 예: 타당도, 자기효능감, 실험연구"
          className="w-full rounded-xl border bg-card py-2.5 pl-10 pr-9 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="아카이브 통합 검색"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="검색어 지우기"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {enabled && (
        <div className="mt-2 rounded-2xl border bg-card p-3 shadow-sm">
          {loading ? (
            <p className="px-1 py-3 text-center text-sm text-muted-foreground">검색 중…</p>
          ) : total === 0 ? (
            <div className="px-2 py-4 text-center">
              <p className="text-sm font-medium">&lsquo;{q}&rsquo; 검색 결과가 없습니다.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                개념·변인·측정도구·연구방법·통계방법·기초용어·글쓰기 전체에서 찾았어요. 더 짧은 키워드로 다시 시도해 보세요.
              </p>
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">이런 키워드는 어떠세요?</p>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {POPULAR_QUERIES.map((pq) => (
                    <button
                      key={pq}
                      type="button"
                      onClick={() => setQ(pq)}
                      className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted"
                    >
                      {pq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className={`mb-1 text-[11px] font-bold ${g.color}`}>{g.label}</p>
                  <ul className="space-y-0.5">
                    {g.items.map((it) => (
                      <li key={`${g.label}-${it.id}`}>
                        <Link
                          href={it.href}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
                        >
                          <span className="truncate font-medium">{it.name}</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
