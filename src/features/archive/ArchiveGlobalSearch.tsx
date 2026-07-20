"use client";

/**
 * ArchiveGlobalSearch — 아카이브 통합 검색 (사이클 118, 사용자 요청 · M7 고도화 2026-07-18)
 * 개념·변인·측정도구·연구방법·통계방법·기초용어·글쓰기를 한 번에 검색해 유형별로 묶어 표시.
 * "타당도" 처럼 연구방법 절차에 묻힌 항목도 바로 찾게 한다.
 *
 * M7 고도화: 그룹별 "N개 모두 보기" 리스트 딥링크(?q=), ↑↓/Enter 키보드 내비게이션,
 * 매칭어 <mark> 하이라이트, aria-live 결과 수 안내.
 *
 * v5-M8 성능: 방문마다 7개 컬렉션을 클라이언트로 전량 로드하던 방식을 폐기하고,
 * 서버가 CDN 15분 캐시로 서빙하는 경량 인덱스(`GET /api/archive/search-index`)를
 * react-query 로 1회만 로드해 소비한다. 인덱스 fetch 실패 시에만 기존 컬렉션 로드로 폴백(회귀 0).
 * 인덱스는 name·altNames·tags·aectTerm 만 담으므로 매칭 범위도 그 필드로 좁혀진다.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { trackSearchMiss } from "@/lib/search-miss-tracker";
import {
  ARCHIVE_SEARCH_INDEX_TYPES,
  ARCHIVE_INDEX_MATCH_FIELDS,
  archiveSearchDetailHref,
  type ArchiveSearchIndexItem,
  type ArchiveSearchIndexResponse,
  type ArchiveSearchIndexType,
} from "@/lib/archive-search-index";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/ui/empty-state";

/** 빈 검색 결과 시 제안할 인기/대표 키워드 — 클릭하면 해당 검색어로 즉시 재검색 */
const POPULAR_QUERIES = ["자기효능감", "타당도", "실험연구", "학습몰입", "신뢰도"] as const;

/** 타입별 표시 메타(라벨·색·리스트 딥링크). 상세 경로는 archiveSearchDetailHref 로 통일. */
const GROUP_META: Record<
  ArchiveSearchIndexType,
  { label: string; color: string; listHref?: string }
> = {
  concept: { label: "개념", color: "text-cat-5", listHref: "/archive/concept" },
  variable: { label: "변인", color: "text-info", listHref: "/archive/variable" },
  measurement: { label: "측정도구", color: "text-success", listHref: "/archive/measurement" },
  "research-methods": { label: "연구방법", color: "text-info", listHref: "/archive/research-methods" },
  "statistical-methods": { label: "통계방법", color: "text-cyan-600", listHref: "/archive/statistical-methods" },
  "foundation-terms": { label: "기초용어", color: "text-info", listHref: "/archive/foundation-terms" },
  // 글쓰기 리스트는 ?q= 딥링크 미지원 → "모두 보기" 미노출(기존 동작 유지).
  "writing-tips": { label: "글쓰기", color: "text-destructive" },
};

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
  /** 매칭 총 개수(6개 캡 이전) */
  total: number;
  /** 해당 리스트의 ?q= 딥링크 (없으면 "모두 보기" 미노출) */
  listHref?: string;
}

/** 서버 경량 인덱스를 1회 로드. 실패 시 throw → 컴포넌트가 컬렉션 로드로 폴백. */
async function fetchArchiveSearchIndex(): Promise<ArchiveSearchIndexItem[]> {
  const res = await fetch("/api/archive/search-index");
  if (!res.ok) throw new Error(`search-index ${res.status}`);
  const data = (await res.json()) as ArchiveSearchIndexResponse;
  return data.items ?? [];
}

/** 인덱스 항목 → 표시 그룹. 매칭은 name·altNames·tags·aectTerm 범위. */
function buildGroupsFromIndex(items: ArchiveSearchIndexItem[], q: string): ResultGroup[] {
  const qs = q.trim();
  const out: ResultGroup[] = [];
  for (const type of ARCHIVE_SEARCH_INDEX_TYPES) {
    const meta = GROUP_META[type];
    const matched = items.filter(
      (it) => it.type === type && matchesArchiveSearch(it, q, ARCHIVE_INDEX_MATCH_FIELDS),
    );
    if (!matched.length) continue;
    out.push({
      label: meta.label,
      color: meta.color,
      items: matched.slice(0, 6).map((it) => ({
        id: it.id,
        name: it.name,
        href: archiveSearchDetailHref(it),
      })),
      total: matched.length,
      listHref: meta.listHref ? `${meta.listHref}?q=${encodeURIComponent(qs)}` : undefined,
    });
  }
  return out;
}

