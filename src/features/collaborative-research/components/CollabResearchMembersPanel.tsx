"use client";

import { useMemo, useState } from "react";
import { UserPlus, LogOut, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { profilesApi } from "@/lib/bkend";
import CollabResearchRoleBadge from "./CollabResearchRoleBadge";
import CreditRoleSelector from "./CreditRoleSelector";
import CollabResearchInviteDialog from "./CollabResearchInviteDialog";
import {
  useCollabMembers,
  useUpdateMemberRole,
  useUpdateMemberCreditRoles,
  useRemoveMember,
  useLeaveCollabResearch,
} from "../api/useCollabResearch";
import { COLLAB_MEMBER_ROLE_LABELS } from "../lib/research-status";
import type { CollabMemberRole, CreditRole, User } from "@/types";

interface Props {
  researchId: string;
  researchTitle: string;
  leaderId: string;
  currentUserId: string;
  currentUserName: string;
}

const ROLE_OPTIONS: CollabMemberRole[] = [
  "principal",
  "co_researcher",
  "advisor",
  "reviewer",
  "assistant",
];

export default function CollabResearchMembersPanel({
  researchId,
  researchTitle,
  leaderId,
  currentUserId,
  currentUserName,
}: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: members = [], isLoading } = useCollabMembers(researchId);
  const updateRoleMut = useUpdateMemberRole(researchId);
  const updateCreditMut = useUpdateMemberCreditRoles(researchId);
  const removeMut = useRemoveMember(researchId);
  const leaveMut = useLeaveCollabResearch();

  const userIds = useMemo(() => members.map((m) => m.userId), [members]);
  const { data: profiles = [] } = useQuery({
    queryKey: ["users", "by-ids", userIds.sort().join(",")],
    queryFn: () => profilesApi.listByIds(userIds),
    enabled: userIds.length > 0,
    staleTime: 60_000,
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, User>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const isLeader = currentUserId === leaderId;
  const excludeIds = useMemo(() => userIds, [userIds]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          멤버 정보를 불러오는 중...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          연구 멤버 ({members.length}명)
        </CardTitle>
        {isLeader && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus size={14} className="mr-1" />
            초대
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {members.map((m) => {
          const profile = profileMap.get(m.userId);
          const isMe = m.userId === currentUserId;
          const isMemberLeader = m.userId === leaderId;
          return (
            <div
              key={m.id}
              className="space-y-3 border-b pb-4 last:border-b-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {profile?.name ?? m.userId}
                    {isMe && (
                      <span className="ml-1 text-xs text-muted-foreground">(나)</span>
                    )}
                    {isMemberLeader && (
                      <span className="ml-1 text-xs text-cat-5">★</span>
                    )}
                  </p>
                  {profile?.email && (
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  )}
                </div>
                <CollabResearchRoleBadge role={m.role} size="sm" />
              </div>

              {/* 역할 변경 (leader 만, 본인은 제외) */}
              {isLeader && !isMe && (
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) =>
                      updateRoleMut.mutate({
                        memberId: m.id,
                        role: e.target.value as CollabMemberRole,
                      })
                    }
                    className="rounded border border-border px-2 py-1 text-xs"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {COLLAB_MEMBER_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`${profile?.name ?? "이 멤버"}를 제거하시겠습니까?`))
                        removeMut.mutate(m.id);
                    }}
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </div>
              )}

              {/* CRediT 역할 — 본인은 직접 수정, leader 는 모두 수정 */}
              <div>
                <p className="mb-1 text-xs text-muted-foreground">기여 역할 (CRediT)</p>
                <CreditRoleSelector
                  value={m.creditRoles}
                  onChange={(roles) =>
                    updateCreditMut.mutate({ memberId: m.id, creditRoles: roles })
                  }
                  disabled={!isLeader && !isMe}
                  size="sm"
                />
              </div>

              {/* 자진 탈퇴 — 본인이 leader 아닐 때만 */}
              {isMe && !isMemberLeader && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm("연구팀에서 탈퇴하시겠습니까?")) leaveMut.mutate(m.id);
                  }}
                >
                  <LogOut size={14} className="mr-1" />
                  탈퇴
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>

      {isLeader && (
        <CollabResearchInviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          researchId={researchId}
          researchTitle={researchTitle}
          senderId={currentUserId}
          senderName={currentUserName}
          excludeUserIds={excludeIds}
        />
      )}
    </Card>
  );
}
