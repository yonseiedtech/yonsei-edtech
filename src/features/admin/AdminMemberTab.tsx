"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import {
  useMembers,
  usePendingMembers,
  useChangeRole,
  useBulkChangeRoles,
  useCreateMember,
} from "@/features/member/useMembers";
import { profilesApi } from "@/lib/bkend";
import AdminUserList from "./AdminUserList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/types";
import type { UserRole } from "@/types";
import { toast } from "sonner";
import { Search, RefreshCw, UserPlus, Clock, Users, UserCheck, XCircle, RotateCcw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ASSIGNABLE_ROLES: UserRole[] = ["member", "alumni", "advisor", "staff", "president"];

type MemberTab = "all" | "pending" | "approved" | "rejected";

export default function AdminMemberTab() {
  const { user } = useAuthStore();
  const canApprove = isStaffOrAbove(user);
  const [activeTab, setActiveTab] = useState<MemberTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  // API 데이터
  const { pendingMembers, isLoading: pendingLoading } = usePendingMembers();
  const { members: approvedMembers } = useMembers(); // 승인 회원
  const { members, isLoading } = useMembers(
    roleFilter !== "all" ? { role: roleFilter } : undefined
  );
  const { changeRole } = useChangeRole();

  // 전체 회원 = 승인 + 미승인(대기+거절) 합산
  const allMembers = useMemo(
    () => [...approvedMembers, ...pendingMembers],
    [approvedMembers, pendingMembers],
  );

  // 승인대기(pending) vs 거절(rejected) 분리
  const truePending = useMemo(
    () => pendingMembers.filter((m) => !m.rejected),
    [pendingMembers],
  );
  const rejectedMembers = useMemo(
    () => pendingMembers.filter((m) => m.rejected),
    [pendingMembers],
  );

  // 수기 회원 추가
  const { createMember } = useCreateMember();
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    username: "",
    role: "member" as UserRole,
    generation: 0,
    field: "",
  });

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

  async function executeHandover() {
    if (newRoles.length === 0) {
      toast.error("새 운영진을 선택해주세요.");
      return;
    }

    const changes: { id: string; role: UserRole }[] = [];

    for (const m of currentLeadership) {
      const keepAsNew = newRoles.find((nr) => nr.memberId === m.id);
      if (!keepAsNew) {
        changes.push({ id: m.id, role: "member" });
      }
    }

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

  async function handleAddMember() {
    if (!newMember.name || !newMember.email) {
      toast.error("이름과 이메일은 필수입니다.");
      return;
    }
    try {
      await createMember({
        ...newMember,
        username: newMember.username || newMember.email.split("@")[0],
      });
      toast.success(`${newMember.name} 회원이 추가되었습니다.`);
      setShowAddMember(false);
      setNewMember({ name: "", email: "", username: "", role: "member", generation: 0, field: "" });
    } catch {
      toast.error("회원 추가에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 탭 헤더 ── */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "all"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Users size={16} />
          전체
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
            {allMembers.length}
          </Badge>
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "pending"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Clock size={16} />
          승인 대기
          {truePending.length > 0 && (
            <Badge className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0">
              {truePending.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "approved"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <UserCheck size={16} />
          승인 완료
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
            {approvedMembers.length}
          </Badge>
        </button>
        <button
          onClick={() => setActiveTab("rejected")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "rejected"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <XCircle size={16} />
          거절
          {rejectedMembers.length > 0 && (
            <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0">
              {rejectedMembers.length}
            </Badge>
          )}
        </button>
      </div>

      {/* ── 전체 탭 ── */}
      {activeTab === "all" && (
        <section>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">이름</th>
                  <th className="px-4 py-3 text-left font-medium">아이디</th>
                  <th className="px-4 py-3 text-left font-medium">기수</th>
                  <th className="px-4 py-3 text-left font-medium">역할</th>
                  <th className="px-4 py-3 text-left font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allMembers.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">@{m.username}</td>
                    <td className="px-4 py-3">{m.generation > 0 ? `${m.generation}기` : "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {m.approved ? (
                        <Badge className="bg-green-100 text-green-700 text-[10px]">승인</Badge>
                      ) : m.rejected ? (
                        <Badge className="bg-red-100 text-red-700 text-[10px]">거절</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 text-[10px]">대기</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── 승인 대기 탭 ── */}
      {activeTab === "pending" && (
        <section>
          {pendingLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : truePending.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center">
              <Clock size={40} className="mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-muted-foreground">승인 대기 중인 회원이 없습니다.</p>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm text-muted-foreground">
                {truePending.length}명의 회원이 승인을 기다리고 있습니다.
              </p>
              <AdminUserList users={truePending} />
            </div>
          )}
        </section>
      )}

      {/* ── 거절 탭 ── */}
      {activeTab === "rejected" && (
        <section>
          {pendingLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : rejectedMembers.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center">
              <XCircle size={40} className="mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-muted-foreground">거절된 회원이 없습니다.</p>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm text-muted-foreground">
                {rejectedMembers.length}명의 가입이 거절되었습니다.
              </p>
              <div className="space-y-3">
                {rejectedMembers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-xl border bg-white p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.name}</span>
                        {u.generation > 0 && (
                          <Badge variant="secondary">{u.generation}기</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] text-red-500 border-red-200">
                          거절됨
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        @{u.username} · {u.email}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        changeRole({ id: u.id, role: "member" });
                        // 거절 해제 → 승인 대기로 복구
                        profilesApi.update(u.id, { rejected: false });
                        toast.success(`${u.name}을(를) 승인 대기로 복구했습니다.`);
                      }}
                    >
                      <RotateCcw size={14} className="mr-1" />
                      복구
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 승인 완료 탭 ── */}
      {activeTab === "approved" && (
        <section>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
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
            {canApprove && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddMember(true)}
                >
                  <UserPlus size={14} className="mr-1" />
                  회원 추가
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowHandover(true)}
                >
                  <RefreshCw size={14} className="mr-1" />
                  운영진 교체
                </Button>
              </div>
            )}
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
      )}

      {/* 수기 회원 추가 Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>회원 수기 추가</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">이름 *</label>
                <Input
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">이메일 *</label>
                <Input
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">아이디 (username)</label>
                <Input
                  value={newMember.username}
                  onChange={(e) => setNewMember({ ...newMember, username: e.target.value })}
                  placeholder="미입력 시 이메일에서 자동 생성"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">역할</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value as UserRole })}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">기수</label>
                <Input
                  type="number"
                  value={newMember.generation || ""}
                  onChange={(e) => setNewMember({ ...newMember, generation: parseInt(e.target.value) || 0 })}
                  placeholder="1"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">분야</label>
                <Input
                  value={newMember.field}
                  onChange={(e) => setNewMember({ ...newMember, field: e.target.value })}
                  placeholder="교육공학"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>취소</Button>
            <Button onClick={handleAddMember}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 운영진 교체 Dialog */}
      <Dialog open={showHandover} onOpenChange={setShowHandover}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>운영진 교체</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
