"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, BookOpen, List, X,
  CheckCircle2, Circle, ExternalLink, FileText,
  Keyboard,
} from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SimpleMarkdown from "@/features/learning-guides/SimpleMarkdown";
import { guidesApi, guideChaptersApi, guidePagesApi, guideProgressApi } from "@/features/learning-guides/api";
import { useAuthStore } from "@/features/auth/auth-store";
import type { LearningGuide, GuideChapter, GuidePage, LearningGuideProgress } from "@/types/learning-guide";
import { cn } from "@/lib/utils";

// ── YouTube URL → embed URL 변환 ─────────────────────────────────────────────
function toYouTubeEmbed(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  return url;
}

// ── 임베드 렌더 ────────────────────────────────────────────────────────────────
function EmbedRenderer({ page }: { page: GuidePage }) {
  if (!page.embedUrl) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border bg-muted/30 text-sm text-muted-foreground">
        임베드 URL이 설정되지 않았습니다.
      </div>
    );
  }

  if (page.embedKind === "youtube") {
    const embedSrc = toYouTubeEmbed(page.embedUrl);
    return (
      <div className="relative w-full overflow-hidden rounded-xl border bg-black" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={embedSrc}
          title={page.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  if (page.embedKind === "pdf") {
    return (
      <div className="w-full overflow-hidden rounded-xl border">
        <iframe
          src={page.embedUrl}
          title={page.title}
          className="h-[70vh] w-full border-0"
        />
      </div>
    );
  }

  // link 카드
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{page.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{page.embedUrl}</p>
        </div>
        <a
          href={page.embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          <Button variant="outline" size="sm">
            <ExternalLink size={13} className="mr-1" />
            열기
          </Button>
        </a>
      </div>
    </div>
  );
}

// ── 목차 사이드바 ──────────────────────────────────────────────────────────────
interface TocProps {
  chapters: GuideChapter[];
  pages: GuidePage[];
  currentPageId: string | null;
  readPageIds: Set<string>;
  onPageSelect: (page: GuidePage) => void;
  onClose?: () => void;
  className?: string;
}

function TocSidebar({ chapters, pages, currentPageId, readPageIds, onPageSelect, onClose, className }: TocProps) {
  const pagesByChapter = chapters.reduce<Record<string, GuidePage[]>>((acc, ch) => {
    acc[ch.id] = pages.filter((p) => p.chapterId === ch.id).sort((a, b) => a.order - b.order);
    return acc;
  }, {});

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="목차">
      <div className="flex items-center justify-between pb-2 border-b">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">목차</span>
        {onClose && (
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        )}
      </div>
      {chapters.map((ch) => (
        <div key={ch.id} className="mt-2">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {ch.title}
          </p>
          <ul className="space-y-0.5">
            {(pagesByChapter[ch.id] ?? []).map((page) => {
              const isRead = readPageIds.has(page.id);
              const isCurrent = page.id === currentPageId;
              return (
                <li key={page.id}>
                  <button
                    type="button"
                    onClick={() => onPageSelect(page)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      isCurrent
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {isRead ? (
                      <CheckCircle2 size={12} className="shrink-0 text-success" />
                    ) : (
                      <Circle size={12} className="shrink-0 opacity-40" />
                    )}
                    <span className="flex-1 leading-tight line-clamp-2">{page.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// ── 메인 뷰어 ──────────────────────────────────────────────────────────────────
export default function GuideViewerPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();

  const [guide, setGuide] = useState<LearningGuide | null>(null);
  const [chapters, setChapters] = useState<GuideChapter[]>([]);
  const [pages, setPages] = useState<GuidePage[]>([]);
  const [progress, setProgress] = useState<LearningGuideProgress | null>(null);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const readPageIds = new Set(progress?.readPageIds ?? []);
  const totalPages = pages.length;
  const currentIndex = pages.findIndex((p) => p.id === currentPageId);
  const currentPage = pages[currentIndex] ?? null;
  const prevPage = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const nextPage = currentIndex < totalPages - 1 ? pages[currentIndex + 1] : null;

  // 진행 저장 ref (최신 값 참조)
  const progressSavedRef = useRef<Set<string>>(new Set());

  // 데이터 로드
  useEffect(() => {
    if (!slug) return;

    async function load() {
      setLoading(true);
      setNotFound(false); // user 준비 후 재조회 시 이전(guest) 미발견 상태 초기화
      try {
        const guideRes = await guidesApi.getBySlug(slug as string);
        if (!guideRes.data) { setNotFound(true); return; }
        const g = guideRes.data;
        setGuide(g);

        const [chaptersRes, pagesRes] = await Promise.all([
          guideChaptersApi.list(g.id),
          guidePagesApi.listByGuide(g.id),
        ]);

        const chaps = chaptersRes.data.sort((a, b) => a.order - b.order);
        const pgs = pagesRes.data.sort((a, b) => a.order - b.order);
        setChapters(chaps);
        setPages(pgs);

        // 진행 정보 로드 (로그인 시)
        if (user) {
          const prog = await guideProgressApi.get(g.id);
          if (prog) {
            setProgress(prog);
            progressSavedRef.current = new Set(prog.readPageIds);
            // 이어읽기: lastPageId로 이동
            if (prog.lastPageId && pgs.find((p) => p.id === prog.lastPageId)) {
              setCurrentPageId(prog.lastPageId);
              return;
            }
          }
        }

        // 첫 페이지로
        if (pgs.length > 0) setCurrentPageId(pgs[0].id);
      } catch (err) {
        console.error("[guide-viewer] load failed", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [slug, user]);

  // 페이지 이동 + 진행 적립
  const goToPage = useCallback(
    (page: GuidePage) => {
      setCurrentPageId(page.id);
      setTocOpen(false);

      if (!user) return;

      // 읽음 표시 적립
      if (!progressSavedRef.current.has(page.id)) {
        progressSavedRef.current.add(page.id);
        setProgress((prev) => ({
          userId: user.id,
          guideId: guide?.id ?? "",
          readPageIds: [...(prev?.readPageIds ?? []), page.id],
          lastPageId: page.id,
          updatedAt: new Date().toISOString(),
        }));
        if (guide) {
          void guideProgressApi.markRead(guide.id, page.id);
          void guideProgressApi.updateLastPage(guide.id, page.id);
        }
      } else {
        // 이미 읽은 페이지도 lastPageId 갱신
        if (guide) void guideProgressApi.updateLastPage(guide.id, page.id);
      }
    },
    [user, guide],
  );

  // 키보드 단축키
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" && prevPage) { e.preventDefault(); goToPage(prevPage); }
      if (e.key === "ArrowRight" && nextPage) { e.preventDefault(); goToPage(nextPage); }
      if ((e.key === "t" || e.key === "T") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setTocOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevPage, nextPage, goToPage]);

  // ── 초기 페이지 로드 시 currentPage가 설정되면 progress 저장 ─────────────────
  useEffect(() => {
    if (!currentPage || !user || !guide) return;
    if (progressSavedRef.current.has(currentPage.id)) return;
    progressSavedRef.current.add(currentPage.id);
    setProgress((prev) => ({
      userId: user.id,
      guideId: guide.id,
      readPageIds: [...(prev?.readPageIds ?? []), currentPage.id],
      lastPageId: currentPage.id,
      updatedAt: new Date().toISOString(),
    }));
    void guideProgressApi.markRead(guide.id, currentPage.id);
    void guideProgressApi.updateLastPage(guide.id, currentPage.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage?.id]);

  // ── 렌더 ──────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="mb-4 h-8 w-48" />
        <div className="flex gap-8">
          <Skeleton className="hidden h-96 w-48 shrink-0 rounded-xl lg:block" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (notFound || !guide) {
    return (
      <PageContainer width="narrow">
        <div className="py-16 text-center">
          <p className="text-muted-foreground">가이드를 찾을 수 없습니다.</p>
          <Link href="/learning-guides">
            <Button variant="outline" className="mt-4">가이드 목록으로</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const readCount = readPageIds.size;
  const progressPct = totalPages > 0 ? Math.round((readCount / totalPages) * 100) : 0;

  const currentChapter = currentPage
    ? chapters.find((c) => c.id === currentPage.chapterId) ?? null
    : null;

  return (
    <PageContainer width="wide" className="!py-4 sm:!py-6">
      {/* 상단 바 */}
      <div className="mb-5 flex items-center gap-2">
        <Link href="/learning-guides" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ChevronLeft size={13} /> 러닝 가이드
        </Link>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-xs text-foreground font-medium truncate max-w-[200px]">{guide.title}</span>
      </div>

      <div className="flex gap-6 lg:gap-10">
        {/* 목차 사이드바 (데스크톱) */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">목차</p>
            <TocSidebar
              chapters={chapters}
              pages={pages}
              currentPageId={currentPageId}
              readPageIds={readPageIds}
              onPageSelect={goToPage}
            />
          </div>
        </aside>

        {/* 모바일 목차 바텀시트 */}
        {tocOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setTocOpen(false)}
              onKeyDown={(e) => e.key === "Escape" && setTocOpen(false)}
              role="button"
              tabIndex={-1}
              aria-label="목차 닫기"
            />
            <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-card p-4 shadow-xl">
              <TocSidebar
                chapters={chapters}
                pages={pages}
                currentPageId={currentPageId}
                readPageIds={readPageIds}
                onPageSelect={goToPage}
                onClose={() => setTocOpen(false)}
              />
            </div>
          </div>
        )}

        {/* 본문 */}
        <main className="min-w-0 max-w-2xl flex-1">
          {/* ── 편집형 마스트헤드 ── */}
          <header className="mb-6 border-b pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              연세교육공학 · 러닝 가이드
            </p>
            <div className="mt-2.5 flex items-start gap-3">
              <span className="text-3xl leading-none" role="img" aria-hidden>{guide.coverEmoji ?? "📖"}</span>
              <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground text-balance sm:text-3xl">
                {guide.title}
              </h1>
            </div>
            {guide.subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guide.subtitle}</p>
            )}
            {totalPages > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {readCount}/{totalPages} · {progressPct}%
                </span>
              </div>
            )}
          </header>

          {/* 현재 페이지 */}
          {currentPage ? (
            <article>
              <div className="mb-5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {currentChapter && (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                      {currentChapter.title}
                    </p>
                  )}
                  <h2 className="mt-1 font-display text-xl font-semibold leading-snug tracking-tight text-foreground text-balance sm:text-2xl">
                    {currentPage.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setTocOpen(true)}
                  className="flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs text-muted-foreground hover:text-foreground lg:hidden"
                  aria-label="목차 열기"
                >
                  <List size={13} /> 목차
                </button>
              </div>

              {currentPage.pageType === "native" ? (
                <SimpleMarkdown
                  body={currentPage.body ?? ""}
                  className="text-[15px] leading-7"
                />
              ) : (
                <EmbedRenderer page={currentPage} />
              )}
            </article>
          ) : pages.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card p-8 text-center text-muted-foreground text-sm">
              아직 페이지가 없습니다.
            </div>
          ) : null}

          {/* 이전/다음 내비게이션 */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => prevPage && goToPage(prevPage)}
              disabled={!prevPage}
              className="flex items-center gap-1"
            >
              <ChevronLeft size={14} /> 이전
            </Button>

            {currentIndex >= 0 && (
              <span className="text-xs text-muted-foreground">
                {currentIndex + 1} / {totalPages}
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => nextPage && goToPage(nextPage)}
              disabled={!nextPage}
              className="flex items-center gap-1"
            >
              다음 <ChevronRight size={14} />
            </Button>
          </div>

          {/* 키보드 힌트 */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/50">
            <Keyboard size={10} />
            <span>← → 이동</span>
            <span className="mx-1 opacity-40">·</span>
            <span>T 목차</span>
          </div>

          {/* 완료 시 서재로 돌아가기 */}
          {nextPage === null && totalPages > 0 && (
            <div className="mt-6 rounded-xl border bg-success/5 p-4 text-center">
              <p className="text-sm font-medium text-success">가이드를 모두 읽었습니다!</p>
              <Link href="/learning-guides">
                <Button variant="outline" size="sm" className="mt-2">
                  <BookOpen size={13} className="mr-1" /> 서재로 돌아가기
                </Button>
              </Link>
            </div>
          )}
        </main>
      </div>
    </PageContainer>
  );
}
