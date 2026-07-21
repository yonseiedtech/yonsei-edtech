"use client";

import { useState, useMemo } from "react";
import { Search, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { profilesApi } from "@/lib/bkend";
import { useCreateCollabInvite } from "../api/useCollabResearch";
import { COLLAB_MEMBER_ROLE_LABELS } from "../lib/research-status";
import type { CollabMemberRole, User } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  researchId: string;
  researchTitle: string;
  senderId: string;
  senderName: string;
  excludeUserIds: string[];
}

const ROLES: CollabMemberRole[] = ["co_researcher", "advisor", "reviewer", "assistant"];

export default function CollabResearchInviteDialog({
  open,
  onOpenChange,
  researchId,
  researchTitle,
  senderId,
  senderName,
  excludeUserIds,
}: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User | null>(null);
  const [role, setRole] = useState<CollabMemberRole>("co_researcher");
  const [message, setMessage] = useState("");

  const createMut = useCreateCollabInvite();

  const { data: users } = useQuery({
    queryKey: ["users", "for-collab-invite"],
    queryFn: async () => {
      const res = await profilesApi.list({ limit: 500 });
      return res.data;
    },
    staleTime: 60_000,
    enabled: open,
  });

  const filtered = useMemo(() => {
    if (!users) return [];
    const ex = new Set(excludeUserIds);
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => !ex.has(u.id))
      .filter((u) => {
        if (!q) return true;
        return (
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q)
        );
      })
      .slice(0, 30);
  }, [users, search, excludeUserIds]);

  const handleSend = async () => {
    if (!selected) return;
    await createMut.mutateAsync({
      researchId,
      researchTitle,
      senderId,
      senderName,
      recipientId: selected.id,
      recipientEmail: selected.email,
      proposedRole: role,
      message: message.trim() || undefined,
    });
    setSelected(null);
    setMessage("");
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>공동연구 초대</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="collab-invite-search">초대할 회원</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="collab-invite-search"
                placeholder="이름·이메일·아이디 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            {search && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded border border-border">
                {filtered.length === 0 ? (
                  <p className="p-3 text-center text-sm text-muted-foreground">결과 없음</p>
                ) : (
                  filtered.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelected(u);
                        setSearch("");
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/10"
                    >
                      <span className="font-medium">{u.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {selected && (
              <div className="mt-2 rounded bg-primary/10 px-3 py-2 text-sm">
                <span className="font-medium">{selected.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{selected.email}</span>
                <button
                  type="button"
                  className="ml-2 text-xs text-muted-foreground hover:underline"
                  onClick={() => setSelected(null)}
                >
                  해제
                </button>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="collab-invite-role">제안 역할</Label>
            <select
              id="collab-invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as CollabMemberRole)}
              className="mt-1 block w-full rounded border border-border px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {COLLAB_MEMBER_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="collab-invite-message">메시지 (선택)</Label>
            <Textarea
              id="collab-invite-message"
              placeholder="초대 사유나 안내를 적어주세요"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            초대는 14일 후 자동 만료됩니다.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSend} disabled={!selected || createMut.isPending}>
            <Send size={14} className="mr-1" />
            초대 보내기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
