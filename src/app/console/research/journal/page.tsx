"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus, FileCheck2, Globe } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAllIssues,
  useCreateIssue,
  useUpdateIssue,
  usePublishIssue,
  useReviewQueue,
  usePublishArticle,
} from "@/features/journal/api/useJournal";
import {
  ReviewStatusBadge,
  PublicationTypeBadge,
} from "@/features/journal/components/JournalArticleStatusBadge";
import {
  ISSUE_STATUS_LABELS,
  formatIssueCode,
} from "@/features/journal/lib/article-status";
import type {
  JournalIssueSeason,
  ResearchJournalArticle,
  CreateJournalIssueInput,
} from "@/types";

const SEASONS: JournalIssueSeason[] = ["spring", "summer", "fall", "winter"];

export default function JournalConsolePage() {
  return (
    <AuthGuard>
      <Content />
    </AuthGuard>
  );
}

function Content() {
  const { user } = useAuthStore();
  const role = user?.role;
  const isStaff =
    role === "staff" || role === "president" || role === "admin" || role === "sysadmin";

  if (!isStaff) {
    return (
      <PageContainer>
        <PageHeader title="연구지 콘솔" />
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 text-sm text-destructive">
            연구지 콘솔은 학회 운영진(staff·운영진·회장·관리자)만 접근할 수 있습니다.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon={BookOpen}
        title="연구지 콘솔"
        description="검수 큐를 처리하고, 호수를 편집·발간하며, 승인된 논문을 호수에 배정합니다."
      />

      <ReviewQueueSection />
      <IssuesSection currentUserId={user!.id} />
      <AcceptedArticlesSection />
    </PageContainer>
  );
}

function ReviewQueueSection() {
  const { data: queue = [], isLoading } = useReviewQueue();

  return (
    <section className="mb-10">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <FileCheck2 size={18} /> 검수 큐 ({queue.length})
      </h2>
      {isLoading ? (
        <p className="py-6 text-center text-sm text-zinc-500">불러오는 중...</p>
      ) : queue.length === 0 ? (
        <EmptyState compact icon={FileCheck2} title="검수 대기 중인 논문이 없습니다." />
      ) : (
        <div className="space-y-2">
          {queue.map((a) => (
            <Link key={a.id} href={`/collab/${a.researchId}/publish/${a.id}`}>
              <Card className="transition-shadow hover:shadow-sm">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <PublicationTypeBadge type={a.publicationType} size="sm" />
                      <ReviewStatusBadge status={a.reviewStatus} size="sm" />
                    </div>
                    <p className="text-sm font-medium">{a.titleKo}</p>
                    <p className="text-xs text-zinc-500">
                      {a.authors.map((au) => au.displayName).join(", ")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function IssuesSection({ currentUserId }: { currentUserId: string }) {
  const { data: issues = [], isLoading } = useAllIssues();
  const createMut = useCreateIssue();

  const [creating, setCreating] = useState(false);
  const [vol, setVol] = useState<number>(1);
  const [num, setNum] = useState<number>(1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [season, setSeason] = useState<JournalIssueSeason | "">("");
  const [intro, setIntro] = useState("");

  const handleCreate = async () => {
    const input: CreateJournalIssueInput = {
      volume: vol,
      number: num,
      year,
      season: season || undefined,
      title: `연세 교육공학 연구 ${formatIssueCode(vol, num)}`,
      editorIds: [currentUserId],
      articleIds: [],
      status: "preparing",
      introMarkdown: intro.trim() || undefined,
    };
    await createMut.mutateAsync(input);
    setCreating(false);
    setIntro("");
  };

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">호수 관리 ({issues.length})</h2>
        <Button size="sm" onClick={() => setCreating(!creating)}>
          <Plus size={14} className="mr-1" />새 호수
        </Button>
      </div>

      {creating && (
        <Card className="mb-3 border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">새 호수 생성</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <Label htmlFor="iss-vol" className="text-xs">권 (Volume)</Label>
                <Input
                  id="iss-vol"
                  type="number"
                  value={vol}
                  onChange={(e) => setVol(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="iss-num" className="text-xs">호 (Number)</Label>
                <Input
                  id="iss-num"
                  type="number"
                  value={num}
                  onChange={(e) => setNum(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="iss-year" className="text-xs">년도</Label>
                <Input
                  id="iss-year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10) || 2026)}
                />
              </div>
              <div>
                <Label htmlFor="iss-season" className="text-xs">계절 (선택)</Label>
                <select
                  id="iss-season"
                  value={season}
                  onChange={(e) => setSeason(e.target.value as JournalIssueSeason | "")}
                  className="block w-full rounded border border-zinc-300 px-2 py-2 text-sm"
                >
                  <option value="">없음</option>
                  {SEASONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="iss-intro" className="text-xs">편집장의 글 (선택)</Label>
              <Textarea
                id="iss-intro"
                rows={3}
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="이번 호수의 주제·편집 의의 등"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setCreating(false)}>
                취소
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={createMut.isPending}>
                생성
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-zinc-500">불러오는 중...</p>
      ) : issues.length === 0 ? (
        <EmptyState compact icon={BookOpen} title="아직 생성된 호수가 없습니다." />
      ) : (
        <div className="space-y-2">
          {issues.map((iss) => (
            <IssueRow key={iss.id} issue={iss} />
          ))}
        </div>
      )}
    </section>
  );
}

function IssueRow({ issue }: { issue: import("@/types").ResearchJournalIssue }) {
  const publishMut = usePublishIssue();
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            {formatIssueCode(issue.volume, issue.number)} · {issue.year}
            {issue.season ? ` · ${issue.season}` : ""}
          </p>
          <p className="text-xs text-zinc-500">
            {ISSUE_STATUS_LABELS[issue.status]} · {issue.articleIds.length}편
            {issue.publishedAt &&
              ` · 발간 ${new Date(issue.publishedAt).toLocaleDateString("ko-KR")}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/journal/issues/${issue.id}`}>
            <Button size="sm" variant="outline">
              <Globe size={14} className="mr-1" />
              공개 페이지
            </Button>
          </Link>
          {issue.status !== "published" && (
            <Button
              size="sm"
              onClick={() => publishMut.mutate(issue.id)}
              disabled={publishMut.isPending}
            >
              발간
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AcceptedArticlesSection() {
  const { data: queue = [] } = useReviewQueue();
  const { data: issues = [] } = useAllIssues();
  // accepted 상태만 — 호수 배정 대기
  // listForReview 는 submitted + under_review 만 반환하므로 별도 fetch 필요
  // 단순화: queue 에는 accepted 없으므로, 호수에 직접 배정 UI 는 article 페이지에서 처리
  // 여기서는 안내만
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-semibold">승인 완료 — 호수 배정 대기</h2>
      <Card className="border-info/20 bg-info/5">
        <CardContent className="p-4 text-sm text-info">
          승인(accepted) 된 정식 연구지 논문은 각 논문의 출판 페이지
          (/collab/[id]/publish/[articleId])에서 호수·페이지 정보를 입력 후 발간할 수 있습니다.
          (호수 배정 일괄 워크플로우는 Phase 4 에서 콘솔에 통합 예정.)
        </CardContent>
      </Card>
    </section>
  );
}
