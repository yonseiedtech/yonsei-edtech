"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useApproveMember, useRejectMember } from "@/features/member/useMembers";
import { auth } from "@/lib/firebase";
import type { User } from "@/types";

async function sendApprovalEmail(user: User, approved: boolean) {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch("/api/email/approval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: user.email, name: user.name, approved }),
    });
  } catch {
    // 이메일 발송 실패는 조용히 무시 (승인 자체는 성공)
  }
}

interface Props {
  users: User[];
}

export default function AdminUserList({ users }: Props) {
  const { approveMember } = useApproveMember();
  const { rejectMember } = useRejectMember();

  async function handleApprove(user: User) {
    try {
      await approveMember(user.id);
      toast.success(`${user.name} 승인 완료`);
      sendApprovalEmail(user, true);
    } catch {
      toast.error(`${user.name} 승인에 실패했습니다.`);
    }
  }

  async function handleReject(user: User) {
    try {
      await rejectMember(user.id);
      toast.error(`${user.name} 거부 완료`);
      sendApprovalEmail(user, false);
    } catch {
      toast.error(`${user.name} 거부에 실패했습니다.`);
    }
  }

  if (users.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground">
        대기 중인 회원이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <div
          key={u.id}
          className="flex items-center justify-between rounded-xl border bg-white p-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{u.name}</span>
              <Badge variant="secondary">{u.generation}기</Badge>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              @{u.username} · {u.field}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleApprove(u)}>
              <CheckCircle size={14} className="mr-1" />
              승인
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => handleReject(u)}
            >
              <XCircle size={14} className="mr-1" />
              거부
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
