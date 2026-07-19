"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  History,
  Target,
  Trash2,
  LogIn,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  archiveFavoritesApi,
  favoriteHref,
  diagnosticResultsApi,
} from "@/lib/bkend";
import {
  ARCHIVE_ITEM_TYPE_LABELS,
  ARCHIVE_ITEM_TYPE_COLORS,
  type ArchiveFavorite,
  type ArchiveFavoriteItemType,
  type DiagnosticResult,
} from "@/types";
import {
  getRecentViews,
  clearRecentViews,
  type RecentArchiveView,
} from "@/lib/archive-recent-views";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** 즐겨찾기 칩 라벨 — 7개 동적 아카이브 타입 (랜딩과 동일 규약). */
const FAVORITE_TYPE_LABELS: Record<ArchiveFavoriteItemType, string> = {
  ...ARCHIVE_ITEM_TYPE_LABELS,
  "research-method": "연구방법",
  "statistical-method": "통계방법",
  "foundation-term": "기초 용어",
  "writing-tip": "글쓰기",
};

const FAVORITE_TYPE_COLORS: Record<ArchiveFavoriteItemType, string> = {
  ...ARCHIVE_ITEM_TYPE_COLORS,
  "research-method": "bg-info/5 text-info border border-info/20",
  "statistical-method": "bg-info/5 text-info border border-info/20",
  "foundation-term": "bg-warning/5 text-warning border border-warning/20",
  "writing-tip": "bg-destructive/5 text-destructive border border-destructive/20",
};

/** 그룹 표시 순서 — 사전·라이브러리 → 가이드 계열. */
const FAVORITE_TYPE_ORDER: ArchiveFavoriteItemType[] = [
  "concept",
  "variable",
  "measurement",
  "research-method",
  "statistical-method",
  "foundation-term",
  "writing-tip",
];

