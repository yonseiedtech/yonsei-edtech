"use client";

import { useMemo, useState } from "react";
import { Search, X, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { profilesApi } from "@/lib/bkend";
import CollabResearchRoleBadge from "./CollabResearchRoleBadge";
import { COLLAB_MEMBER_ROLE_LABELS } from "../lib/research-status";
import type { CollabMemberRole, User } from "@/types";

export interface InviteDraft {
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  proposedRole: CollabMemberRole;
  message?: string;
}

interface Props {
  /** 이미 추가된 draft (중복 차단용) */
  value: InviteDraft[];
  onChange: (drafts: InviteDraft[]) => void;
  /** 제외할 userId (생성자 본인) */
  excludeUserIds: string[];
}

const ROLES: CollabMemberRole[] = ["co_researcher", "advisor", "reviewer", "assistant"];

/** 팀 생성 시 팀원을 미리 등록하기 위한 multi-picker.
 *  실제 invite 발송은 collaborativeResearch create 직후 호출자가 수행. */
export default function InviteDraftPicker({ value, onChange, excludeUserIds }: Props) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<CollabMemberRole>("co_researcher");
  const [message, setMessage] = useState("");

  const { data: users } = useQuery({
    queryKey: ["users", "for-collab-invite-draft"],
    queryFn: async () => {
      const res = await profilesApi.list({ limit: 500 });
      return res.data;
    },
    staleTime: 60_000,
  });

  const alreadyAddedIds = useMemo(
    () => new Set(value.map((d) => d.recipientId)),
    [value],
  );

  const filtered = useMemo(() => {
    if (!users) return [];
    const ex = new Set(excludeUserIds);
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => !ex.has(u.id) && !alreadyAddedIds.has(u.id))
      .filter((u) => {
        if (!q) return true;
        return (
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  }, [users, search, excludeUserIds, alreadyAddedIds]);

  const addUser = (u: User) => {
    onChange([
      ...value,
      {
        recipientId: u.id,
        recipientName: u.name ?? u.email ?? u.id,
        recipientEmail: u.email,
        proposedRole: role,
        message: message.trim() || undefined,
      },
    ]);
    setSearch("");
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const updateRole = (idx: number, next: CollabMemberRole) => {
    onChange(
      value.map((d, i) => (i === idx ? { ...d, proposedRole: next } : d)),
    );
  };

  return (
    <div className="space-y-4">
      {/* 추가된 초대 목록 */}
      {value.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">
            추가된 팀원 ({value.length}명) — 팀 생성과 동시에 초대장이 발송됩니다.
          </p>
          {value.map((d, idx) => (
            <div
              key={`${d.recipientId}-${idx}`}
              className="flex items-center justify-between gap-2 rounded border border-border bg-muted/5 px-3 py-2"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{d.recipientName}</p>
                {d.recipientEmail && (
                  <p className="text-xs text-muted-foreground">{d.recipientEmail}</p>
                )}
              </div>
              <select
                value={d.proposedRole}
                onChange={(e) => updateRole(idx, e.target.value as CollabMemberRole)}
                className="rounded border border-border px-2 py-1 text-xs"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {COLLAB_MEMBER_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <CollabResearchRoleBadge role={d.proposedRole} size="sm" />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="rounded p-1 text-muted-foreground hover:bg-muted/20"
                title="제거"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 새 팀원 추가 */}
      <div className="space-y-3 rounded border border-dashed border-border p-3">
        <Label htmlFor="invite-draft-search">팀원 추가 (선택)</Label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="invite-draft-search"
            placeholder="이름·이메일·아이디 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {search && (
          <div className="max-h-40 overflow-y-auto rounded border border-border bg-card">
            {filtered.length === 0 ? (
              <p className="p-3 text-center text-sm text-muted-foreground">결과 없음</p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => addUser(u)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/10"
                >
                  <span>
                    <span className="font-medium">{u.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>
                  </span>
                  <UserPlus size={14} className="text-primary" />
                </button>
              ))
            )}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="invite-draft-role" className="text-xs">
              기본 역할 (이후 항목별 변경 가능)
            </Label>
            <select
              id="invite-draft-role"
              value={role}
              onChange={(e) => setRole(e.target.value as CollabMemberRole)}
              className="block w-full rounded border border-border px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {COLLAB_MEMBER_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="invite-draft-message" className="text-xs">
              공통 메시지 (선택)
            </Label>
            <Textarea
              id="invite-draft-message"
              placeholder="모든 초대에 동일 메시지"
              rows={1}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          초대장은 팀이 생성되는 즉시 자동 발송되고, 수신자가 14일 이내 수락해야 합니다.
        </p>
      </div>

      {/* 빈 상태 안내 */}
      {value.length === 0 && (
        <p className="rounded bg-cat-1/10 px-3 py-2 text-xs text-cat-1">
          💡 지금 추가하지 않아도 팀 생성 후 멤버 페이지에서 언제든 초대할 수 있습니다.
        </p>
      )}
    </div>
  );
}
