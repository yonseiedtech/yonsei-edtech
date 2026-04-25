"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useNewsletters,
  SECTION_TYPE_LABELS,
  AUTHOR_TYPE_LABELS,
  SECTION_TYPE_STYLES,
  AUTHOR_TYPE_STYLES,
} from "@/features/newsletter/newsletter-store";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewsletterMagazinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { issues, isLoading } = useNewsletters();
  const issue = issues.find((i) => i.id === id);

  const sortedSections = useMemo(
    () => (issue ? [...issue.sections].sort((a, b) => a.order - b.order) : []),
    [issue]
  );

  // PC: 2면 1페이지. 표지(0)는 단독 1페이지로 카운트.
  // pageIndex = 0 → 표지 단독, 1 → 섹션 0,1 → 2 → 섹션 2,3 …
  const totalPages = useMemo(() => 1 + Math.ceil(sortedSections.length / 2), [sortedSections.length]);
  const [pageIndex, setPageIndex] = useState(0);
  const [activeMobileId, setActiveMobileId] = useState<string>("mag-cover");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setPageIndex((p) => Math.min(totalPages - 1, p + 1));
      if (e.key === "ArrowLeft") setPageIndex((p) => Math.max(0, p - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totalPages]);

  useEffect(() => {
    if (typeof window === "undefined" || !sortedSections.length) return;
    const ids = ["mag-cover", ...sortedSections.map((_, i) => `mag-section-${i}`)];
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveMobileId(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sortedSections]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-10" aria-busy="true" aria-label="매거진 불러오는 중">
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[60vh] w-full rounded-xl" />
            <Skeleton className="h-[60vh] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }
  if (!issue) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">학회보를 찾을 수 없습니다.</p>
        <Link href="/newsletter" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft size={16} /> 목록으로
        </Link>
      </div>
    );
  }

  const leftSection = pageIndex === 0 ? null : sortedSections[(pageIndex - 1) * 2];
  const rightSection = pageIndex === 0 ? null : sortedSections[(pageIndex - 1) * 2 + 1];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 상단 바 */}
      <div className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
          <Link
            href={`/newsletter/${issue.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} /> <span className="hidden sm:inline">상세 보기</span>
          </Link>
          <div className="text-xs text-muted-foreground sm:text-sm">
            <span className="font-semibold text-foreground">vol. {issue.issueNumber}</span>
            <span className="mx-2">·</span>
            <span>{issue.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/newsletter/${issue.id}`}
              className="hidden items-center gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs hover:bg-muted sm:inline-flex"
            >
              <Eye size={14} /> 일반 보기
            </Link>
            {issue.status === "published" && (
              <a
                href={`/api/newsletter/${issue.id}/pdf`}
                className="inline-flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs hover:bg-muted"
              >
                <Download size={14} /> <span className="hidden sm:inline">PDF</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 lg:py-12">
        {/* 사이드바 (PC) */}
        <aside className="sticky top-20 hidden h-[calc(100vh-7rem)] w-64 shrink-0 overflow-y-auto rounded-xl border bg-white p-4 lg:block">
          <p className="mb-3 text-xs font-semibold text-muted-foreground">섹션</p>
          <button
            type="button"
            onClick={() => setPageIndex(0)}
            className={cn(
              "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
              pageIndex === 0 ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"
            )}
          >
            표지
          </button>
          <div className="mt-1 space-y-1">
            {sortedSections.map((s, i) => {
              const targetPage = 1 + Math.floor(i / 2);
              const isActive = targetPage === pageIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPageIndex(targetPage)}
                  className={cn(
                    "block w-full rounded-md px-3 py-2 text-left text-xs transition-colors",
                    isActive ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"
                  )}
                >
                  <span className="mr-1.5 text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </button>
              );
            })}
          </div>
        </aside>

        {/* 매거진 본문 */}
        <main className="flex-1">
          {/* 모바일: sticky 섹션 인덱스 + 전체 섹션 단일 칼럼 */}
          <div className="lg:hidden">
            {/* 가로 스크롤 sticky 섹션 chip 네비게이션 */}
            <nav
              aria-label="섹션 바로가기"
              className="sticky top-[52px] z-10 -mx-4 mb-4 border-b bg-slate-50/95 px-4 py-2 backdrop-blur"
            >
              <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <a
                  href="#mag-cover"
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                    activeMobileId === "mag-cover"
                      ? "border-primary bg-primary/10 text-primary"
                      : "bg-white text-muted-foreground hover:bg-muted"
                  )}
                >
                  표지
                </a>
                {sortedSections.map((s, i) => {
                  const id = `mag-section-${i}`;
                  const isActive = activeMobileId === id;
                  return (
                    <a
                      key={s.id}
                      href={`#${id}`}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "bg-white text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "mr-1 text-[10px] tabular-nums",
                          isActive ? "text-primary" : "text-primary/70"
                        )}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {s.title}
                    </a>
                  );
                })}
              </div>
            </nav>

            <div id="mag-cover" className="space-y-6 scroll-mt-28">
              <CoverCard issue={issue} />
            </div>
            <div className="mt-6 space-y-6">
              {sortedSections.map((section, idx) => (
                <div key={section.id} id={`mag-section-${idx}`} className="scroll-mt-28">
                  <SectionCard section={section} index={idx} total={sortedSections.length} />
                </div>
              ))}
            </div>
          </div>

          {/* PC: 2면 펼침 */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-2 gap-6">
              {pageIndex === 0 ? (
                <>
                  <div className="col-span-2">
                    <CoverCard issue={issue} large />
                  </div>
                </>
              ) : (
                <>
                  {leftSection ? (
                    <SectionCard
                      section={leftSection}
                      index={(pageIndex - 1) * 2}
                      total={sortedSections.length}
                      tall
                    />
                  ) : (
                    <BlankPage />
                  )}
                  {rightSection ? (
                    <SectionCard
                      section={rightSection}
                      index={(pageIndex - 1) * 2 + 1}
                      total={sortedSections.length}
                      tall
                    />
                  ) : (
                    <BlankPage />
                  )}
                </>
              )}
            </div>

            {/* 페이지 네비 */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
                className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft size={16} /> 이전
              </button>
              <span className="text-sm tabular-nums text-muted-foreground">
                {pageIndex + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                disabled={pageIndex >= totalPages - 1}
                className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-muted disabled:opacity-40"
              >
                다음 <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function CoverCard({
  issue,
  large = false,
}: {
  issue: { issueNumber: number; title: string; subtitle: string; publishDate: string; editorName: string; coverColor?: string };
  large?: boolean;
}) {
  const grad = issue.coverColor || "from-violet-600 to-indigo-700";
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl shadow-md",
        large ? "h-[60vh] min-h-[420px]" : "h-56"
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", grad)} />
      <div className="relative flex h-full flex-col justify-end p-6 text-white sm:p-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] opacity-80">
          연세교육공학회보 · vol. {issue.issueNumber}
        </p>
        <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-4xl md:text-5xl">{issue.title}</h1>
        {issue.subtitle && <p className="mt-2 text-sm opacity-90 sm:text-base">{issue.subtitle}</p>}
        <p className="mt-6 text-xs opacity-80 sm:text-sm">
          {issue.publishDate}
          {issue.editorName ? ` · 편집 ${issue.editorName}` : ""}
        </p>
      </div>
    </div>
  );
}

function SectionCard({
  section,
  index,
  total,
  tall = false,
}: {
  section: {
    id: string;
    title: string;
    content: string;
    authorName: string;
    authorType?: string;
    authorEnrollment?: string;
    type: "feature" | "interview" | "review" | "column" | "news";
  };
  index: number;
  total: number;
  tall?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border bg-white p-6 shadow-sm sm:p-8",
        tall && "flex h-[70vh] min-h-[480px] flex-col"
      )}
    >
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn(SECTION_TYPE_STYLES[section.type])}>
          {SECTION_TYPE_LABELS[section.type]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {index + 1} / {total}
        </span>
      </div>
      <h2 className="mt-3 text-xl font-bold sm:text-2xl">{section.title}</h2>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <span>글 {section.authorName}</span>
        {section.authorType && (
          <Badge variant="outline" className={cn("text-[10px]", AUTHOR_TYPE_STYLES[section.authorType])}>
            {AUTHOR_TYPE_LABELS[section.authorType] ?? section.authorType}
          </Badge>
        )}
        {section.authorEnrollment && (
          <Badge variant="outline" className="text-[10px]">
            {section.authorEnrollment} 입학
          </Badge>
        )}
      </div>
      <div
        className={cn(
          "mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90",
          tall && "flex-1 overflow-y-auto pr-1"
        )}
      >
        {section.content}
      </div>
    </article>
  );
}

function BlankPage() {
  return (
    <div className="flex h-[70vh] min-h-[480px] items-center justify-center rounded-2xl border-2 border-dashed bg-white/40 text-xs text-muted-foreground">
      마지막 페이지입니다
    </div>
  );
}