export default function MyArchivePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const favoritesKey = ["archive_favorites", user?.id ?? "guest"];

  const [recent, setRecent] = useState<RecentArchiveView[]>([]);

  // 최근 본 항목 — 로컬 저장, 비로그인에서도 동작 (마운트 시 1회 로드)
  useEffect(() => {
    setRecent(getRecentViews());
  }, []);

  // M4: 목록 읽기 캐시 — 사용자 데이터(즐겨찾기·진단 약점) 2분. (가이드 랜딩과 즐겨찾기 캐시 공유)
  const { data: favorites = [], isLoading: favLoading } = useQuery({
    queryKey: favoritesKey,
    queryFn: async () => {
      if (!user) return [] as ArchiveFavorite[];
      const res = await archiveFavoritesApi.listByUser(user.id);
      return res.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  // 진단 약점 개념 — 최신 진단 결과 기준 (있을 때만)
  const { data: weakConcepts = [] } = useQuery({
    queryKey: ["diagnostic_results", "weak-concepts", user?.id ?? "guest"],
    queryFn: async () => {
      if (!user) return [] as { id: string; name: string }[];
      const res = await diagnosticResultsApi.listByUser(user.id);
      const latest = (res.data as DiagnosticResult[])
        .slice()
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
      if (!latest?.weakConceptIds?.length) return [];
      return latest.weakConceptIds
        .map((id, i) => ({ id, name: latest.weakConceptNames?.[i] ?? "" }))
        .filter((c) => c.id && c.name);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  const groupedFavorites = useMemo(() => {
    const byType = new Map<ArchiveFavoriteItemType, ArchiveFavorite[]>();
    for (const f of favorites) {
      const list = byType.get(f.itemType) ?? [];
      list.push(f);
      byType.set(f.itemType, list);
    }
    for (const list of byType.values()) {
      list.sort((a, b) => (a.itemName ?? "").localeCompare(b.itemName ?? "", "ko"));
    }
    return FAVORITE_TYPE_ORDER.filter((t) => byType.has(t)).map((t) => ({
      type: t,
      items: byType.get(t)!,
    }));
  }, [favorites]);

  const handleUnfavorite = async (f: ArchiveFavorite) => {
    try {
      await archiveFavoritesApi.delete(f.id);
      queryClient.setQueryData<ArchiveFavorite[]>(favoritesKey, (prev = []) =>
        prev.filter((x) => x.id !== f.id),
      );
      toast.success("관심 해제");
    } catch (err) {
      console.error("[archive-my] unfavorite failed", err);
      toast.error("관심 해제 실패");
    }
  };

  const handleClearRecent = () => {
    clearRecentViews();
    setRecent([]);
    toast.success("최근 본 기록을 지웠습니다");
  };

  return (
    <PageContainer width="default">
      <Link href="/archive">
        <Button variant="ghost" size="sm" className="mb-3">
          <ArrowLeft className="mr-1 h-4 w-4" />
          아카이브
        </Button>
      </Link>

      <PageHeader
        icon={Star}
        title="내 아카이브"
        description="즐겨찾기·최근 본 항목·진단 약점 개념을 한곳에 모아 이어보기 좋게 정리했습니다."
      />

      {/* ① 즐겨찾기 */}
      <section className="mt-6" aria-labelledby="my-archive-favorites">
        <h2
          id="my-archive-favorites"
          className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <Star className="h-5 w-5 text-warning" aria-hidden />
          즐겨찾기
          {favorites.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({favorites.length})
            </span>
          )}
        </h2>

        {!user ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <LogIn className="h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                로그인하면 저장한 관심 항목을 여기에서 모아볼 수 있습니다.
              </p>
              <Link href="/login">
                <Button size="sm">로그인하고 즐겨찾기 보기</Button>
              </Link>
            </CardContent>
          </Card>
        ) : favLoading ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : groupedFavorites.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              아직 저장한 관심 항목이 없습니다. 각 아카이브 리스트·상세에서{" "}
              <Star className="inline h-3.5 w-3.5 text-warning" aria-hidden /> 별을 눌러
              저장해 보세요.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {groupedFavorites.map(({ type, items }) => (
              <div key={type}>
                <div className="mb-2 flex items-center gap-1.5 border-b pb-1.5">
                  <span className="text-sm font-semibold text-foreground/80">
                    {FAVORITE_TYPE_LABELS[type]}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    ({items.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((f) => (
                    <span
                      key={f.id}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                        FAVORITE_TYPE_COLORS[f.itemType],
                      )}
                    >
                      <Link
                        href={favoriteHref(f)}
                        className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
                      >
                        {f.itemName ?? f.itemId}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleUnfavorite(f)}
                        aria-label={`${f.itemName ?? f.itemId} 관심 해제`}
                        className="rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100"
                      >
                        <Star className="h-3 w-3 fill-current" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ② 최근 본 항목 */}
      <section className="mt-8" aria-labelledby="my-archive-recent">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2
            id="my-archive-recent"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <History className="h-5 w-5 text-primary" aria-hidden />
            최근 본 항목
            {recent.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({recent.length})
              </span>
            )}
          </h2>
          {recent.length > 0 && (
            <button
              type="button"
              onClick={handleClearRecent}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              기록 지우기
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              최근 본 아카이브 항목이 여기에 쌓입니다. (이 기기에만 저장)
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {recent.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="group flex items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2.5 text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-primary/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ③ 진단 약점 개념 바로가기 (로그인 + 진단 이력 있을 때만) */}
      {user && weakConcepts.length > 0 && (
        <section className="mt-8" aria-labelledby="my-archive-weak">
          <h2
            id="my-archive-weak"
            className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <Target className="h-5 w-5 text-warning" aria-hidden />
            진단 약점 개념 보완
          </h2>
          <Card className="rounded-2xl border-warning/20 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-warning">
                최근 진단에서 약점으로 나온 개념 — 상세로 이동해 보완하세요.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {weakConcepts.map((c) => (
                  <Link key={c.id} href={`/archive/concept/${c.id}`}>
                    <Badge
                      variant="outline"
                      className="cursor-pointer border-warning/30 bg-warning/5 text-warning transition-colors hover:bg-warning/10"
                    >
                      {c.name}
                    </Badge>
                  </Link>
                ))}
                <Link
                  href="/diagnosis"
                  className="inline-flex items-center text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  재진단 →
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </PageContainer>
  );
}
