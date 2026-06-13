"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Star,
  Lightbulb,
  Variable as VariableIcon,
  Ruler,
  Plus,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
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

const TYPE_META: Record<
  ArchiveItemType,
  {
    title: string;
    description: string;
    icon: typeof Lightbulb;
    borderClass: string;
    iconBg: string;
    iconText: string;
  }
> = {
  concept: {
    title: "개념",
    description: "교육공학에서 다루는 이론·구성개념을 모은 라이브러리. 클릭하여 연결된 변인·측정도구를 살펴보세요.",
    icon: Lightbulb,
    borderClass: "border-l-violet-400",
    iconBg: "bg-violet-100",
    iconText: "text-violet-700",
  },
  variable: {
    title: "변인",
    description: "양적 연구에서 다루는 측정 가능한 변인. 어떤 개념과 닿아 있고 어떤 측정도구로 잴 수 있는지 따라가 보세요.",
    icon: VariableIcon,
    borderClass: "border-l-blue-400",
    iconBg: "bg-blue-100",
    iconText: "text-blue-700",
  },
  measurement: {
    title: "측정도구",
    description: "신뢰도·타당도가 검증된 척도. 문항·저자·신뢰도와 함께, 측정 대상 변인을 역으로 확인할 수 있습니다.",
    icon: Ruler,
    borderClass: "border-l-emerald-400",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-700",
  },
};

export default function ArchiveTypeListPage() {
  const params = useParams<{ type: string }>();
  const type = params?.type as ArchiveItemType;
  const { user } = useAuthStore();

  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [favorites, setFavorites] = useState<ArchiveFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  // 여정 등 외부 딥링크의 ?q= 초기 검색어 (useSearchParams 의 Suspense 경계 요구 회피)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, []);

  const canManage = isAtLeast(user, "staff");

  if (type !== "concept" && type !== "variable" && type !== "measurement") {
    notFound();
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (type === "concept") {
          const res = await archiveConceptsApi.list();
          if (!cancelled) setItems(res.data);
        } else if (type === "variable") {
          const res = await archiveVariablesApi.list();
          if (!cancelled) setItems(res.data);
        } else {
          const res = await archiveMeasurementsApi.list();
          if (!cancelled) setItems(res.data);
        }
      } catch (err) {
        console.error("[archive-list] load failed", err);
        toast.error("불러오기 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type]);

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

  /** 전체 항목에서 unique 태그 + 빈도 추출 */
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
  }, [items, query, selectedTags, favoritesOnly, favIdSet, sortMode, domainFilter]);

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

      {/* 검색 + 정렬 + 새로 추가 */}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${meta.title} 이름·설명·태그로 검색`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
            className="h-9 rounded-md border bg-background px-2 text-xs"
            aria-label="정렬 방식"
          >
            <option value="name">이름순 (가나다)</option>
            <option value="recent">최신 추가순</option>
            <option value="alt">별칭 많은 순</option>
          </select>
          {user && (
            <Button
              type="button"
              size="sm"
              variant={favoritesOnly ? "default" : "outline"}
              onClick={() => setFavoritesOnly((v) => !v)}
              aria-pressed={favoritesOnly}
              className="h-9 gap-1 text-xs"
            >
              ★ 즐겨찾기만
            </Button>
          )}
          {canManage && (
            <Link href={`/archive/${type}/new`}>
              <Button type="button" size="sm" className="h-9">
                <Plus className="mr-1 h-4 w-4" />새로 추가
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 사이클 60: 변인 구인 영역 필터 — "이 연구에서 사람의 무엇을 보고자 하는가" */}
      {type === "variable" && (
        <div className="mt-3 rounded-lg border bg-card p-3">
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
        <div className="mt-3 rounded-lg border bg-card p-3">
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
                className="ml-1 inline-flex items-center gap-0.5 rounded-full border border-dashed border-rose-300 px-2 py-0.5 text-[11px] text-rose-700 hover:bg-rose-50"
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

      <div className="mt-2 text-xs text-muted-foreground">
        {loading
          ? "불러오는 중..."
          : `총 ${filtered.length}개${
              query || selectedTags.length > 0 || favoritesOnly
                ? ` (전체 ${items.length})`
                : ""
            }`}
      </div>

      {/* 리스트 */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : filtered.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {query ? "검색 결과가 없습니다." : "아직 등록된 항목이 없습니다."}
            </CardContent>
          </Card>
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
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">{item.name}</CardTitle>
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
          </div>
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
            {canFav && (
              <button
                type="button"
                onClick={onToggleFav}
                className={cn(
                  "rounded-md p-1 transition-colors",
                  isFav
                    ? "text-amber-500 hover:bg-amber-50"
                    : "text-muted-foreground hover:bg-muted hover:text-amber-500",
                )}
                aria-label={isFav ? "관심 해제" : "관심 저장"}
              >
                <Star className={cn("h-4 w-4", isFav && "fill-current")} />
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {item.description && (() => {
          const { lead, truncated } = leadSentence(item.description);
          return (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {lead}
              {truncated && (
                <span className="ml-1 whitespace-nowrap font-medium text-primary">
                  … 더보기
                </span>
              )}
            </p>
          );
        })()}
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
        <Link
          href={`/archive/${type}/${item.id}`}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          연결 보기
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
