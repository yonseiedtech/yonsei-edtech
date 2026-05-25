"use client";

import Link from "next/link";
import { Plus, Users } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import {
  useCollabResearchList,
  useCollabInboxInvites,
} from "@/features/collaborative-research/api/useCollabResearch";
import CollabResearchCard from "@/features/collaborative-research/components/CollabResearchCard";
import CollabResearchInviteInbox from "@/features/collaborative-research/components/CollabResearchInviteInbox";

export default function CollabResearchListPage() {
  return (
    <AuthGuard>
      <CollabResearchListContent />
    </AuthGuard>
  );
}

function CollabResearchListContent() {
  const { user } = useAuthStore();
  const { data: researches = [], isLoading } = useCollabResearchList(user?.id);
  const { data: invites = [] } = useCollabInboxInvites(user?.id);

  return (
    <PageContainer>
      <PageHeader
        title="공동 연구"
        description="동료·자문교수와 함께 진행하는 공동 연구를 관리하고, 결과를 연구지에 발간하세요."
        actions={
          <Link href="/collab/new">
            <Button>
              <Plus size={14} className="mr-1" />새 연구팀
            </Button>
          </Link>
        }
      />

      <div className="space-y-6">
        {user?.id && invites.length > 0 && (
          <CollabResearchInviteInbox invites={invites} recipientId={user.id} />
        )}

        {isLoading ? (
          <p className="py-10 text-center text-sm text-zinc-500">불러오는 중...</p>
        ) : researches.length === 0 ? (
          <EmptyState
            icon={Users}
            title="아직 참여 중인 공동 연구가 없습니다"
            description="새 연구팀을 만들거나, 초대를 받으면 여기에 표시됩니다."
            actionLabel="첫 연구팀 만들기"
            actionHref="/collab/new"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {researches.map((r) => (
              <CollabResearchCard key={r.id} research={r} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
