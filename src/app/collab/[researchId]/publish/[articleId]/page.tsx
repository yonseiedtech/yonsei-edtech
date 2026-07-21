"use client";

import { use, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Send,
  CheckCircle2,
  Trash2,
  Eye,
  Globe,
} from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageContainer from "@/components/ui/page-container";
import BackButton from "@/components/ui/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { profilesApi } from "@/lib/bkend";
import {
  useArticle,
  useUpdateArticleAuthors,
  useSubmitArticle,
  usePublishArticle,
  useStartReview,
  useRequestRevision,
  useAcceptArticle,
  useWithdrawArticle,
  useDeleteArticle,
} from "@/features/journal/api/useJournal";
import { useCollabResearch, useCollabMembers } from "@/features/collaborative-research/api/useCollabResearch";
import {
  ReviewStatusBadge,
  VisibilityBadge,
  PublicationTypeBadge,
} from "@/features/journal/components/JournalArticleStatusBadge";
import JournalArticleAuthorsEditor from "@/features/journal/components/JournalArticleAuthorsEditor";
import JournalConsentPanel from "@/features/journal/components/JournalConsentPanel";
import JournalReviewCommentSection from "@/features/journal/components/JournalReviewCommentSection";
import JournalArticleContentEditor from "@/features/journal/components/JournalArticleContentEditor";
import { evaluateConsentGate } from "@/features/journal/lib/consent-gate";
import { canTransitionReviewStatus } from "@/features/journal/lib/article-status";
import type { ArticleVisibility, User } from "@/types";

interface PageProps {
  params: Promise<{ researchId: string; articleId: string }>;
}

export default function ArticleEditPage({ params }: PageProps) {
  const { researchId, articleId } = use(params);
  return (
    <AuthGuard>
      <ArticleEditContent researchId={researchId} articleId={articleId} />
    </AuthGuard>
  );
}

