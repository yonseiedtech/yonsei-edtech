"use client";

import { use } from "react";
import Link from "next/link";
import { useNewsletters, SECTION_TYPE_LABELS } from "@/features/newsletter/newsletter-store";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewsletterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { issues, isLoading } = useNewsletters();
  const issue = issues.find((i) => i.id === id);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">학회보를 찾을 수 없습니다.</p>
        <Link
          href="/newsletter"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft size={16} />
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <Link
          href="/newsletter"
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          목록으로
        </Link>

        {/* 표지 */}
        <div
          className={cn(
            "relative flex min-h-[280px] flex-col justify-end rounded-2xl bg-gradient-to-br p-8 text-white md:min-h-[340px]",
            issue.coverColor,
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
    </div>
  );
}
