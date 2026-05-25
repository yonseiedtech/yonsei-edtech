"use client";

import { useRouter } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import BackButton from "@/components/ui/back-button";
import CollabResearchMetaForm from "@/features/collaborative-research/components/CollabResearchMetaForm";
import { useCreateCollabResearch } from "@/features/collaborative-research/api/useCollabResearch";
import type { CreateCollabResearchInput } from "@/types";

export default function NewCollabResearchPage() {
  return (
    <AuthGuard>
      <NewCollabContent />
    </AuthGuard>
  );
}

function NewCollabContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const createMut = useCreateCollabResearch();

  if (!user?.id) return null;

  const handleSubmit = async (input: CreateCollabResearchInput) => {
    const created = await createMut.mutateAsync(input);
    router.push(`/collab/${created.id}`);
  };

  return (
    <PageContainer>
      <BackButton href="/collab" label="공동 연구 목록" />
      <PageHeader
        title="새 연구팀 만들기"
        description="연구 메타 정보를 입력하고 팀을 생성합니다. 생성 후 멤버를 초대할 수 있습니다."
      />
      <CollabResearchMetaForm
        mode="create"
        leaderId={user.id}
        onSubmit={handleSubmit}
        submitting={createMut.isPending}
      />
    </PageContainer>
  );
}
