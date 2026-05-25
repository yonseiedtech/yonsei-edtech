"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageContainer from "@/components/ui/page-container";
import BackButton from "@/components/ui/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useCollabResearch,
  useCollabMembers,
  useUpdateCollabResearch,
  useDeleteCollabResearch,
} from "@/features/collaborative-research/api/useCollabResearch";
import CollabResearchHeader from "@/features/collaborative-research/components/CollabResearchHeader";
import { COLLAB_STATUS_LABELS, canTransitionStatus } from "@/features/collaborative-research/lib/research-status";
import type { CollaborativeResearchStatus } from "@/types";

const STATUS_OPTIONS: CollaborativeResearchStatus[] = [
  "planning",
  "active",
  "writing",
  "review",
  "published",
  "paused",
  "archived",
];

interface PageProps {
  params: Promise<{ researchId: string }>;
}

export default function CollabSettingsPage({ params }: PageProps) {
  const { researchId } = use(params);
  return (
    <AuthGuard>
      <SettingsContent researchId={researchId} />
    </AuthGuard>
  );
}

function SettingsContent({ researchId }: { researchId: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: research, isLoading } = useCollabResearch(researchId);
  const { data: members = [] } = useCollabMembers(researchId);
  const updateMut = useUpdateCollabResearch(researchId);
  const deleteMut = useDeleteCollabResearch();

  if (isLoading || !research || !user) {
    return (
      <PageContainer>
        <p className="py-12 text-center text-sm text-zinc-500">불러오는 중...</p>
      </PageContainer>
    );
  }

  const isLeader = user.id === research.leaderId;
  const myMember = members.find((m) => m.userId === user.id);

  if (!isLeader) {
    return (
      <PageContainer>
        <BackButton href={`/collab/${researchId}`} label="대시보드" />
        <Card>
          <CardContent className="p-6 text-center text-sm text-zinc-500">
            설정은 책임연구자(leader)만 접근할 수 있습니다.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const handleStatusChange = async (next: CollaborativeResearchStatus) => {
    if (!canTransitionStatus(research.status, next)) {
      alert(
        `${COLLAB_STATUS_LABELS[research.status]} → ${COLLAB_STATUS_LABELS[next]} 전이는 허용되지 않습니다.`,
      );
      return;
    }
    await updateMut.mutateAsync({ status: next });
  };

  const handleDelete = async () => {
    if (!confirm("정말 연구팀을 삭제하시겠습니까? 멤버·메타 정보가 모두 사라지며 복구할 수 없습니다.")) {
      return;
    }
    await deleteMut.mutateAsync(research.id);
    router.push("/collab");
  };

  return (
    <PageContainer>
      <BackButton href={`/collab/${researchId}`} label="대시보드" />
      <CollabResearchHeader
        research={research}
        myRole={myMember?.role}
        isLeader={isLeader}
        activeTab="settings"
      />

      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">상태 관리</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-600">
              현재 상태: <strong>{COLLAB_STATUS_LABELS[research.status]}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => {
                const allowed = canTransitionStatus(research.status, s);
                const current = research.status === s;
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant={current ? "default" : "outline"}
                    disabled={!allowed || current || updateMut.isPending}
                    onClick={() => handleStatusChange(s)}
                  >
                    {COLLAB_STATUS_LABELS[s]}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500">
              archived 상태로 전이 시 더 이상 수정할 수 없습니다 (admin 복원 필요).
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-700">
              <AlertTriangle size={16} /> 위험 영역
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              연구팀을 삭제하면 멤버 정보·메타·초대 기록이 모두 사라집니다.
              발간된 연구지 논문이 있다면 별도로 보존되지 않습니다.
            </p>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              <Trash2 size={14} className="mr-1" />
              연구팀 영구 삭제
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
