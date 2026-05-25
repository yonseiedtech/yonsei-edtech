"use client";

import { use } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import BackButton from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { useIssue, useArticlesByIssue } from "@/features/journal/api/useJournal";
import { PublicationTypeBadge } from "@/features/journal/components/JournalArticleStatusBadge";
import { formatIssueCode } from "@/features/journal/lib/article-status";

interface PageProps {
  params: Promise<{ issueId: string }>;
}

export default function JournalIssuePage({ params }: PageProps) {
  const { issueId } = use(params);
  const { data: issue, isLoading } = useIssue(issueId);
  const { data: articles = [] } = useArticlesByIssue(issueId);

  if (isLoading) {
    return (
      <PageContainer>
        <p className="py-12 text-center text-sm text-zinc-500">불러오는 중...</p>
      </PageContainer>
    );
  }

  if (!issue) {
    return (
      <PageContainer>
        <BackButton href="/journal" label="연구지 목록" />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="text-red-500" />
            <p className="text-sm">호수를 찾을 수 없습니다.</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackButton href="/journal" label="연구지 목록" />

      <header className="mb-6 space-y-2">
        <p className="text-sm text-zinc-500">
          {issue.year}
          {issue.season ? ` · ${issue.season}` : ""}
        </p>
        <h1 className="text-3xl font-bold">
          {issue.title ?? `연세 교육공학 연구 ${formatIssueCode(issue.volume, issue.number)}`}
        </h1>
        <p className="text-sm text-zinc-600">
          {formatIssueCode(issue.volume, issue.number)} · {articles.length}편 수록
        </p>
      </header>

      {issue.introMarkdown && (
        <Card className="mb-6 border-violet-200 bg-violet-50">
          <CardContent className="p-5">
            <p className="mb-2 text-xs font-semibold text-violet-800">편집장의 글</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-violet-900">
              {issue.introMarkdown}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {articles.map((a, idx) => (
          <Link key={a.id} href={`/journal/articles/${a.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">{idx + 1}.</span>
                  <PublicationTypeBadge type={a.publicationType} size="sm" />
                  {a.pageStart && a.pageEnd && (
                    <span className="text-xs text-zinc-500">
                      pp. {a.pageStart}-{a.pageEnd}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold">{a.titleKo}</h3>
                <p className="text-xs text-zinc-600">
                  {a.authors.map((au) => au.displayName).join(", ")}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {articles.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-500">
            이 호수에는 아직 수록된 논문이 없습니다.
          </p>
        )}
      </div>
    </PageContainer>
  );
}
