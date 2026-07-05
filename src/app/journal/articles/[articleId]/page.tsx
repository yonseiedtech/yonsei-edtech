"use client";

import { use } from "react";
import { AlertCircle } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import PageContainer from "@/components/ui/page-container";
import BackButton from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { useArticle, useIssue } from "@/features/journal/api/useJournal";
import JournalArticleView from "@/features/journal/components/JournalArticleView";

interface PageProps {
  params: Promise<{ articleId: string }>;
}

export default function JournalArticlePage({ params }: PageProps) {
  const { articleId } = use(params);
  const { user } = useAuthStore();
  const { data: article, isLoading } = useArticle(articleId);
  const { data: issue } = useIssue(article?.issueId);

  if (isLoading) {
    return (
      <PageContainer>
        <p className="py-12 text-center text-sm text-zinc-500">불러오는 중...</p>
      </PageContainer>
    );
  }

  if (!article) {
    return (
      <PageContainer>
        <BackButton href="/journal" label="연구지 목록" />
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="text-red-500" />
            <p className="text-sm">논문을 찾을 수 없습니다 (열람 권한 없음 또는 미발간).</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackButton href="/journal" label="연구지 목록" />
      <JournalArticleView
        article={article}
        issue={issue ?? undefined}
        isAuthenticated={!!user?.id}
        currentUserId={user?.id}
      />
    </PageContainer>
  );
}
