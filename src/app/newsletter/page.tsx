"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/page-header";
import {
  useNewsletters,
  SECTION_TYPE_LABELS,
  SECTION_TYPE_STYLES,
} from "@/features/newsletter/newsletter-store";
import type { NewsletterIssue } from "@/features/newsletter/newsletter-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import {
  Newspaper,
  ChevronRight,
  PenSquare,
  BookOpen,
  CalendarDays,
  Layers,
  Star,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { cn } from "@/lib/utils";

// ── 카드 컴포넌트 ─────────────────────────────────────────────────────────────

interface IssueCardProps {
  issue: NewsletterIssue;
  isLatest?: boolean;
}

function IssueCard({ issue, isLatest = false }: IssueCardProps) {
  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        isLatest && "border-primary/30 ring-1 ring-primary/20",
      )}
    >
      {/* 표지 */}
      <div
        className={cn(
          "relative flex h-48 flex-col justify-end bg-gradient-to-br p-5 text-white",
          issue.coverColor,
        )}
      >
        {/* 최신호 배지 */}
        {isLatest && (
          <span
            aria-label="최신호"
            className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm"
          >
            <Star size={9} className="fill-white" aria-hidden />
            최신호
          </span>
        )}

        <p className="text-[11px] font-semibold uppercase tracking-widest opacity-75">
          vol.&nbsp;{issue.issueNumber}
        </p>
        <h3 className="mt-1 text-lg font-bold leading-snug">{issue.title}</h3>
        {issue.subtitle && (
          <p className="mt-0.5 line-clamp-1 text-sm opacity-85">{issue.subtitle}</p>
        )}
      </div>

      {/* 목차 미리보기 */}
      <div className="p-5">
        <div className="space-y-2">
          {issue.sections
            .sort((a, b) => a.order - b.order)
            .slice(0, 3)
            .map((section) => (
              <div key={section.id} className="flex items-center gap-2 text-sm">
                <Badge
                  variant="outline"
                  className={cn("shrink-0 text-[10px]", SECTION_TYPE_STYLES[section.type])}
                >
                  {SECTION_TYPE_LABELS[section.type]}
                </Badge>
                <span className="truncate text-muted-foreground">{section.title}</span>
              </div>
            ))}
          {issue.sections.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{issue.sections.length - 3}개 더
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {issue.publishDate}
            {issue.editorName && ` · ${issue.editorName}`}
          </span>
          <ChevronRight
            size={15}
            aria-hidden
            className="text-muted-foreground transition-transform group-hover:translate-x-1"
          />
        </div>
      </div>
    </article>
  );
}

// ── 스켈레톤 ──────────────────────────────────────────────────────────────────

function IssueGridSkeleton() {
  return (
    <div
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="학회보 불러오는 중"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="space-y-2.5 p-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="mt-3 flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 페이지 ────────────────────────────────────────────────────────────────────

export default function NewsletterPage() {
  const { issues, isLoading } = useNewsletters();
  const { user } = useAuthStore();
  const canEdit = isAtLeast(user, "staff");

  const publishedIssues = issues.filter((i) => i.status === "published");

  // 최신호 (issueNumber 기준 최대값)
  const latestIssueId =
    publishedIssues.length > 0
      ? publishedIssues.reduce((a, b) =>
          a.issueNumber > b.issueNumber ? a : b,
        ).id
      : null;

  // 발행 통계
  const totalIssues = publishedIssues.length;
  const years = new Set(
    publishedIssues
      .map((i) => i.publishDate?.slice(0, 4))
      .filter(Boolean) as string[],
  );
  const sectionsSum = publishedIssues.reduce(
    (acc, i) => acc + i.sections.length,
    0,
  );
  const latestDate =
    publishedIssues.length > 0
      ? [...publishedIssues].sort((a, b) =>
          (b.publishDate ?? "").localeCompare(a.publishDate ?? ""),
        )[0].publishDate ?? "—"
      : "—";

  const statCards = [
    { label: "총 발행 호수", value: totalIssues > 0 ? `${totalIssues}호` : "—", icon: BookOpen },
    { label: "발행 연도", value: years.size > 0 ? `${years.size}년` : "—", icon: CalendarDays },
    { label: "누적 섹션", value: sectionsSum > 0 ? `${sectionsSum}편` : "—", icon: Layers },
    { label: "최신 발행일", value: latestDate, icon: Newspaper },
  ] as const;

  // 연도별 아카이브 빌드
  const byYear = new Map<string, NewsletterIssue[]>();
  for (const issue of publishedIssues) {
    const year = issue.publishDate?.slice(0, 4) || "기타";
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(issue);
  }
  const sortedYears = [...byYear.keys()].sort((a, b) => b.localeCompare(a));

  const editAction = canEdit ? (
    <Link href="/newsletter/edit">
      <Button size="sm" className="shrink-0">
        <PenSquare size={15} className="mr-1.5" aria-hidden />
        학회보 편집
      </Button>
    </Link>
  ) : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-6xl px-4">

        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={Newspaper}
          title="연세교육공학회보"
          description="연세교육공학회의 학술 활동과 소식을 담은 정기 간행물입니다."
          actions={editAction}
        />

        <Separator className="mt-6" />

        {/* ── 본문 ── */}
        {isLoading ? (
          <div className="mt-8">
            {/* 통계 스켈레톤 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border bg-card p-4">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="mt-2 h-6 w-16" />
                  <Skeleton className="mt-1 h-3 w-20" />
                </div>
              ))}
            </div>
            <div className="mt-8">
              <IssueGridSkeleton />
            </div>
          </div>
        ) : publishedIssues.length === 0 ? (
          <div className="mt-12">
            <EmptyState
              icon={Newspaper}
              title="아직 발행된 학회보가 없습니다"
              description="새 호가 발행되면 이곳에서 만나보실 수 있습니다."
            />
          </div>
        ) : (
          <>
            {/* ── 통계 카드 ── */}
            <div
              className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
              aria-label="학회보 발행 현황"
            >
              {statCards.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <Icon
                    size={18}
                    className="text-primary/70"
                    aria-hidden
                  />
                  <div>
                    <div className="text-xl font-bold tabular-nums leading-none">
                      {value}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── 연도별 아카이브 ── */}
            <div className="mt-10 space-y-12">
              {sortedYears.map((year, yearIdx) => {
                const yearIssues = byYear
                  .get(year)!
                  .sort((a, b) => b.issueNumber - a.issueNumber);

                return (
                  <section
                    key={year}
                    aria-label={`${year}년 발행 학회보`}
                    className={cn(
                      "animate-in fade-in slide-in-from-bottom-2",
                      yearIdx === 0 ? "duration-300" : "duration-500",
                    )}
                  >
                    {/* 연도 헤더 */}
                    <div className="flex items-baseline gap-3 border-b pb-3">
                      <h2 className="text-xl font-bold tracking-tight">{year}년</h2>
                      <span className="text-sm text-muted-foreground">
                        {yearIssues.length}호 발행
                      </span>
                    </div>

                    {/* 카드 그리드 */}
                    <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {yearIssues.map((issue) => (
                        <Link
                          key={issue.id}
                          href={`/newsletter/${issue.id}`}
                          className="block rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                          aria-label={`${issue.title} — vol. ${issue.issueNumber} 자세히 보기`}
                        >
                          <IssueCard
                            issue={issue}
                            isLatest={issue.id === latestIssueId}
                          />
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