/** 검색어를 텍스트에서 찾아 <mark> 로 강조 (대소문자 무시, 최초 1회). 없으면 원문 그대로. */
function highlight(text: string, q: string): ReactNode {
  const query = q.trim();
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-warning/20 px-0.5 text-inherit">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function ArchiveGlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const enabled = q.trim().length >= 1;

  // 1차: 서버 경량 인덱스 1회 로드(긴 staleTime — 재검색 시 재요청 없음).
  const index = useQuery({
    queryKey: ["archive-search-index"],
    queryFn: fetchArchiveSearchIndex,
    enabled,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: 1,
  });
  const indexFailed = index.isError;

  // 2차(폴백): 인덱스 로드 실패 시에만 기존 방식으로 7개 컬렉션을 로드(회귀 0).
  const opt = { enabled: enabled && indexFailed, staleTime: 5 * 60_000 } as const;
  const concepts = useQuery({ queryKey: ["asearch", "concepts"], queryFn: () => archiveConceptsApi.list(), ...opt });
  const variables = useQuery({ queryKey: ["asearch", "variables"], queryFn: () => archiveVariablesApi.list(), ...opt });
  const measurements = useQuery({ queryKey: ["asearch", "measurements"], queryFn: () => archiveMeasurementsApi.list(), ...opt });
  const research = useQuery({ queryKey: ["asearch", "research"], queryFn: () => researchMethodsApi.listPublished(), ...opt });
  const statistical = useQuery({ queryKey: ["asearch", "statistical"], queryFn: () => statisticalMethodsApi.listPublished(), ...opt });
  const foundation = useQuery({ queryKey: ["asearch", "foundation"], queryFn: () => foundationTermsApi.listPublished(), ...opt });
  const writing = useQuery({ queryKey: ["asearch", "writing"], queryFn: () => writingTipsApi.listPublished(), ...opt });

  const loading =
    enabled &&
    (indexFailed
      ? concepts.isLoading || variables.isLoading || measurements.isLoading ||
        research.isLoading || statistical.isLoading || foundation.isLoading || writing.isLoading
      : index.isLoading);

  // 폴백 경로 그룹 — 인덱스 실패 시에만 계산(더 넓은 필드 매칭 유지).
  const fallbackGroups = useMemo<ResultGroup[]>(() => {
    if (!enabled || !indexFailed) return [];
    const out: ResultGroup[] = [];
    const qs = q.trim();
    const push = (
      label: string,
      color: string,
      data: unknown[] | undefined,
      fields: string[],
      map: (x: Record<string, unknown>) => ResultItem,
      listHref?: string,
    ) => {
      const all = (data ?? [])
        .filter((x) => matchesArchiveSearch(x as Record<string, unknown>, q, fields as never))
        .map((x) => map(x as Record<string, unknown>));
      if (all.length) {
        out.push({
          label,
          color,
          items: all.slice(0, 6),
          total: all.length,
          listHref: listHref ? `${listHref}?q=${encodeURIComponent(qs)}` : undefined,
        });
      }
    };

    push("개념", "text-cat-5", concepts.data?.data, ["name", "description", "altNames", "tags"], (x) => ({
      id: x.id as string,
      name: x.name as string,
      href: `/archive/concept/${x.id}`,
    }), "/archive/concept");
    push("변인", "text-info", variables.data?.data, ["name", "description", "altNames", "tags"], (x) => ({
      id: x.id as string,
      name: x.name as string,
      href: `/archive/variable/${x.id}`,
    }), "/archive/variable");
    push("측정도구", "text-success", measurements.data?.data, ["name", "originalName", "author", "description"], (x) => ({
      id: x.id as string,
      name: x.name as string,
      href: `/archive/measurement/${x.id}`,
    }), "/archive/measurement");
    push("연구방법", "text-info", research.data?.data, ["name", "summary", "accessibleSummary"], (x) => ({
      id: x.id as string,
      name: x.name as string,
      href: `/archive/research-methods/${x.id}`,
    }), "/archive/research-methods");
    push("통계방법", "text-cyan-600", statistical.data?.data, ["name", "summary", "accessibleSummary"], (x) => ({
      id: x.id as string,
      name: x.name as string,
      href: `/archive/statistical-methods/${x.id}`,
    }), "/archive/statistical-methods");
    push("기초용어", "text-info", foundation.data?.data, ["term", "englishName", "summary", "accessibleSummary"], (x) => ({
      id: x.id as string,
      name: (x.term as string) ?? (x.name as string),
      href: `/archive/foundation-terms/${x.id}`,
    }), "/archive/foundation-terms");
    push("글쓰기", "text-destructive", writing.data?.data, ["title", "explanation", "wrongExample", "correctExample"], (x) => ({
      id: x.id as string,
      name: (x.title as string) ?? "글쓰기 팁",
      href: `/archive/writing-tips/${x.id as string}`,
    }));

    return out;
  }, [
    enabled,
    indexFailed,
    q,
    concepts.data,
    variables.data,
    measurements.data,
    research.data,
    statistical.data,
    foundation.data,
    writing.data,
  ]);

  const indexGroups = useMemo<ResultGroup[]>(() => {
    if (!enabled || indexFailed || !index.data) return [];
    return buildGroupsFromIndex(index.data, q);
  }, [enabled, indexFailed, index.data, q]);

  const groups = indexFailed ? fallbackGroups : indexGroups;

  const total = groups.reduce((s, g) => s + g.items.length, 0);
  // 키보드 내비게이션용 평면 목록 (표시 순서대로)
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // M6: 무결과 질의 적재 — debounce 600ms 후 결과 0건 + 2자 이상 조건에서 기록
  useEffect(() => {
    const qs = q.trim();
    if (qs.length < 2) return;
    const timer = setTimeout(() => {
      if (!loading && total === 0) {
        void trackSearchMiss(qs);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [q, total, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!enabled || flatItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < flatItems.length) {
        e.preventDefault();
        router.push(flatItems[activeIndex].href);
      }
    } else if (e.key === "Escape") {
      setQ("");
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="아카이브 전체 검색 — 예: 타당도, 자기효능감, 실험연구"
          className="w-full rounded-xl border bg-card py-2.5 pl-10 pr-9 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="아카이브 통합 검색"
          role="combobox"
          aria-expanded={enabled}
          aria-controls="archive-search-results"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setActiveIndex(-1);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="검색어 지우기"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {enabled && (
        <div
          id="archive-search-results"
          className="mt-2 rounded-2xl border bg-card p-3 shadow-sm"
        >
          {/* 결과 수 스크린리더 안내 */}
          <p className="sr-only" aria-live="polite">
            {loading
              ? "검색 중입니다."
              : total === 0
                ? `${q} 검색 결과가 없습니다.`
                : `${total}개 결과를 찾았습니다. 위아래 화살표로 이동하고 엔터로 여세요.`}
          </p>
          {loading ? (
            <p className="px-1 py-3 text-center text-sm text-muted-foreground">검색 중…</p>
          ) : total === 0 ? (
            <div className="px-2 py-2">
              <EmptyState
                compact
                title={`'${q}' 검색 결과가 없습니다`}
                description="개념·변인·측정도구·연구방법·통계방법·기초용어·글쓰기 전체에서 찾았어요. 더 짧은 키워드로 다시 시도해 보세요."
              />
              <div className="mt-3 text-center">
                <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">이런 키워드는 어떠세요?</p>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {POPULAR_QUERIES.map((pq) => (
                    <button
                      key={pq}
                      type="button"
                      onClick={() => {
                        setQ(pq);
                        setActiveIndex(-1);
                      }}
                      className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted"
                    >
                      {pq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <ul className="space-y-3" role="listbox" aria-label="검색 결과">
              {(() => {
                let cursor = -1;
                return groups.map((g) => (
                  <li key={g.label}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className={`text-[11px] font-bold ${g.color}`}>
                        {g.label} <span className="text-muted-foreground">({g.total})</span>
                      </p>
                      {g.listHref && g.total > g.items.length && (
                        <Link
                          href={g.listHref}
                          className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
                        >
                          {g.total}개 모두 보기
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                      )}
                    </div>
                    <ul className="space-y-0.5">
                      {g.items.map((it) => {
                        cursor += 1;
                        const isActive = cursor === activeIndex;
                        return (
                          <li key={`${g.label}-${it.id}`} role="option" aria-selected={isActive}>
                            <Link
                              href={it.href}
                              className={cn(
                                "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/50",
                                isActive && "bg-primary/10 ring-1 ring-primary/30",
                              )}
                            >
                              <span className="truncate font-medium">{highlight(it.name, q)}</span>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ));
              })()}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