function ArticleEditContent({
  researchId,
  articleId,
}: {
  researchId: string;
  articleId: string;
}) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: research } = useCollabResearch(researchId);
  const { data: members = [] } = useCollabMembers(researchId);
  const { data: article, isLoading } = useArticle(articleId);

  const updateAuthorsMut = useUpdateArticleAuthors(articleId);
  const submitMut = useSubmitArticle(articleId);
  const publishMut = usePublishArticle(articleId);
  const startReviewMut = useStartReview(articleId);
  const requestRevisionMut = useRequestRevision(articleId);
  const acceptMut = useAcceptArticle(articleId);
  const withdrawMut = useWithdrawArticle(articleId);
  const deleteMut = useDeleteArticle();

  const userIds = useMemo(
    () => Array.from(new Set([...members.map((m) => m.userId), ...(article?.authors ?? []).map((a) => a.userId)])),
    [members, article],
  );

  const { data: profiles = [] } = useQuery({
    queryKey: ["users", "by-ids", userIds.sort().join(",")],
    queryFn: () => profilesApi.listByIds(userIds),
    enabled: userIds.length > 0,
    staleTime: 60_000,
  });

  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  if (isLoading || !research || !user) {
    return (
      <PageContainer>
        <p className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</p>
      </PageContainer>
    );
  }

  if (!article) {
    return (
      <PageContainer>
        <BackButton href={`/collab/${researchId}/publish`} label="출판 허브" />
        <Card className="border-destructive/20 bg-destructive/10">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="text-destructive" />
            <p className="text-sm">논문을 찾을 수 없습니다.</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const isLeader = user.id === research.leaderId;
  const isMember = members.some((m) => m.userId === user.id && m.status === "active");
  const canEdit = (isLeader || isMember) && article.reviewStatus !== "published" && article.reviewStatus !== "withdrawn";
  const gate = evaluateConsentGate(article);

  const handleSubmit = async () => {
    if (!gate.canSubmit) {
      alert(gate.reason ?? "동의 게이트 미완료");
      return;
    }
    await submitMut.mutateAsync();
  };

  const handlePublish = async (visibility: ArticleVisibility) => {
    if (!canTransitionReviewStatus(article.reviewStatus, "published")) {
      alert("현재 상태에서 발간 전이가 불가합니다 (accepted 상태 필요).");
      return;
    }
    if (article.publicationType !== "journal") {
      // 워킹 페이퍼·노트 — 호수 없이 자율 publish
      await publishMut.mutateAsync({ visibility });
    } else {
      alert("정식 연구지는 운영진 콘솔에서 호수 배정 후 발간하세요.");
    }
  };

  const handleWorkingPublishShortcut = async (visibility: ArticleVisibility) => {
    // 워킹 페이퍼·노트: draft→accepted→published 자동
    if (article.reviewStatus === "draft") {
      await acceptMut.mutateAsync();
    }
    await publishMut.mutateAsync({ visibility });
  };

  const isStaffOrAbove =
    user.role === "staff" ||
    user.role === "president" ||
    user.role === "admin" ||
    user.role === "sysadmin";

  return (
    <PageContainer>
      <BackButton href={`/collab/${researchId}/publish`} label="출판 허브" />

      {/* 헤더 */}
      <header className="space-y-3 border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <PublicationTypeBadge type={article.publicationType} size="sm" />
          <ReviewStatusBadge status={article.reviewStatus} size="sm" />
          <VisibilityBadge visibility={article.visibility} size="sm" />
        </div>
        <h1 className="text-2xl font-bold">{article.titleKo || "(제목 미입력)"}</h1>
        <p className="text-xs text-muted-foreground">
          최근 수정: {new Date(article.updatedAt).toLocaleString("ko-KR")}
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* 좌측: 콘텐츠·저자·코멘트 */}
        <div className="space-y-6">
          <JournalArticleContentEditor article={article} disabled={!canEdit} />
          <JournalArticleAuthorsEditor
            authors={article.authors}
            onChange={(authors) => updateAuthorsMut.mutate(authors)}
            teamMembers={members}
            userMap={userMap}
            disabled={!canEdit || updateAuthorsMut.isPending}
          />
          <JournalReviewCommentSection
            article={article}
            currentUserId={user.id}
            canComment={isLeader || isMember || isStaffOrAbove}
            userMap={userMap}
          />
        </div>

        {/* 우측: 동의 게이트 + 출판 액션 */}
        <aside className="space-y-4">
          <JournalConsentPanel
            article={article}
            currentUserId={user.id}
            isLeader={isLeader}
            userMap={userMap}
          />

          {/* 출판 워크플로우 액션 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">출판 워크플로우</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {article.publicationType === "journal" && (
                <>
                  {/* draft → submitted */}
                  {article.reviewStatus === "draft" && isLeader && (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      onClick={handleSubmit}
                      disabled={!gate.canSubmit || submitMut.isPending}
                    >
                      <Send size={14} className="mr-1" />
                      검수 제출 (저자 동의 100% 필요)
                    </Button>
                  )}

                  {/* submitted → under_review (staff) */}
                  {article.reviewStatus === "submitted" && isStaffOrAbove && (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      onClick={() => startReviewMut.mutate(user.id)}
                    >
                      <Eye size={14} className="mr-1" />
                      검수 시작
                    </Button>
                  )}

                  {/* under_review → revision_requested / accepted */}
                  {article.reviewStatus === "under_review" && isStaffOrAbove && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => requestRevisionMut.mutate()}
                      >
                        수정 요청
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        onClick={() => acceptMut.mutate()}
                      >
                        <CheckCircle2 size={14} className="mr-1" />
                        승인 (호수 배정 대기)
                      </Button>
                    </>
                  )}

                  {/* accepted: 운영진 콘솔에서 호수 배정 안내 */}
                  {article.reviewStatus === "accepted" && (
                    <p className="rounded bg-cat-1/10 px-3 py-2 text-xs text-cat-1">
                      ✓ 승인 완료. 운영진 콘솔(/console/research/journal)에서 호수를 배정하고
                      발간합니다.
                    </p>
                  )}

                  {/* revision_requested: leader 재제출 */}
                  {article.reviewStatus === "revision_requested" && isLeader && (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      onClick={handleSubmit}
                      disabled={!gate.canSubmit}
                    >
                      <Send size={14} className="mr-1" />
                      재제출
                    </Button>
                  )}
                </>
              )}

              {/* 워킹 페이퍼·노트 — 자율 publish */}
              {(article.publicationType === "working_paper" ||
                article.publicationType === "note") &&
                isLeader &&
                article.reviewStatus !== "published" && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      검수 절차 없이 책임연구자 자율로 출판합니다. 공개 범위 선택:
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleWorkingPublishShortcut("society")}
                    >
                      학회원 공개로 발간
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      onClick={() => handleWorkingPublishShortcut("public")}
                    >
                      <Globe size={14} className="mr-1" />
                      전체 공개로 발간 (SEO)
                    </Button>
                  </div>
                )}

              {/* 발간 후 — 철회 */}
              {article.reviewStatus === "published" && isLeader && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    const reason = prompt("철회 사유를 입력하세요");
                    if (reason) withdrawMut.mutate(reason);
                  }}
                >
                  <Trash2 size={14} className="mr-1" />
                  발간 철회
                </Button>
              )}

              {/* draft 상태에서 leader 만 삭제 */}
              {article.reviewStatus === "draft" && isLeader && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (confirm("초안을 삭제하시겠습니까?")) {
                      deleteMut.mutate(article.id);
                      router.push(`/collab/${researchId}/publish`);
                    }
                  }}
                >
                  <Trash2 size={14} className="mr-1" />
                  초안 삭제
                </Button>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </PageContainer>
  );
}
