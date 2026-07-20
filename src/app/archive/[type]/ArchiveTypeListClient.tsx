"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Lightbulb,
  Variable as VariableIcon,
  Ruler,
  Plus,
  Pencil,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import EmptyState from "@/components/ui/empty-state";
import ArchiveListToolbar, {
  type ArchiveListSortOption,
} from "@/components/archive/ArchiveListToolbar";
import ArchiveFavoriteStar from "@/components/archive/ArchiveFavoriteStar";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
  archiveFavoritesApi,
} from "@/lib/bkend";
import {
  ARCHIVE_ITEM_TYPE_COLORS,
  ARCHIVE_ITEM_TYPE_LABELS,
  VARIABLE_TYPE_LABELS,
  type ArchiveConcept,
  type ArchiveVariable,
  type VariableType,
  type ArchiveMeasurementTool,
  type ArchiveItemType,
  type ArchiveFavorite,
} from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { leadSentence } from "@/lib/archive-text";

type ArchiveItem = ArchiveConcept | ArchiveVariable | ArchiveMeasurementTool;

/** 서버 프리패치 초기 페이지 크기와 "더 보기" 증분 크기 (v5-H1). */
const PAGE_SIZE = 60;

const SORT_OPTIONS: ArchiveListSortOption[] = [
  { value: "name", label: "이름순 (가나다)" },
  { value: "recent", label: "최신 추가순" },
  { value: "alt", label: "별칭 많은 순" },
];

const TYPE_META: Record<
  ArchiveItemType,
  {
    title: string;
    description: string;
    icon: typeof Lightbulb;
    borderClass: string;
  }
> = {
  concept: {
    title: "개념",
    description: "교육공학에서 다루는 이론·구성개념을 모은 라이브러리. 클릭하여 연결된 변인·측정도구를 살펴보세요.",
    icon: Lightbulb,
    borderClass: "border-l-cat-5",
  },
  variable: {
    title: "변인",
    description: "양적 연구에서 다루는 측정 가능한 변인. 어떤 개념과 닿아 있고 어떤 측정도구로 잴 수 있는지 따라가 보세요.",
    icon: VariableIcon,
    borderClass: "border-l-info",
  },
  measurement: {
    title: "측정도구",
    description: "신뢰도·타당도가 검증된 척도. 문항·저자·신뢰도와 함께, 측정 대상 변인을 역으로 확인할 수 있습니다.",
    icon: Ruler,
    borderClass: "border-l-success",
  },
};

function archiveApiFor(type: ArchiveItemType) {
  return type === "concept"
    ? archiveConceptsApi
    : type === "variable"
      ? archiveVariablesApi
      : archiveMeasurementsApi;
}

interface Props {
  type: ArchiveItemType;
  initialItems: ArchiveItem[];
  initialTotal: number;
  /** 서버 프리패치 성공 여부. false 면 클라이언트가 첫 페이지를 직접 로드한다. */
  prefetched: boolean;
}

