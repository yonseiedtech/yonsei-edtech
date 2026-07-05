"use client";

import { use } from "react";
import { AlertCircle } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageContainer from "@/components/ui/page-container";
import BackButton from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCollabResearch,
  useCollabMembers,
  useUpdateCollabResearch,
} from "@/features/collaborative-research/api/useCollabResearch";
import CollabResearchHeader from "@/features/collaborative-research/components/CollabResearchHeader";
import CollabResearchMetaForm from "@/features/collaborative-research/components/CollabResearchMetaForm";
import type { UpdateCollabResearchInput } from "@/types";

interface PageProps {
  params: Promise<{ researchId: string }>;
}

export default function CollabMetaPage({ params }: PageProps) {
  const { researchId } = use(params);
  return (
    <AuthGuard>
      <MetaContent researchId={researchId} />
    </AuthGuard>
  );
}

function MetaContent({ researchId }: { researchId: string }) {
  const { user } = useAuthStore();
  const { data: research, isLoading } = useCollabResearch(researchId);
  const { data: members = [] } = useCollabMembers(researchId);
  const updateMut = useUpdateCollabResearch(researchId);

  if (isLoading || !user) {
    return (
      <PageContainer>
        <p className="py-12 text-center text-sm text-zinc-500">불러오는 중...</p>
      </PageContainer>
    );
  }

  if (!research) {
    return (
      <PageContainer>
        <BackButton href="/collab" label="공동 연구 목록" />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="text-red-500" />
            <p className="text-sm">연구를 찾을 수 없거나 접근 권한이 없습니다.</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const myMember = members.find((m) => m.userId === user.id);
  const isLeader = user.id === research.leaderId;

  const handleSubmit = async (patch: UpdateCollabResearchInput) => {
    await updateMut.mutateAsync(patch);
  };

  return (
    <PageContainer>
      <BackButton href={`/collab/${researchId}`} label="대시보드" />
      <CollabResearchHeader
        research={research}
        myRole={myMember?.role}
        isLeader={isLeader}
        activeTab="meta"
      />
      <div className="mt-6">
        {isLeader ? (
          <CollabResearchMetaForm
            mode="edit"
            research={research}
            onSubmit={handleSubmit}
            submitting={updateMut.isPending}
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-sm text-zinc-500">
              연구 메타는 책임연구자(leader)만 편집할 수 있습니다.
              <br />
              현재 메타 정보는 대시보드에서 확인할 수 있습니다.
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
