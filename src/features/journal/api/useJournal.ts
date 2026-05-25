// ────────────────────────────────────────────────────────────
// features/journal/api/useJournal.ts
//
// React Query hooks for journal_issues + journal_articles.
// ────────────────────────────────────────────────────────────

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  journalIssuesApi,
  journalArticlesApi,
} from "@/lib/bkend";
import type {
  ArticleAuthorSnapshot,
  ArticleVisibility,
  CreateJournalIssueInput,
  PublicationType,
  ResearchJournalArticle,
  ResearchJournalIssue,
  ReviewComment,
  UpdateArticleMetaInput,
  UpdateJournalIssueInput,
} from "@/types";

// ── Query keys ──
export const journalKeys = {
  all: ["journal"] as const,
  issuesPublished: () => [...journalKeys.all, "issues", "published"] as const,
  issuesAll: () => [...journalKeys.all, "issues", "all"] as const,
  issueDetail: (id: string | undefined) => [...journalKeys.all, "issue", id] as const,

  articlesPublic: () => [...journalKeys.all, "articles", "public"] as const,
  articlesSociety: () => [...journalKeys.all, "articles", "society"] as const,
  articlesByResearch: (researchId: string | undefined) =>
    [...journalKeys.all, "articles", "by-research", researchId] as const,
  articlesByIssue: (issueId: string | undefined) =>
    [...journalKeys.all, "articles", "by-issue", issueId] as const,
  articlesForReview: () => [...journalKeys.all, "articles", "review-queue"] as const,
  articleDetail: (id: string | undefined) => [...journalKeys.all, "article", id] as const,
};

// ─── Issues queries ───

export function usePublishedIssues() {
  return useQuery({
    queryKey: journalKeys.issuesPublished(),
    queryFn: () => journalIssuesApi.listPublished(),
    staleTime: 60_000,
  });
}

export function useAllIssues() {
  return useQuery({
    queryKey: journalKeys.issuesAll(),
    queryFn: () => journalIssuesApi.listAll(),
    staleTime: 30_000,
  });
}

export function useIssue(id: string | undefined) {
  return useQuery({
    queryKey: journalKeys.issueDetail(id),
    queryFn: () =>
      id ? journalIssuesApi.get(id) : Promise.resolve(null as ResearchJournalIssue | null),
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ─── Articles queries ───

export function usePublicArticles() {
  return useQuery({
    queryKey: journalKeys.articlesPublic(),
    queryFn: () => journalArticlesApi.listPublic(),
    staleTime: 30_000,
  });
}

export function useSocietyArticles() {
  return useQuery({
    queryKey: journalKeys.articlesSociety(),
    queryFn: () => journalArticlesApi.listSociety(),
    staleTime: 30_000,
  });
}

export function useArticlesByResearch(researchId: string | undefined) {
  return useQuery({
    queryKey: journalKeys.articlesByResearch(researchId),
    queryFn: () => (researchId ? journalArticlesApi.listByResearch(researchId) : []),
    enabled: !!researchId,
    staleTime: 15_000,
  });
}

export function useArticlesByIssue(issueId: string | undefined) {
  return useQuery({
    queryKey: journalKeys.articlesByIssue(issueId),
    queryFn: () => (issueId ? journalArticlesApi.listByIssue(issueId) : []),
    enabled: !!issueId,
    staleTime: 60_000,
  });
}

export function useReviewQueue() {
  return useQuery({
    queryKey: journalKeys.articlesForReview(),
    queryFn: () => journalArticlesApi.listForReview(),
    staleTime: 15_000,
  });
}

export function useArticle(id: string | undefined) {
  return useQuery({
    queryKey: journalKeys.articleDetail(id),
    queryFn: () =>
      id
        ? journalArticlesApi.get(id)
        : Promise.resolve(null as ResearchJournalArticle | null),
    enabled: !!id,
    staleTime: 10_000,
  });
}

// ─── Issue mutations ───

export function useCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJournalIssueInput) => journalIssuesApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.all });
      toast.success("호수가 생성되었습니다");
    },
  });
}

export function useUpdateIssue(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateJournalIssueInput) => journalIssuesApi.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.issueDetail(id) });
      qc.invalidateQueries({ queryKey: journalKeys.issuesAll() });
    },
  });
}

export function usePublishIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => journalIssuesApi.publish(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.all });
      toast.success("호수가 발간되었습니다");
    },
  });
}

// ─── Article mutations ───

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      researchId: string;
      publicationType: PublicationType;
      titleKo?: string;
    }) => journalArticlesApi.create(input),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: journalKeys.articlesByResearch(created.researchId) });
      toast.success("논문 초안이 생성되었습니다");
    },
    onError: (err) => {
      console.error("[useCreateArticle]", err);
      toast.error("논문 생성 실패");
    },
  });
}

export function useUpdateArticleMeta(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateArticleMetaInput) => journalArticlesApi.updateMeta(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.articleDetail(id) });
    },
  });
}

export function useUpdateArticleAuthors(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (authors: ArticleAuthorSnapshot[]) =>
      journalArticlesApi.updateAuthors(id, authors),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.articleDetail(id) });
    },
  });
}

export function useRequestConsent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (authors: ArticleAuthorSnapshot[]) =>
      journalArticlesApi.requestConsent(id, authors),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.articleDetail(id) });
      toast.success("저자 동의 요청을 발송했습니다");
    },
  });
}

export function useRecordConsent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { userId: string; agreed: boolean; rejectionNote?: string }) =>
      journalArticlesApi.recordConsent(
        id,
        params.userId,
        params.agreed,
        params.rejectionNote,
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: journalKeys.articleDetail(id) });
      toast.success(vars.agreed ? "저자 동의가 기록되었습니다" : "동의 거부가 기록되었습니다");
    },
  });
}

export function useSubmitArticle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => journalArticlesApi.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.articleDetail(id) });
      qc.invalidateQueries({ queryKey: journalKeys.articlesForReview() });
      toast.success("검수 제출 완료");
    },
  });
}

export function useStartReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewerId: string) => journalArticlesApi.startReview(id, reviewerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.articleDetail(id) });
      qc.invalidateQueries({ queryKey: journalKeys.articlesForReview() });
    },
  });
}

export function useAddReviewComment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (comment: Omit<ReviewComment, "id" | "createdAt">) =>
      journalArticlesApi.addReviewComment(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.articleDetail(id) });
    },
  });
}

export function useRequestRevision(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => journalArticlesApi.requestRevision(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.articleDetail(id) });
      qc.invalidateQueries({ queryKey: journalKeys.articlesForReview() });
      toast.success("수정 요청을 전달했습니다");
    },
  });
}

export function useAcceptArticle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => journalArticlesApi.accept(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.articleDetail(id) });
      qc.invalidateQueries({ queryKey: journalKeys.articlesForReview() });
      toast.success("논문이 승인되었습니다");
    },
  });
}

export function usePublishArticle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (options: {
      visibility: ArticleVisibility;
      issueId?: string;
      pageStart?: number;
      pageEnd?: number;
    }) => journalArticlesApi.publish(id, options),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.all });
      toast.success("논문이 발간되었습니다");
    },
  });
}

export function useWithdrawArticle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => journalArticlesApi.withdraw(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.all });
      toast.success("논문이 철회되었습니다");
    },
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => journalArticlesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.all });
      toast.success("논문이 삭제되었습니다");
    },
  });
}
