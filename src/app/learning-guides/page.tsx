"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, Lock, Users, ArrowUpRight, BookOpen } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { guidesApi, guideProgressApi } from "@/features/learning-guides/api";
import type { LearningGuide, LearningGuideProgress } from "@/types/learning-guide";
import { cn } from "@/lib/utils";

const VIS_META: Record<string, { icon: React.ElementType; label: string }> = {
  member: { icon: Users, label: "회원" },
  staff: { icon: Lock, label: "운영진" },
};

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

  const [featured, ...rest] = filtered;

  return (
    <PageContainer width="wide">
      {/* ── 편집형 마스트헤드 ── */}
      <header className="border-b pb-8 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          연세교육공학 · 서재
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-[1.15] tracking-tight text-foreground text-balance sm:text-4xl">
          교육공학을 한 걸음씩, 러닝 가이드
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          핵심 주제를 단계별 챕터로 엮은 학습 가이드 모음입니다. 필요한 주제를 골라 처음부터 끝까지 따라가 보세요.
        </p>
        {!loading && guides.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground/70 tabular-nums">
            {guides.length}개의 가이드
          </p>
        )}
      </header>

      {/* ── 검색 · 카테고리 ── */}
      {!loading && guides.length > 0 && (
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {categories.length > 1 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {categories.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "relative text-sm font-medium transition-colors",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {cat}
                    {active && (
                      <span className="absolute -bottom-1.5 left-0 h-0.5 w-full rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : <span />}
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="제목·태그로 검색"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* ── 콘텐츠 ── */}
      <div className="mt-8">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-52 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={guides.length === 0 ? "아직 발행된 가이드가 없습니다." : "조건에 맞는 가이드가 없습니다."}
            description={q || activeCategory !== "전체" ? "검색어나 카테고리를 바꿔 보세요." : "곧 새로운 가이드가 열립니다."}
          />
        ) : (
          <div className="space-y-8">
            {featured && <FeaturedGuide guide={featured} progress={progressMap[featured.id]} />}
            {rest.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((guide) => (
                  <GuideCard key={guide.id} guide={guide} progress={progressMap[guide.id]} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

// ── 진행 뱃지 ──
function ProgressLabel({ progress }: { progress?: LearningGuideProgress }) {
  const read = progress?.readPageIds?.length ?? 0;
  if (read === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
      {read}페이지 읽음
    </span>
  );
}

// ── 공개범위 뱃지 ──
function VisibilityTag({ visibility }: { visibility: string }) {
  const meta = VIS_META[visibility];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Icon size={10} />
      {meta.label}
    </span>
  );
}

// ── 피처드 리드 카드 (편집형 가로 배치) ──
function FeaturedGuide({ guide, progress }: { guide: LearningGuide; progress?: LearningGuideProgress }) {
  return (
    <Link href={`/learning-guides/${guide.slug}`} className="group block">
      <article className="grid overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md md:grid-cols-[minmax(0,240px)_1fr]">
        {/* 표지 패널 */}
        <div className="flex items-center justify-center bg-primary/[0.06] p-10 md:p-8">
          <span className="text-6xl leading-none md:text-7xl" role="img" aria-hidden>
            {guide.coverEmoji ?? "📖"}
          </span>
        </div>
        {/* 본문 */}
        <div className="flex flex-col justify-center gap-3 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {guide.category || "가이드"}
            </span>
            <VisibilityTag visibility={guide.visibility} />
          </div>
          <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground text-balance transition-colors group-hover:text-primary">
            {guide.title}
          </h2>
          {(guide.subtitle || guide.description) && (
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground line-clamp-2">
              {guide.subtitle || guide.description}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>by {guide.authorName}</span>
            {guide.chapterCount != null && guide.chapterCount > 0 && (
              <span className="opacity-70">· {guide.chapterCount}챕터</span>
            )}
            <ProgressLabel progress={progress} />
            <span className="ml-auto inline-flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              읽기 <ArrowUpRight size={13} />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ── 그리드 카드 ──
function GuideCard({ guide, progress }: { guide: LearningGuide; progress?: LearningGuideProgress }) {
  return (
    <Link href={`/learning-guides/${guide.slug}`} className="group block">
      <article className="flex h-full flex-col gap-4 rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.06] text-2xl leading-none" role="img" aria-hidden>
            {guide.coverEmoji ?? "📖"}
          </span>
          <VisibilityTag visibility={guide.visibility} />
        </div>

        <div className="flex-1">
          {guide.category && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              {guide.category}
            </p>
          )}
          <h3 className="mt-1 font-display text-lg font-semibold leading-snug tracking-tight text-foreground text-balance transition-colors group-hover:text-primary line-clamp-2">
            {guide.title}
          </h3>
          {(guide.subtitle || guide.description) && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {guide.subtitle || guide.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
          <span className="truncate">
            {guide.authorName}
            {guide.chapterCount != null && guide.chapterCount > 0 && (
              <span className="opacity-70"> · {guide.chapterCount}챕터</span>
            )}
          </span>
          <ProgressLabel progress={progress} />
        </div>
      </article>
    </Link>
  );
}
