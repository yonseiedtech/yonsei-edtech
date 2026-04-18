"use client";

import Link from "next/link";
import LoadingSpinner from "@/components/ui/loading-spinner";
import {
  useNewsletters,
  SECTION_TYPE_LABELS,
  SECTION_TYPE_STYLES,
} from "@/features/newsletter/newsletter-store";
import type { NewsletterIssue } from "@/features/newsletter/newsletter-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, ChevronRight, PenSquare } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function IssueCard({ issue }: { issue: NewsletterIssue }) {
  return (
    <div className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* 표지 */}
      <div
        className={cn(
          "relative flex h-48 flex-col justify-end bg-gradient-to-br p-6 text-white",
          issue.coverColor
        )}
      >
        <p className="text-xs font-medium uppercase tracking-widest opacity-80">
          vol. {issue.issueNumber}
        </p>
        <h3 className="mt-1 text-xl font-bold leading-snug">{issue.title}</h3>
        <p className="mt-1 text-sm opacity-90">{issue.subtitle}</p>
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
                <span className="truncate text-muted-foreground">
                  {section.title}
                </span>
              </div>
            ))}
          {issue.sections.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{issue.sections.length - 3}개 더...
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {issue.publishDate} · {issue.editorName}
          </span>
          <ChevronRight
            size={16}
            className="text-muted-foreground transition-transform group-hover:translate-x-1"
          />
        </div>
      </div>
    </div>
  );
}

export default function NewsletterPage() {
  const { issues, isLoading } = useNewsletters();
  const { user } = useAuthStore();
  const canEdit = isAtLeast(user, "staff");

  const publishedIssues = issues.filter((i) => i.status === "published");

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Newspaper size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">연세교육공학회보</h1>
              <p className="text-sm text-muted-foreground">
                연세교육공학회의 학술 활동과 소식을 담은 정기 간행물입니다.
              </p>
            </div>
          </div>
          {canEdit && (
            <Link href="/newsletter/edit">
              <Button size="sm">
                <PenSquare size={16} className="mr-1" />
                학회보 편집
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <LoadingSpinner className="mt-12" />
        ) : publishedIssues.length === 0 ? (
          <div className="mt-12 text-center text-muted-foreground">
            아직 발행된 학회보가 없습니다.
          </div>
        ) : (
          <>
            {/* 전체 발행 현황 */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(() => {
                const total = publishedIssues.length;
                const latest = [...publishedIssues].sort((a, b) =>
                  (b.publishDate ?? "").localeCompare(a.publishDate ?? "")
                )[0];
                const years = new Set(
                  publishedIssues
                    .map((i) => i.publishDate?.slice(0, 4))
                    .filter(Boolean) as string[]
                );
                const sectionsSum = publishedIssues.reduce(
                  (acc, i) => acc + i.sections.length,
                  0
                );
                const stats = [
                  { label: "총 발행 호수", value: String(total) },
                  { label: "발행 연도", value: String(years.size) },
                  { label: "누적 섹션", value: String(sectionsSum) },
                  { label: "최신 발행일", value: latest?.publishDate ?? "—" },
                ];
                return stats.map((s) => (
                  <div key={s.label} className="rounded-2xl border bg-white p-4">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="mt-1 text-lg font-bold">{s.value}</div>
                  </div>
                ));
              })()}
            </div>

            {/* 연도별 아카이브 */}
            {(() => {
              const byYear = new Map<string, NewsletterIssue[]>();
              for (const issue of publishedIssues) {
                const year = issue.publishDate?.slice(0, 4) || "기타";
                if (!byYear.has(year)) byYear.set(year, []);
                byYear.get(year)!.push(issue);
              }
              const years = [...byYear.keys()].sort((a, b) => b.localeCompare(a));
              return (
                <div className="mt-10 space-y-10">
                  {years.map((year) => {
                    const yearIssues = byYear
                      .get(year)!
                      .sort((a, b) => b.issueNumber - a.issueNumber);
                    return (
                      <section key={year}>
                        <div className="flex items-baseline gap-3 border-b pb-2">
                          <h2 className="text-xl font-bold">{year}년</h2>
                          <span className="text-sm text-muted-foreground">
                            {yearIssues.length}호 발행
                          </span>
                        </div>
                        <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {yearIssues.map((issue) => (
                            <Link
                              key={issue.id}
                              href={`/newsletter/${issue.id}`}
                              className="text-left"
                            >
                              <IssueCard issue={issue} />
                            </Link>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
