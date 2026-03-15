"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isPresidentOrAbove } from "@/lib/permissions";
import {
  useMembers,
  usePendingMembers,
  useChangeRole,
  useBulkChangeRoles,
} from "@/features/member/useMembers";
import AdminUserList from "./AdminUserList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/types";
import type { UserRole } from "@/types";
import { toast } from "sonner";
import { Search, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ASSIGNABLE_ROLES: UserRole[] = ["member", "alumni", "advisor", "staff", "president"];

export default function AdminMemberTab() {
  const { user } = useAuthStore();
  const canApprove = isPresidentOrAbove(user);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  // API 데이터
  const { pendingMembers, isLoading: pendingLoading } = usePendingMembers();
  const { members, isLoading } = useMembers(
    roleFilter !== "all" ? { role: roleFilter } : undefined
  );
  const { changeRole } = useChangeRole();

  // 운영진 교체 상태
  const [showHandover, setShowHandover] = useState(false);
  const { members: currentStaff } = useMembers({ role: "staff" });
  const { members: currentPresidents } = useMembers({ role: "president" });
  const currentLeadership = [...currentPresidents, ...currentStaff];
  const [newRoles, setNewRoles] = useState<{ memberId: string; role: UserRole }[]>([]);
  const { bulkChangeRoles, isLoading: bulkLoading } = useBulkChangeRoles();

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  function handleRoleChange(userId: string, newRole: UserRole) {
    changeRole({ id: userId, role: newRole });
    toast.success("역할이 변경되었습니다.");
  }

  // 운영진 교체 실행
  async function executeHandover() {
    if (newRoles.length === 0) {
      toast.error("새 운영진을 선택해주세요.");
      return;
    }

    const changes: { id: string; role: UserRole }[] = [];

    // 기존 운영진 → member로 변경
    for (const m of currentLeadership) {
      const keepAsNew = newRoles.find((nr) => nr.memberId === m.id);
      if (!keepAsNew) {
        changes.push({ id: m.id, role: "member" });
      }
    }

    // 새 운영진 → 지정 역할로 변경
    for (const nr of newRoles) {
      changes.push({ id: nr.memberId, role: nr.role });
    }

    try {
      await bulkChangeRoles(changes);
      toast.success(`운영진 교체가 완료되었습니다. (${changes.length}건 변경)`);
      setShowHandover(false);
      setNewRoles([]);
    } catch {
      toast.error("운영진 교체에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-8">
      {/* 승인 대기 */}
      {canApprove && (
        <section>
          <h2 className="text-lg font-bold">승인 대기 회원</h2>
          <div className="mt-3">
            {pendingLoading ? (
              <p className="text-sm text-muted-foreground">로딩 중...</p>
            ) : (
              <AdminUserList users={pendingMembers} />
            )}
          </div>
        </section>
      )}

      {canApprove && <Separator />}

      {/* 전체 회원 */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">전체 회원</h2>
          {canApprove && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHandover(true)}
            >
              <RefreshCw size={14} className="mr-1" />
              운영진 교체
            </Button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="이름 또는 아이디 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-60 pl-9"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="all">전체 역할</option>
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="mt-6 flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {searchQuery ? "검색 결과가 없습니다." : "등록된 회원이 없습니다."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">이름</th>
                  <th className="px-4 py-3 text-left font-medium">아이디</th>
                  <th className="px-4 py-3 text-left font-medium">기수</th>
                  <th className="px-4 py-3 text-left font-medium">분야</th>
                  <th className="px-4 py-3 text-left font-medium">역할</th>
                  {canApprove && (
                    <th className="px-4 py-3 text-left font-medium">역할 변경</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMembers.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">@{m.username}</td>
                    <td className="px-4 py-3">{m.generation}기</td>
                    <td className="px-4 py-3">{m.field}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                    </td>
                    {canApprove && (
                      <td className="px-4 py-3">
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
                          className="rounded-md border px-2 py-1 text-sm"
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 운영진 교체 Dialog */}
      <Dialog open={showHandover} onOpenChange={setShowHandover}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>운영진 교체</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 현재 운영진 */}
            <div>
              <h4 className="text-sm font-medium">현재 운영진</h4>
              {currentLeadership.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">현재 운영진이 없습니다.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentLeadership.map((m) => (
                    <Badge key={m.id} variant="secondary">
                      {m.name} — {ROLE_LABELS[m.role]}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                교체 실행 시 기존 운영진은 자동으로 &quot;회원&quot;으로 변경됩니다.
              </p>
            </div>

            <Separator />

            {/* 새 운영진 선택 */}
            <div>
              <h4 className="text-sm font-medium">새 운영진 지정</h4>
              <div className="mt-2 space-y-2">
                {newRoles.map((nr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={nr.memberId}
                      onChange={(e) => {
                        const updated = [...newRoles];
                        updated[i] = { ...nr, memberId: e.target.value };
                        setNewRoles(updated);
                      }}
                      className="flex-1 rounded-md border px-2 py-1.5 text-sm"
                    >
                      <option value="">회원 선택...</option>
                      {members
                        .filter((m) => m.role === "member" || m.role === "alumni" || newRoles.some((r) => r.memberId === m.id))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.generation}기)
                          </option>
                        ))}
                    </select>
                    <select
                      value={nr.role}
                      onChange={(e) => {
                        const updated = [...newRoles];
                        updated[i] = { ...nr, role: e.target.value as UserRole };
                        setNewRoles(updated);
                      }}
                      className="w-28 rounded-md border px-2 py-1.5 text-sm"
                    >
                      <option value="president">회장</option>
                      <option value="staff">운영진</option>
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => setNewRoles(newRoles.filter((_, j) => j !== i))}
                    >
                      삭제
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNewRoles([...newRoles, { memberId: "", role: "staff" }])}
                >
                  + 추가
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHandover(false)}>
              취소
            </Button>
            <Button
              onClick={executeHandover}
              disabled={bulkLoading || newRoles.some((nr) => !nr.memberId)}
            >
              {bulkLoading ? "처리 중..." : "교체 실행"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