function ArchiveTypeListClientInner({ type, initialItems, initialTotal, prefetched }: Props) {
  const { user } = useAuthStore();

  const [items, setItems] = useState<ArchiveItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [favorites, setFavorites] = useState<ArchiveFavorite[]>([]);
  // 서버 프리패치가 실패(빈 초기 데이터)했을 때만 최초 로딩 스켈레톤을 노출한다.
  const [initialLoading, setInitialLoading] = useState(!prefetched && initialItems.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);
  // 전량 로드(검색·필터 승격) 완료 여부. true 면 더 이상 커서 로드하지 않는다.
  const [fullyLoaded, setFullyLoaded] = useState(false);
  // 커서 페이지네이션의 종점 도달 여부.
  const [reachedEnd, setReachedEnd] = useState(
    prefetched ? initialItems.length >= initialTotal : false,
  );

  const [query, setQuery] = useState("");
  // UX(2026-07-04): soft navigation(뒤로가기·칩 재클릭)에도 ?q= 를 반영
  const searchParams = useSearchParams();
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setQuery(q);
  }, [searchParams]);

  const canManage = isAtLeast(user, "staff");

  // 서버 프리패치 실패 시 — 클라이언트에서 첫 커서 페이지를 직접 로드.
  useEffect(() => {
    if (prefetched || initialItems.length > 0) return;
    let cancelled = false;
    (async () => {
      setInitialLoading(true);
      try {
        const res = await archiveApiFor(type).listPage({ pageSize: PAGE_SIZE });
        if (!cancelled) {
          setItems(res.data);
          setReachedEnd(res.data.length < PAGE_SIZE);
        }
      } catch (err) {
        console.error("[archive-list] initial load failed", err);
        toast.error("불러오기 실패");
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // type 고정(라우트 단위 컴포넌트) — 최초 1회만.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await archiveFavoritesApi.listByUser(user.id);
        if (!cancelled) setFavorites(res.data);
      } catch (err) {
        console.error("[archive-list] favorites load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const favIdSet = useMemo(
    () => new Set(favorites.filter((f) => f.itemType === type).map((f) => f.itemId)),
    [favorites, type],
  );

  // Archive-UX: 태그 chip 필터 (다중 AND), 즐겨찾기만, 정렬
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  // 사이클 60: 변인 한정 — 구인 영역(인지·정의·행동…) 필터 ("사람의 무엇을 보는가")
  const [domainFilter, setDomainFilter] = useState<VariableType | "all">("all");
  const [sortMode, setSortMode] = useState<"name" | "recent" | "alt">("name");

  // v5-H1 하이브리드: 검색·필터가 활성화되면 로드된 범위가 아닌 전체 컬렉션 기준으로
  // 결과가 정확하도록 1회 전량 로드로 승격한다(초기 로드는 60건 유지). 소형 컬렉션이라 저렴.
  const needsFullLoad =
    query.trim() !== "" ||
    selectedTags.length > 0 ||
    favoritesOnly ||
    (type === "variable" && domainFilter !== "all");

  useEffect(() => {
    if (!needsFullLoad || fullyLoaded || loadingFull || initialLoading) return;
    let cancelled = false;
    (async () => {
      setLoadingFull(true);
      try {
        const res = await archiveApiFor(type).list();
        if (!cancelled) {
          setItems(res.data);
          setTotal(res.data.length);
          setFullyLoaded(true);
          setReachedEnd(true);
        }
      } catch (err) {
        console.error("[archive-list] full load failed", err);
        toast.error("전체 불러오기 실패");
      } finally {
        if (!cancelled) setLoadingFull(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsFullLoad, fullyLoaded, loadingFull, initialLoading]);

  async function loadMore() {
    if (loadingMore || loadingFull || fullyLoaded || reachedEnd) return;
    setLoadingMore(true);
    try {
      const last = items[items.length - 1];
      const res = await archiveApiFor(type).listPage({
        pageSize: PAGE_SIZE,
        cursor: last ? { name: last.name, id: last.id } : undefined,
      });
      setItems((prev) => [...prev, ...res.data]);
      if (res.data.length < PAGE_SIZE) setReachedEnd(true);
    } catch (err) {
      console.error("[archive-list] load more failed", err);
      toast.error("더 불러오기 실패");
    } finally {
      setLoadingMore(false);
    }
  }

  /** 로드된 항목에서 unique 태그 + 빈도 추출 (검색·필터 시 전량 로드되어 완전해짐) */
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      const tags = (it as { tags?: string[] }).tags ?? [];
      for (const t of tags) {
        const trimmed = t.trim();
        if (!trimmed) continue;
        counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
  }, [items]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let pool = items;
    if (favoritesOnly) {
      pool = pool.filter((it) => favIdSet.has(it.id));
    }
    if (type === "variable" && domainFilter !== "all") {
      pool = pool.filter((it) => (it as ArchiveVariable).type === domainFilter);
    }
    if (selectedTags.length > 0) {
      pool = pool.filter((it) => {
        const tags = (it as { tags?: string[] }).tags ?? [];
        return selectedTags.every((t) => tags.includes(t));
      });
    }
    if (q) {
      pool = pool.filter((it) => {
        const altNames = (it as { altNames?: string[] }).altNames ?? [];
        const tags = (it as { tags?: string[] }).tags ?? [];
        const haystack = [
          it.name,
          it.description ?? "",
          ...altNames,
          ...tags,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    // 정렬
    const sorted = [...pool];
    if (sortMode === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    } else if (sortMode === "recent") {
      sorted.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    } else if (sortMode === "alt") {
      // 별칭 많은 것이 위 (더 풍부한 항목)
      sorted.sort(
        (a, b) =>
          ((b as { altNames?: string[] }).altNames?.length ?? 0) -
          ((a as { altNames?: string[] }).altNames?.length ?? 0),
      );
    }
    return sorted;
  }, [items, query, selectedTags, favoritesOnly, favIdSet, sortMode, domainFilter, type]);

  const handleToggleFav = async (item: ArchiveItem) => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    const favId = archiveFavoritesApi.makeId(user.id, type, item.id);
    const isFav = favIdSet.has(item.id);
    try {
      if (isFav) {
        await archiveFavoritesApi.delete(favId);
        setFavorites((prev) => prev.filter((f) => f.id !== favId));
        toast.success("관심 해제");
      } else {
        const created = await archiveFavoritesApi.upsert(favId, {
          userId: user.id,
          itemType: type,
          itemId: item.id,
          itemName: item.name,
        });
        setFavorites((prev) => [...prev, created]);
        toast.success("관심 저장");
      }
    } catch (err) {
      console.error("[archive-list] favorite toggle failed", err);
      toast.error("관심 저장 실패");
    }
  };

  const meta = TYPE_META[type];
  const Icon = meta.icon;
  // 커서 "더 보기" 노출 조건: 검색·필터 비활성 + 아직 종점 미도달 + 전량 로드 전.
  const showLoadMore = !needsFullLoad && !fullyLoaded && !reachedEnd && !initialLoading;

  return (
    <PageContainer width="default">
      <Link href="/archive">
        <Button variant="ghost" size="sm" className="mb-3">
          <ArrowLeft className="mr-1 h-4 w-4" />
          아카이브
        </Button>
      </Link>

      <PageHeader
        icon={Icon}
        title={`교육공학 아카이브 · ${meta.title}`}
        description={meta.description}
      />

      {/* 다른 유형으로 이동 */}
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {(Object.keys(TYPE_META) as ArchiveItemType[]).map((t) => {
          const isActive = t === type;
          return (
            <Link key={t} href={`/archive/${t}`}>
              <Badge
                variant={isActive ? "default" : "outline"}
                className={cn(
                  "cursor-pointer",
                  !isActive && ARCHIVE_ITEM_TYPE_COLORS[t],
                )}
              >
                {ARCHIVE_ITEM_TYPE_LABELS[t]}
              </Badge>
            </Link>
          );
        })}
      </div>

      {/* 검색 + 정렬 + 즐겨찾기만 + 새로 추가 (공용 툴바 — H4) */}
      <div className="mt-6">
        <ArchiveListToolbar
          query={query}
          onQueryChange={setQuery}
          placeholder={`${meta.title} 이름·설명·태그로 검색`}
          resultCount={filtered.length}
          totalCount={fullyLoaded ? items.length : total || items.length}
          sortMode={sortMode}
          onSortChange={(v) => setSortMode(v as typeof sortMode)}
          sortOptions={SORT_OPTIONS}
          showFavoritesToggle={!!user}
          favoritesOnly={favoritesOnly}
          onFavoritesToggle={() => setFavoritesOnly((v) => !v)}
          actions={
            canManage ? (
              <Link href={`/archive/${type}/new`}>
                <Button type="button" size="sm" className="h-9">
                  <Plus className="mr-1 h-4 w-4" />새로 추가
                </Button>
              </Link>
            ) : undefined
          }
        >
          {/* 사이클 60: 변인 구인 영역 필터 — "이 연구에서 사람의 무엇을 보고자 하는가" */}
          {type === "variable" && (
            <div className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-muted-foreground">
                  사람의 무엇을 보나요?
                </span>
                {(["all", "cognitive", "affective", "behavioral", "environmental", "demographic"] as const).map((d) => {
                  const selected = domainFilter === d;
                  const label = d === "all" ? "전체" : VARIABLE_TYPE_LABELS[d];
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDomainFilter(d)}
                      aria-pressed={selected}
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                인지적(지식·사고) · 정의적(마음가짐) · 행동적(실제 행동) — 처치가 겨냥한 영역과 측정 변인의 영역이
                일치하는지가 변인 선정의 첫 점검입니다.
              </p>
            </div>
          )}

          {/* Archive-UX: 태그 chip 다중 선택 필터 */}
          {allTags.length > 0 && (
            <div className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-muted-foreground">
                  태그 필터 (AND)
                </span>
                {allTags.slice(0, 30).map(({ tag, count }) => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={selected}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {tag}
                      <span className="text-[9px] opacity-70">{count}</span>
                    </button>
                  );
                })}
                {selectedTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="ml-1 inline-flex items-center gap-0.5 rounded-full border border-dashed border-destructive/40 px-2 py-0.5 text-[11px] text-destructive hover:bg-destructive/10"
                  >
                    초기화 ({selectedTags.length})
                  </button>
                )}
                {allTags.length > 30 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{allTags.length - 30}개 더 (검색 사용)
                  </span>
                )}
              </div>
            </div>
          )}
        </ArchiveListToolbar>
      </div>

      {/* 리스트 */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* 견고성(2026-07-19): 전량 로드 승격이 pending 이어도 프리패치분으로 계산된
            filtered 가 있으면 즉시 렌더 — 스켈레톤은 "보여줄 것이 없을 때"만. */}
        {filtered.length === 0 && (initialLoading || (loadingFull && !fullyLoaded)) ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            className="md:col-span-2"
            title={needsFullLoad ? "검색 결과가 없습니다" : "아직 등록된 항목이 없습니다"}
          />
        ) : (
          filtered.map((it) => (
            <ArchiveCard
              key={it.id}
              type={type}
              item={it}
              isFav={favIdSet.has(it.id)}
              canFav={!!user}
              canEdit={canManage}
              onToggleFav={() => handleToggleFav(it)}
              borderClass={meta.borderClass}
            />
          ))
        )}
      </div>

      {/* v5-H1: 커서 기반 "더 보기" — 검색·필터 비활성 시에만 노출 */}
      {showLoadMore && (
        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
            className="gap-1.5"
          >
            {loadingMore ? (
              "불러오는 중…"
            ) : (
              <>
                더 보기
                <span className="text-xs text-muted-foreground tabular-nums">
                  ({items.length}
                  {total ? ` / ${total}` : ""})
                </span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </PageContainer>
  );
}

function ArchiveCard({
  type,
  item,
  isFav,
  canFav,
  canEdit,
  onToggleFav,
  borderClass,
}: {
  type: ArchiveItemType;
  item: ArchiveItem;
  isFav: boolean;
  canFav: boolean;
  canEdit: boolean;
  onToggleFav: () => void;
  borderClass: string;
}) {
  const altNames = (item as { altNames?: string[] }).altNames ?? [];
  const tags = (item as { tags?: string[] }).tags ?? [];
  const purifiedName = (item as { purifiedName?: string }).purifiedName?.trim();
  // AECT 공식 역어 — name 과 다를 때만 병기
  const aectTermRaw = (item as { aectTerm?: string }).aectTerm?.trim();
  const aectTerm = aectTermRaw && aectTermRaw !== item.name ? aectTermRaw : undefined;

  const meta: string[] = [];
  if (type === "variable" && (item as ArchiveVariable).type) {
    meta.push(VARIABLE_TYPE_LABELS[(item as ArchiveVariable).type!]);
  }
  if (type === "measurement") {
    const m = item as ArchiveMeasurementTool;
    if (m.author) meta.push(m.author);
    if (m.itemCount) meta.push(`${m.itemCount}문항`);
  }

  return (
    <Card className={cn("border-l-4 transition-shadow hover:shadow-md", borderClass)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/archive/${type}/${item.id}`}
            className="group min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-md"
          >
            <CardTitle className="text-base truncate group-hover:text-primary">
              {item.name}
            </CardTitle>
            {(purifiedName || aectTerm) && (
              <span className="mt-1 flex flex-wrap items-center gap-1">
                {purifiedName && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-800 dark:border-teal-400/30 dark:bg-teal-950/30 dark:text-teal-300">
                    순화어 · {purifiedName}
                  </span>
                )}
                {aectTerm && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-info/20 bg-info/5 px-2 py-0.5 text-[10px] font-medium text-info">
                    AECT · {aectTerm}
                  </span>
                )}
              </span>
            )}
            {altNames.length > 0 && (
              <p className="mt-0.5 text-[11px] text-muted-foreground italic truncate">
                {altNames.join(" · ")}
              </p>
            )}
            {meta.length > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {meta.join(" · ")}
              </p>
            )}
          </Link>
          <div className="flex items-center gap-1">
            {canEdit && (
              <Link
                href={`/archive/${type}/${item.id}/edit`}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="수정"
              >
                <Pencil className="h-4 w-4" />
              </Link>
            )}
            {canFav && <ArchiveFavoriteStar isFav={isFav} onToggle={onToggleFav} />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {item.description && (
          <Link
            href={`/archive/${type}/${item.id}`}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-md"
          >
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {leadSentence(item.description).lead}
            </p>
          </Link>
        )}
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 4).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] font-normal">
                {t}
              </Badge>
            ))}
            {tags.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{tags.length - 4}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// UX(2026-07-04): useSearchParams 는 Suspense 경계 필요 — 래퍼로 충족.
export default function ArchiveTypeListClient(props: Props) {
  return (
    <Suspense fallback={null}>
      <ArchiveTypeListClientInner {...props} />
    </Suspense>
  );
}
