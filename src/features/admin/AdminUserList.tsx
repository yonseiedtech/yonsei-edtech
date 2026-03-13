"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/types";

interface Props {
  users: User[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export default function AdminUserList({ users, onApprove, onReject }: Props) {
  function handleApprove(user: User) {
    // TODO: bkend.ai admin API
    onApprove?.(user.id);
    toast.success(`${user.name} 승인 완료`);
  }

  function handleReject(user: User) {
    // TODO: bkend.ai admin API
    onReject?.(user.id);
    toast.error(`${user.name} 거부 완료`);
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
