"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, XCircle, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useApproveMember, useRejectMember } from "@/features/member/useMembers";
import { notifyMemberApproved, notifyMemberRejected } from "@/features/notifications/notify";
import { useAuthStore } from "@/features/auth/auth-store";
import { auth } from "@/lib/firebase";
import { logAudit } from "@/lib/audit";
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
  const { user: currentUser } = useAuthStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const allSelected = users.length > 0 && selected.size === users.length;
  const someSelected = selected.size > 0 && selected.size < users.length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
    }
  }

  async function handleApprove(user: User) {
    try {
      await approveMember(user.id);
      toast.success(`${user.name} 승인 완료`);
      notifyMemberApproved(user.id, user.name);
      sendApprovalEmail(user, true);
      logAudit({ action: "회원 승인", category: "member", detail: `${user.name} (${user.email}) 승인`, targetId: user.id, targetName: user.name, userId: currentUser?.id ?? "", userName: currentUser?.name ?? "" });
    } catch {
      toast.error(`${user.name} 승인에 실패했습니다.`);
    }
  }

  async function handleReject(user: User) {
    try {
      await rejectMember(user.id);
      toast.error(`${user.name} 거부 완료`);
      notifyMemberRejected(user.id, user.name);
      sendApprovalEmail(user, false);
      logAudit({ action: "회원 거절", category: "member", detail: `${user.name} (${user.email}) 거절`, targetId: user.id, targetName: user.name, userId: currentUser?.id ?? "", userName: currentUser?.name ?? "" });
    } catch {
      toast.error(`${user.name} 거부에 실패했습니다.`);
    }
  }

  async function handleBatchApprove() {
    const targets = users.filter((u) => selected.has(u.id));
    if (targets.length === 0) return;
    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: targets.length });
    let success = 0;
    for (const user of targets) {
      try {
        await approveMember(user.id);
        notifyMemberApproved(user.id, user.name);
        sendApprovalEmail(user, true);
        success++;
      } catch { /* 개별 실패는 무시 */ }
      setBatchProgress((prev) => ({ ...prev, current: prev.current + 1 }));
    }
    toast.success(`${success}명 일괄 승인 완료`);
    setSelected(new Set());
    setBatchProcessing(false);
  }

  async function handleBatchReject() {
    const targets = users.filter((u) => selected.has(u.id));
    if (targets.length === 0) return;
    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: targets.length });
    let success = 0;
    for (const user of targets) {
      try {
        await rejectMember(user.id);
        notifyMemberRejected(user.id, user.name);
        sendApprovalEmail(user, false);
        success++;
      } catch { /* 개별 실패는 무시 */ }
      setBatchProgress((prev) => ({ ...prev, current: prev.current + 1 }));
    }
    toast.success(`${success}명 일괄 거절 완료`);
    setSelected(new Set());
    setBatchProcessing(false);
  }

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
        대기 중인 회원이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 일괄 액션 바 */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={allSelected}
            {...(someSelected ? { "data-state": "indeterminate" } : {})}
            onCheckedChange={toggleAll}
            disabled={batchProcessing}
          />
          <span className="text-sm font-medium">
            {selected.size > 0 ? `${selected.size}명 선택` : "전체 선택"}
          </span>
        </label>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            {batchProcessing && (
              <span className="text-xs text-muted-foreground">
                {batchProgress.current}/{batchProgress.total} 처리 중...
              </span>
            )}
            <Button
              size="sm"
              onClick={handleBatchApprove}
              disabled={batchProcessing}
            >
              {batchProcessing ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <CheckCheck size={14} className="mr-1" />
              )}
              일괄 승인
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={handleBatchReject}
              disabled={batchProcessing}
            >
              {batchProcessing ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <XCircle size={14} className="mr-1" />
              )}
              일괄 거절
            </Button>
          </div>
        )}
      </div>

      {/* 회원 목록 */}
      {users.map((u) => (
        <div
          key={u.id}
          className={`flex items-center justify-between rounded-2xl border bg-card p-4 transition-colors ${
            selected.has(u.id) ? "ring-2 ring-primary/30 bg-primary/5" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selected.has(u.id)}
              onCheckedChange={() => toggleSelect(u.id)}
              disabled={batchProcessing}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{u.name}</span>
                <Badge variant="secondary">{u.studentId || "-"}</Badge>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                @{u.username} · {u.field}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleApprove(u)} disabled={batchProcessing}>
              <CheckCircle size={14} className="mr-1" />
              승인
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => handleReject(u)}
              disabled={batchProcessing}
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
