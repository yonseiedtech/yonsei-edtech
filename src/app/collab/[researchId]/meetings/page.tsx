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
