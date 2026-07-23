"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { BookOpen, Search, Tag, ChevronRight } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { guidesApi, guideProgressApi } from "@/features/learning-guides/api";
import type { LearningGuide, LearningGuideProgress } from "@/types/learning-guide";
import { cn } from "@/lib/utils";

export default function LearningGuidesPage() {
  const { user } = useAuthStore();
  const [guides, setGuides] = useState<LearningGuide[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, LearningGuideProgress>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("전체");

  useEffect(() => {
    guidesApi.list()
      .then((res) => setGuides(res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 진행 정보 로드 (로그인 시)
  useEffect(() => {
    if (!user || guides.length === 0) return;
    Promise.all(
      guides.map((g) =>
        guideProgressApi.get(g.id).then((p) => p ? { [g.id]: p } : {})
      )
    ).then((results) => {
      const merged: Record<string, LearningGuideProgress> = {};
      for (const r of results) Object.assign(merged, r);
      setProgressMap(merged);
    }).catch(() => {});
  }, [user, guides]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(guides.map((g) => g.category).filter(Boolean)));
    return ["전체", ...cats];
  }, [guides]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return guides.filter((g) => {
      if (activeCategory !== "전체" && g.category !== activeCategory) return false;
      if (!term) return true;
      return (
        g.title.toLowerCase().includes(term) ||
        g.subtitle?.toLowerCase().includes(term) ||
        g.description?.toLowerCase().includes(term) ||
        g.tags.some((t) => t.toLowerCase().includes(term))
      );
    });
  }, [guides, q, activeCategory]);

  return (
    <PageContainer width="wide">
      <PageHeader
        icon={BookOpen}
        title="러닝 가이드"
        description="교육공학 핵심 주제를 단계별로 학습하세요."
      />

      {/* 검색 */}
      <div className="mt-6 relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="제목·태그로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 카테고리 필터 */}
      {categories.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeCategory === cat
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <Tag size={11} />
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* 가이드 목록 */}
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="가이드가 없습니다."
            description={q ? "검색어를 바꿔 보세요." : "아직 발행된 가이드가 없습니다."}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((guide) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                progress={progressMap[guide.id]}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function GuideCard({ guide, progress }: { guide: LearningGuide; progress?: LearningGuideProgress }) {
  const totalPages = progress?.readPageIds?.length ?? 0;
  const hasProgress = totalPages > 0;

  return (
    <Link href={`/learning-guides/${guide.slug}`} className="group block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          {/* 표지 이모지 */}
          <div className="flex items-start justify-between gap-2">
            <span className="text-3xl leading-none" role="img" aria-hidden>
              {guide.coverEmoji ?? "📖"}
            </span>
            {guide.visibility !== "public" && (
              <Badge variant="outline" className="text-[10px]">
                {guide.visibility === "member" ? "회원" : "운영진"}
              </Badge>
            )}
          </div>

          {/* 제목 */}
          <div className="flex-1">
            <h2 className="font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {guide.title}
            </h2>
            {guide.subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {guide.subtitle}
              </p>
            )}
            {guide.description && (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {guide.description}
              </p>
            )}
          </div>

          {/* 하단 메타 */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {guide.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {hasProgress && (
                <span className="text-[11px] text-success font-medium">
                  {totalPages}페이지 읽음
                </span>
              )}
              <ChevronRight
                size={15}
                className="text-muted-foreground/50 group-hover:text-primary transition-colors"
              />
            </div>
          </div>

          {/* 저자 */}
          <p className="text-[11px] text-muted-foreground border-t pt-2">
            by {guide.authorName}
            {guide.chapterCount != null && guide.chapterCount > 0 && (
              <span className="ml-1 opacity-60">· {guide.chapterCount}챕터</span>
            )}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
