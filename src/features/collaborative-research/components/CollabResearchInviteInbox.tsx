"use client";

import { useState } from "react";
import { Mail, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CollabResearchRoleBadge from "./CollabResearchRoleBadge";
import {
  useAcceptCollabInvite,
  useRejectCollabInvite,
} from "../api/useCollabResearch";
import type { CollabResearchInvite } from "@/types";

interface Props {
  invites: CollabResearchInvite[];
  recipientId: string;
}

export default function CollabResearchInviteInbox({ invites, recipientId }: Props) {
  const acceptMut = useAcceptCollabInvite();
  const rejectMut = useRejectCollabInvite();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!invites.length) return null;

  const handleAccept = async (id: string) => {
    setBusyId(id);
    try {
      await acceptMut.mutateAsync({ inviteId: id, recipientId });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    setBusyId(id);
    try {
      await rejectMut.mutateAsync(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
        <Mail size={16} />
        받은 초대 ({invites.length})
      </h2>
      <div className="space-y-2">
        {invites.map((invite) => (
          <Card key={invite.id} className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 space-y-1">
                <p className="text-sm">
                  <span className="font-semibold">{invite.senderName}</span>님이
                  <span className="ml-1 font-semibold">[{invite.researchTitle}]</span>
                  공동연구에 초대했습니다.
                </p>
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <span>역할:</span>
                  <CollabResearchRoleBadge role={invite.proposedRole} size="sm" />
                </div>
                {invite.message && (
                  <p className="rounded bg-white p-2 text-xs text-zinc-600">
                    “{invite.message}”
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(invite.id)}
                  disabled={busyId === invite.id}
                >
                  <Check size={14} className="mr-1" /> 수락
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(invite.id)}
                  disabled={busyId === invite.id}
                >
                  <X size={14} className="mr-1" /> 거절
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
