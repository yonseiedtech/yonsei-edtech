"use client";

import { useState } from "react";
import Link from "next/link";
import { useNewsletters, SECTION_TYPE_LABELS } from "@/features/newsletter/newsletter-store";
import type { NewsletterIssue } from "@/features/newsletter/newsletter-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, ArrowLeft, ChevronRight, PenSquare } from "lucide-react";
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
                <Badge variant="secondary" className="shrink-0 text-[10px]">
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

function IssueDetail({ issue, onBack }: { issue: NewsletterIssue; onBack: () => void }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        목록으로
      </button>

      {/* 표지 */}
      <div
        className={cn(
          "relative flex min-h-[280px] flex-col justify-end rounded-2xl bg-gradient-to-br p-8 text-white md:min-h-[340px]",
          issue.coverColor
        )}
      >
        <p className="text-sm font-medium uppercase tracking-widest opacity-70">
          연세교육공학회보
        </p>
        <p className="mt-1 text-xs opacity-60">vol. {issue.issueNumber}</p>
        <h1 className="mt-4 text-3xl font-bold md:text-4xl">{issue.subtitle}</h1>
        <p className="mt-3 text-sm opacity-80">
          {issue.publishDate} · 편집 {issue.editorName}
        </p>
      </div>

      {/* 목차 */}
      <div className="mt-8 rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-bold">목차</h2>
        <div className="mt-4 divide-y">
          {issue.sections
            .sort((a, b) => a.order - b.order)
            .map((section, idx) => (
              <a
                key={section.id}
                href={`#section-${section.id}`}
                className="flex items-center gap-3 py-3 transition-colors hover:text-primary"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {SECTION_TYPE_LABELS[section.type]}
                    </Badge>
                    <span className="truncate font-medium">{section.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{section.authorName}</p>
                </div>
              </a>
            ))}
        </div>
      </div>

      {/* 본문 섹션 */}
      {issue.sections
        .sort((a, b) => a.order - b.order)
        .map((section, idx) => (
          <article
            key={section.id}
            id={`section-${section.id}`}
            className="mt-8 rounded-2xl border bg-white p-8"
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{SECTION_TYPE_LABELS[section.type]}</Badge>
              <span className="text-sm text-muted-foreground">
                {idx + 1}/{issue.sections.length}
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-bold">{section.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">글 {section.authorName}</p>
            <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {section.content}
            </div>
          </article>
        ))}
    </div>
  );
}

export default function NewsletterPage() {
  const { issues, isLoading } = useNewsletters();
  const { user } = useAuthStore();
  const canEdit = isAtLeast(user, "staff");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const publishedIssues = issues.filter((i) => i.status === "published");
  const selectedIssue = issues.find((i) => i.id === selectedId);

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        {selectedIssue ? (
          <IssueDetail issue={selectedIssue} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Newspaper size={28} className="text-violet-600" />
                <h1 className="text-3xl font-bold">연세교육공학회보</h1>
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
            <p className="mt-2 text-muted-foreground">
              연세교육공학회의 학술 활동과 소식을 담은 정기 간행물입니다.
            </p>

            {isLoading ? (
              <div className="mt-12 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : publishedIssues.length === 0 ? (
              <div className="mt-12 text-center text-muted-foreground">
                아직 발행된 학회보가 없습니다.
              </div>
            ) : (
              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {publishedIssues.map((issue) => (
                  <button
                    key={issue.id}
                    onClick={() => setSelectedId(issue.id)}
                    className="text-left"
                  >
                    <IssueCard issue={issue} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
