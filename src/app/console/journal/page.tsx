"use client";

/**
 * 콘솔 — 학회지(연구지) 운영 (M4, 2026-07-08)
 * 발행호 현황·투고(검수) 큐·심사자 배정 현황을 한눈에 조회하는 운영 콘솔.
 * 데이터 모델·rules 무수정 — 기존 journal feature API/컴포넌트만 재사용.
 * 편집 액션(호수 발간·검수 진행 등)은 기존 화면으로 링크 연결.
 *   - 검수: /collab/[researchId]/publish/[articleId]
 *   - 호수 편집·발간: /console/research/journal (기존 연구지 콘솔)
 *   - 공개 호수: /journal/issues/[issueId]
 * 조회 제약: staff read 범위 내 — listAll(호수) + listForReview(submitted·under_review)만
 * 열람 가능. draft/accepted 전수 목록은 rules상 조회 불가(보고서 제안 참조).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  FileCheck2,
  Globe,
  UserCheck,
  AlertTriangle,
  Layers,
  Settings2,
} from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { useAllIssues, useReviewQueue } from "@/features/journal/api/useJournal";
import {
  ReviewStatusBadge,
  PublicationTypeBadge,
} from "@/features/journal/components/JournalArticleStatusBadge";
import { ISSUE_STATUS_LABELS, formatIssueCode } from "@/features/journal/lib/article-status";
import type { ArticleReviewStatus, ResearchJournalArticle } from "@/types";

type QueueFilter = "all" | "submitted" | "under_review";

const QUEUE_FILTERS: { key: QueueFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "submitted", label: "검수 제출" },
  { key: "under_review", label: "검수 중" },
];

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone?: "default" | "amber" | "violet";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm",
        tone === "amber" && "border-warning/30 bg-warning/5",
        tone === "violet" && "border-cat-5/30 bg-cat-5/5",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          tone === "amber"
            ? "bg-warning/10 text-warning"
            : tone === "violet"
              ? "bg-cat-5/10 text-cat-5"
              : "bg-primary/10 text-primary",
        )}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function JournalConsoleContent() {
  const { user } = useAuthStore();
  const canView = isAtLeast(user, "staff");

  const { data: issues = [], isLoading: issuesLoading } = useAllIssues();
  const { data: queue = [], isLoading: queueLoading } = useReviewQueue();

  const [filter, setFilter] = useState<QueueFilter>("all");

  const stats = useMemo(() => {
    const publishedIssues = issues.filter((i) => i.status === "published").length;
    const preparingIssues = issues.filter((i) => i.status === "preparing").length;
    const unassigned = queue.filter((a) => (a.reviewerIds?.length ?? 0) === 0).length;
    return {
      totalIssues: issues.length,
      publishedIssues,
      preparingIssues,
      queueCount: queue.length,
      unassigned,
    };
  }, [issues, queue]);

  const filteredQueue = useMemo<ResearchJournalArticle[]>(() => {
    if (filter === "all") return queue;
    return queue.filter((a) => a.reviewStatus === (filter as ArticleReviewStatus));
  }, [queue, filter]);

  if (!canView) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
        운영진(staff) 이상만 접근할 수 있는 페이지입니다.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 요약 통계 */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Layers} label="전체 발행호" value={stats.totalIssues} />
        <StatCard icon={BookOpenCheck} label="발간 완료 호수" value={stats.publishedIssues} tone="violet" />
        <StatCard icon={Settings2} label="준비 중 호수" value={stats.preparingIssues} />
        <StatCard icon={FileCheck2} label="검수 대기 투고" value={stats.queueCount} />
        <StatCard icon={AlertTriangle} label="심사자 미배정" value={stats.unassigned} tone="amber" />
      </section>

      {/* 발행호별 현황 */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Layers size={17} /> 발행호별 현황 ({issues.length})
          </h2>
          <Link href="/console/research/journal">
            <Button size="sm" variant="outline">
              <Settings2 size={14} className="mr-1" /> 호수 편집·발간
            </Button>
          </Link>
        </div>

        {issuesLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : issues.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              아직 생성된 발행호가 없습니다.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">호수</th>
                  <th className="px-4 py-2.5 font-medium">발간 시기</th>
                  <th className="px-4 py-2.5 font-medium">상태</th>
                  <th className="px-4 py-2.5 text-right font-medium">수록 논문</th>
                  <th className="px-4 py-2.5 font-medium">발간일</th>
                  <th className="px-4 py-2.5 text-right font-medium">공개</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((iss) => (
                  <tr key={iss.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold">
                      {formatIssueCode(iss.volume, iss.number)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {iss.year}
                      {iss.season ? ` · ${iss.season}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          iss.status === "published"
                            ? "bg-cat-5/10 text-cat-5"
                            : iss.status === "archived"
                              ? "bg-muted text-muted-foreground"
                              : "bg-info/10 text-info",
                        )}
                      >
                        {ISSUE_STATUS_LABELS[iss.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {iss.articleIds.length}편
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {iss.publishedAt
                        ? new Date(iss.publishedAt).toLocaleDateString("ko-KR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/journal/issues/${iss.id}`}>
                        <Button size="sm" variant="ghost">
                          <Globe size={14} />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 투고(검수) 큐 */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <FileCheck2 size={17} /> 투고·심사 큐 ({queue.length})
          </h2>
          <div className="flex gap-1">
            {QUEUE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition",
                  filter === f.key
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-input text-muted-foreground hover:border-primary/40",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">
          검수 제출(submitted)·검수 중(under_review) 투고만 표시됩니다.
          <span className="mx-1 font-medium text-warning">심사자 미배정</span>
          투고는 강조 표시되니 먼저 처리하세요.
        </p>

        {queueLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : filteredQueue.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {filter === "all"
                ? "검수 대기 중인 투고가 없습니다."
                : "해당 상태의 투고가 없습니다."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredQueue.map((a) => {
              const reviewerCount = a.reviewerIds?.length ?? 0;
              const unassigned = reviewerCount === 0;
              return (
                <Link key={a.id} href={`/collab/${a.researchId}/publish/${a.id}`}>
                  <Card
                    className={cn(
                      "transition-shadow hover:shadow-sm",
                      unassigned && "border-warning/30 bg-warning/5",
                    )}
                  >
                    <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <PublicationTypeBadge type={a.publicationType} size="sm" />
                          <ReviewStatusBadge status={a.reviewStatus} size="sm" />
                        </div>
                        <p className="truncate text-sm font-medium">{a.titleKo}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.authors.length > 0
                            ? a.authors.map((au) => au.displayName).join(", ")
                            : "저자 미입력"}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {unassigned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                            <AlertTriangle size={12} /> 심사자 미배정
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                            <UserCheck size={12} /> 심사자 {reviewerCount}명
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function JournalConsolePage() {
  return (
    <AuthGuard>
      <ConsolePageHeader
        icon={BookOpenCheck}
        title="학회지 운영"
        description="발행호 현황·투고·심사 배정을 한눈에 관리합니다. 편집·검수는 각 상세 화면으로 이동합니다."
      />
      <JournalConsoleContent />
    </AuthGuard>
  );
}
