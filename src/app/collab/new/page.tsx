"use client";

import { useRouter } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import BackButton from "@/components/ui/back-button";
import CollabResearchMetaForm from "@/features/collaborative-research/components/CollabResearchMetaForm";
import type { InviteDraft } from "@/features/collaborative-research/components/InviteDraftPicker";
import { useCreateCollabResearch } from "@/features/collaborative-research/api/useCollabResearch";
import { collabInvitesApi } from "@/lib/bkend";
import type { CreateCollabResearchInput } from "@/types";
import { toast } from "sonner";

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

  const handleSubmit = async (input: CreateCollabResearchInput, invites: InviteDraft[]) => {
    const created = await createMut.mutateAsync(input);

    // 초대장 batch 발송 — 실패해도 팀 생성은 유지 (non-fatal)
    if (invites.length > 0) {
      const senderId = user.id;
      const senderName = user.name ?? "이름 미설정";
      const researchTitle = created.title;

      let okCount = 0;
      let failCount = 0;
      for (const draft of invites) {
        try {
          await collabInvitesApi.create({
            researchId: created.id,
            researchTitle,
            senderId,
            senderName,
            recipientId: draft.recipientId,
            recipientEmail: draft.recipientEmail,
            proposedRole: draft.proposedRole,
            message: draft.message,
          });
          okCount++;
        } catch (err) {
          console.error("[NewCollab] invite failed", draft.recipientId, err);
          failCount++;
        }
      }
      if (okCount > 0) {
        toast.success(`${okCount}명에게 초대장이 발송되었습니다`);
      }
      if (failCount > 0) {
        toast.error(`${failCount}명 초대 발송 실패 — 멤버 페이지에서 재시도하세요`);
      }
    }

    router.push(`/collab/${created.id}`);
  };

  return (
    <PageContainer>
      <BackButton href="/collab" label="공동 연구 목록" />
      <PageHeader
        title="새 연구팀 만들기"
        description="연구 메타 정보와 팀원을 동시에 등록합니다. 생성 즉시 팀이 활성화되고 초대장이 발송됩니다."
      />
      <CollabResearchMetaForm
        mode="create"
        leaderId={user.id}
        leaderName={user.name ?? undefined}
        onSubmit={handleSubmit}
        submitting={createMut.isPending}
      />
    </PageContainer>
  );
}
