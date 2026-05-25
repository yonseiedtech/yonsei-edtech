"use client";

import { use } from "react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageContainer from "@/components/ui/page-container";
import BackButton from "@/components/ui/back-button";
import {
  useCollabResearch,
  useCollabMembers,
} from "@/features/collaborative-research/api/useCollabResearch";
import CollabResearchHeader from "@/features/collaborative-research/components/CollabResearchHeader";
import MeetingsBoard from "@/features/collaborative-research/components/MeetingsBoard";

interface PageProps {
  params: Promise<{ researchId: string }>;
}

export default function MeetingsPage({ params }: PageProps) {
  const { researchId } = use(params);
  return (
    <AuthGuard>
      <Content researchId={researchId} />
    </AuthGuard>
  );
}

function Content({ researchId }: { researchId: string }) {
  const { user } = useAuthStore();
  const { data: research, isLoading } = useCollabResearch(researchId);
  const { data: members = [] } = useCollabMembers(researchId);

  if (isLoading || !research || !user) {
    return (
      <PageContainer>
        <p className="py-12 text-center text-sm text-zinc-500">불러오는 중...</p>
      </PageContainer>
    );
  }

  const myMember = members.find((m) => m.userId === user.id);
  const isLeader = user.id === research.leaderId;
  const isMember = !!myMember;

  return (
    <PageContainer>
      <BackButton href={`/collab/${researchId}`} label="대시보드" />
      <CollabResearchHeader
        research={research}
        myRole={myMember?.role}
        isLeader={isLeader}
        activeTab="meetings"
      />
      <div className="mt-6">
        <MeetingsBoard
          researchId={researchId}
          currentUserId={user.id}
          isLeader={isLeader}
          isMember={isMember}
        />
      </div>
    </PageContainer>
  );
}
