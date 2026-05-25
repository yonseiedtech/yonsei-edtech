"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageContainer from "@/components/ui/page-container";
import BackButton from "@/components/ui/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import {
  useCollabResearch,
  useCollabMembers,
} from "@/features/collaborative-research/api/useCollabResearch";
import CollabResearchHeader from "@/features/collaborative-research/components/CollabResearchHeader";
import {
  useArticlesByResearch,
  useCreateArticle,
} from "@/features/journal/api/useJournal";
import {
  ReviewStatusBadge,
  PublicationTypeBadge,
} from "@/features/journal/components/JournalArticleStatusBadge";
import {
  PUBLICATION_TYPE_LABELS,
  PUBLICATION_TYPE_DESCRIPTIONS,
} from "@/features/journal/lib/article-status";
import type { PublicationType } from "@/types";

interface PageProps {
  params: Promise<{ researchId: string }>;
}

const TYPE_OPTIONS: PublicationType[] = ["working_paper", "note", "journal"];

export default function PublishHubPage({ params }: PageProps) {
  const { researchId } = use(params);
  return (
    <AuthGuard>
      <PublishHubContent researchId={researchId} />
    </AuthGuard>
  );
}

function PublishHubContent({ researchId }: { researchId: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: research } = useCollabResearch(researchId);
  const { data: members = [] } = useCollabMembers(researchId);
  const { data: articles = [], isLoading } = useArticlesByResearch(researchId);
  const createMut = useCreateArticle();
  const [creating, setCreating] = useState<PublicationType | null>(null);

  if (!research || !user) {
    return (
      <PageContainer>
        <p className="py-12 text-center text-sm text-zinc-500">불러오는 중...</p>
      </PageContainer>
    );
  }

  const myMember = members.find((m) => m.userId === user.id);
  const isLeader = user.id === research.leaderId;
  const canCreate = isLeader || !!myMember;

  const handleCreate = async (type: PublicationType) => {
    setCreating(type);
    try {
      const created = await createMut.mutateAsync({
        researchId,
        publicationType: type,
        titleKo: research.title,
      });
      router.push(`/collab/${researchId}/publish/${created.id}`);
    } finally {
      setCreating(null);
    }
  };

  return (
    <PageContainer>
      <BackButton href={`/collab/${researchId}`} label="대시보드" />
      <CollabResearchHeader
        research={research}
        myRole={myMember?.role}
        isLeader={isLeader}
        activeTab="publish"
      />

      <div className="mt-6 space-y-6">
        <header>
          <h2 className="text-xl font-semibold">연구지 출판</h2>
          <p className="mt-1 text-sm text-zinc-600">
            팀의 연구 결과를 연구지에 발간합니다. 형식은 정식 연구지(검수 워크플로우)와
            워킹 페이퍼(자율 publish) 두 트랙입니다.
          </p>
        </header>

        {/* 기존 article 목록 */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-zinc-700">
            진행 중·발간 논문 ({articles.length})
          </h3>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-zinc-500">불러오는 중...</p>
          ) : articles.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="아직 출판물이 없습니다"
              description="아래 형식 중 하나를 선택하여 첫 논문 초안을 만드세요."
              compact
            />
          ) : (
            <div className="space-y-2">
              {articles.map((a) => (
                <Link key={a.id} href={`/collab/${researchId}/publish/${a.id}`}>
                  <Card className="transition-shadow hover:shadow-sm">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <PublicationTypeBadge type={a.publicationType} size="sm" />
                          <ReviewStatusBadge status={a.reviewStatus} size="sm" />
                        </div>
                        <p className="text-sm font-medium">{a.titleKo}</p>
                        <p className="text-xs text-zinc-500">
                          {a.authors.length}명 저자 · 최근 수정{" "}
                          {new Date(a.updatedAt).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 신규 생성 */}
        {canCreate && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-zinc-700">새 논문 초안 생성</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {TYPE_OPTIONS.map((type) => (
                <Card key={type} className="border-zinc-200">
                  <CardHeader>
                    <CardTitle className="text-sm">
                      <PublicationTypeBadge type={type} size="sm" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-zinc-600">
                      {PUBLICATION_TYPE_DESCRIPTIONS[type]}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCreate(type)}
                      disabled={creating !== null}
                      className="w-full"
                    >
                      <Plus size={14} className="mr-1" />
                      {creating === type
                        ? "생성 중..."
                        : `${PUBLICATION_TYPE_LABELS[type]} 초안 만들기`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageContainer>
  );
}
