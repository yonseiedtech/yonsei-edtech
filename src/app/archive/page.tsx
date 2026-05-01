"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Library, Search, Star, Network, Tag } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import { useAuthStore } from "@/features/auth/auth-store";
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
  type ArchiveMeasurementTool,
  type ArchiveFavorite,
  type ArchiveItemType,
} from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AnyItem = ArchiveConcept | ArchiveVariable | ArchiveMeasurementTool;

function FavoriteStar({
  type,
  item,
  favorites,
  onToggle,
}: {
  type: ArchiveItemType;
  item: AnyItem;
  favorites: Map<string, ArchiveFavorite>;
  onToggle: (type: ArchiveItemType, item: AnyItem, isFav: boolean) => void;
}) {
  const { user } = useAuthStore();
  const key = `${type}_${item.id}`;
  const isFav = favorites.has(key);
  if (!user) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(type, item, isFav);
      }}
      className={cn(
        "rounded-full p-1.5 transition-colors hover:bg-amber-50",
        isFav ? "text-amber-500" : "text-muted-foreground/50",
      )}
      aria-label={isFav ? "관심 해제" : "관심 저장"}
    >
      <Star className={cn("h-4 w-4", isFav && "fill-current")} />
    </button>
  );
}

export default function ArchivePage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<ArchiveItemType>("concept");
  const [q, setQ] = useState("");
  const [concepts, setConcepts] = useState<ArchiveConcept[]>([]);
  const [variables, setVariables] = useState<ArchiveVariable[]>([]);
  const [measurements, setMeasurements] = useState<ArchiveMeasurementTool[]>([]);
  const [favorites, setFavorites] = useState<Map<string, ArchiveFavorite>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [c, v, m] = await Promise.all([
          archiveConceptsApi.list(),
          archiveVariablesApi.list(),
          archiveMeasurementsApi.list(),
        ]);
        if (cancelled) return;
        setConcepts(c.data);
        setVariables(v.data);
        setMeasurements(m.data);
      } catch (err) {
        console.error("[archive] load failed", err);
        toast.error("아카이브 로드 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setFavorites(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await archiveFavoritesApi.listByUser(user.id);
        if (cancelled) return;
        const map = new Map<string, ArchiveFavorite>();
        res.data.forEach((f) => map.set(`${f.itemType}_${f.itemId}`, f));
        setFavorites(map);
      } catch (err) {
        console.error("[archive] favorites load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleToggleFavorite = async (
    type: ArchiveItemType,
    item: AnyItem,
    isFav: boolean,
  ) => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    const id = archiveFavoritesApi.makeId(user.id, type, item.id);
    const key = `${type}_${item.id}`;
    try {
      if (isFav) {
        await archiveFavoritesApi.delete(id);
        setFavorites((m) => {
          const n = new Map(m);
          n.delete(key);
          return n;
        });
        toast.success("관심 해제");
      } else {
        const fav = await archiveFavoritesApi.upsert(id, {
          userId: user.id,
          itemType: type,
          itemId: item.id,
          itemName: item.name,
        });
        setFavorites((m) => new Map(m).set(key, fav));
        toast.success("관심 저장");
      }
    } catch (err) {
      console.error("[archive] favorite toggle failed", err);
      toast.error("관심 저장 실패");
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filterFn = <T extends AnyItem>(items: T[]) => {
      if (!term) return items;
      return items.filter((it) => {
        const blob = [
          it.name,
          it.description ?? "",
          ...((it as { altNames?: string[] }).altNames ?? []),
          ...((it as { tags?: string[] }).tags ?? []),
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(term);
      });
    };
    return {
      concept: filterFn(concepts),
      variable: filterFn(variables),
      measurement: filterFn(measurements),
    };
  }, [q, concepts, variables, measurements]);

  const favList = useMemo(() => Array.from(favorites.values()), [favorites]);

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <PageHeader
        icon={Library}
        title="교육공학 아카이브"
        description="개념 · 변인 · 측정도구를 연결고리로 탐색하는 연구 자원 라이브러리"
      />

      {/* 검색 */}
      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="개념명 · 변인명 · 측정도구명 · 태그 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 관심 저장 모음 (로그인 시) */}
      {user && favList.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              관심 저장 ({favList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {favList.map((f) => (
                <Link key={f.id} href={`/archive/${f.itemType}/${f.itemId}`}>
                  <Badge
                    variant="outline"
                    className={cn(
                      "cursor-pointer transition-shadow hover:shadow-sm",
                      ARCHIVE_ITEM_TYPE_COLORS[f.itemType],
                    )}
                  >
                    [{ARCHIVE_ITEM_TYPE_LABELS[f.itemType]}] {f.itemName ?? f.itemId}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 탭 */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as ArchiveItemType)}
        className="mt-6"
      >
        <TabsList>
          <TabsTrigger value="concept">개념 ({concepts.length})</TabsTrigger>
          <TabsTrigger value="variable">변인 ({variables.length})</TabsTrigger>
          <TabsTrigger value="measurement">측정도구 ({measurements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="concept">
          <ItemGrid
            type="concept"
            items={filtered.concept}
            loading={loading}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            renderMeta={(c) => {
              const item = c as ArchiveConcept;
              return (
                <span className="text-xs text-muted-foreground">
                  연결 변인 {item.variableIds?.length ?? 0}
                </span>
              );
            }}
          />
        </TabsContent>

        <TabsContent value="variable">
          <ItemGrid
            type="variable"
            items={filtered.variable}
            loading={loading}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            renderMeta={(c) => {
              const item = c as ArchiveVariable;
              return (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {item.type && (
                    <Badge variant="outline" className="text-[10px]">
                      {VARIABLE_TYPE_LABELS[item.type]}
                    </Badge>
                  )}
                  <span>측정도구 {item.measurementIds?.length ?? 0}</span>
                </div>
              );
            }}
          />
        </TabsContent>

        <TabsContent value="measurement">
          <ItemGrid
            type="measurement"
            items={filtered.measurement}
            loading={loading}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            renderMeta={(c) => {
              const item = c as ArchiveMeasurementTool;
              return (
                <span className="text-xs text-muted-foreground">
                  {item.author ? `${item.author} · ` : ""}
                  {item.itemCount ? `${item.itemCount}문항` : ""}
                </span>
              );
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ItemGrid({
  type,
  items,
  loading,
  favorites,
  onToggleFavorite,
  renderMeta,
}: {
  type: ArchiveItemType;
  items: AnyItem[];
  loading: boolean;
  favorites: Map<string, ArchiveFavorite>;
  onToggleFavorite: (type: ArchiveItemType, item: AnyItem, isFav: boolean) => void;
  renderMeta: (item: AnyItem) => React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        등록된 항목이 없습니다.
      </div>
    );
  }
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const tags = (item as { tags?: string[] }).tags ?? [];
        return (
          <Card
            key={item.id}
            className={cn("transition-shadow hover:shadow-md", "border-l-4")}
            style={{
              borderLeftColor:
                type === "concept"
                  ? "rgb(167 139 250)"
                  : type === "variable"
                    ? "rgb(96 165 250)"
                    : "rgb(52 211 153)",
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/archive/${type}/${item.id}`}
                  className="flex-1 min-w-0"
                >
                  <CardTitle className="text-base hover:underline truncate">
                    {item.name}
                  </CardTitle>
                </Link>
                <FavoriteStar
                  type={type}
                  item={item}
                  favorites={favorites}
                  onToggle={onToggleFavorite}
                />
              </div>
              {(item as { altNames?: string[] }).altNames?.length ? (
                <p className="text-xs text-muted-foreground italic">
                  {(item as { altNames?: string[] }).altNames!.join(" · ")}
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="pt-0">
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {item.description}
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                {renderMeta(item)}
                <Link href={`/archive/${type}/${item.id}`}>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                    <Network className="mr-1 h-3 w-3" />
                    연결 보기
                  </Button>
                </Link>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.slice(0, 4).map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      <Tag className="mr-0.5 h-2.5 w-2.5" />
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
