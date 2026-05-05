"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  useNewsletters,
  SECTION_TYPE_LABELS,
  AUTHOR_TYPE_LABELS,
  SECTION_TYPE_STYLES,
  AUTHOR_TYPE_STYLES,
} from "@/features/newsletter/newsletter-store";
import type { NewsletterIssue } from "@/features/newsletter/newsletter-store";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

async function downloadIssuePdf(issue: NewsletterIssue) {
  // SSR 안전: react-pdf와 PDF 컴포넌트는 클라이언트에서만 dynamic import
  const [{ pdf }, { NewsletterPdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/features/newsletter/NewsletterPdfDocument"),
  ]);
  const blob = await pdf(<NewsletterPdfDocument issue={issue} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `연세교육공학회보_vol.${issue.issueNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function NewsletterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { issues, isLoading } = useNewsletters();
  const issue = issues.find((i) => i.id === id);
  const [pdfBusy, setPdfBusy] = useState(false);

  if (isLoading) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-5xl px-4" aria-busy="true" aria-label="학회보 불러오는 중">
          <div className="mb-6 flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-28 rounded-lg" />
          </div>
          <div className="rounded-2xl border bg-card p-8 shadow-sm">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/2" />
            <div className="mt-8 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-10/12" />
              <Skeleton className="h-4 w-9/12" />
            </div>
          </div>
        </div>
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
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/newsletter"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            목록으로
          </Link>
          {issue.status === "published" && (
            <div className="flex items-center gap-2">
              <Link
                href={`/newsletter/${issue.id}/magazine`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <BookOpen size={14} />
                매거진으로 보기
              </Link>
              <button
                type="button"
                disabled={pdfBusy}
                onClick={async () => {
                  setPdfBusy(true);
                  try {
                    await downloadIssuePdf(issue);
                  } catch (err) {
                    console.error("[newsletter] PDF download failed", err);
                    toast.error("PDF 생성에 실패했습니다.");
                  } finally {
                    setPdfBusy(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pdfBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {pdfBusy ? "PDF 생성 중..." : "PDF 다운로드"}
              </button>
            </div>
          )}
        </div>

        {/* 표지 */}
        <div className="relative h-48 w-full overflow-hidden rounded-2xl sm:h-64">
          <img
            src="/yonsei-campus.jpg"
            alt={issue.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-8">
            <p className="text-xs font-medium uppercase tracking-widest opacity-80">
              연세교육공학회보 · vol. {issue.issueNumber}
            </p>
            <h1
              className="mt-2 text-2xl font-bold leading-tight sm:text-3xl md:text-4xl"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
            >
              {issue.subtitle}
            </h1>
            <p className="mt-2 text-xs opacity-90 sm:text-sm">
              {issue.publishDate} · 편집 {issue.editorName}
            </p>
          </div>
        </div>

        {/* 목차 */}
        <div className="mt-8 rounded-2xl border bg-card p-6">
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
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", SECTION_TYPE_STYLES[section.type])}
                      >
                        {SECTION_TYPE_LABELS[section.type]}
                      </Badge>
                      <span className="truncate font-medium">{section.title}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <span>{section.authorName}</span>
                      {section.authorType && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            AUTHOR_TYPE_STYLES[section.authorType]
                          )}
                        >
                          {AUTHOR_TYPE_LABELS[section.authorType] ?? section.authorType}
                        </Badge>
                      )}
                      {section.authorEnrollment && (
                        <Badge variant="outline" className="text-[10px]">
                          {section.authorEnrollment} 입학
                        </Badge>
                      )}
                    </div>
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
              className="mt-8 rounded-2xl border bg-card p-8"
            >
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(SECTION_TYPE_STYLES[section.type])}
                >
                  {SECTION_TYPE_LABELS[section.type]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {idx + 1}/{issue.sections.length}
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-bold">{section.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <span>글 {section.authorName}</span>
                {section.authorType && (
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", AUTHOR_TYPE_STYLES[section.authorType])}
                  >
                    {AUTHOR_TYPE_LABELS[section.authorType] ?? section.authorType}
                  </Badge>
                )}
                {section.authorEnrollment && (
                  <Badge variant="outline" className="text-[10px]">
                    {section.authorEnrollment} 입학
                  </Badge>
                )}
              </div>
              <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {section.content}
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}
