"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import {
  useMembers,
  useAllMembers,
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
import type { User, UserRole } from "@/types";
import { toast } from "sonner";
import {
  Search, RefreshCw, UserPlus, Clock, Users, UserCheck, XCircle,
  RotateCcw, Settings, Download,
} from "lucide-react";
import { exportCSV } from "@/lib/export-csv";
import { logAudit } from "@/lib/audit";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ASSIGNABLE_ROLES: UserRole[] = ["member", "alumni", "advisor", "staff", "president"];

// ── 역할별 배지 색상 ──
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  president: "bg-blue-100 text-blue-700 border-blue-200",
  staff: "bg-sky-100 text-sky-700 border-sky-200",
  advisor: "bg-teal-100 text-teal-700 border-teal-200",
  alumni: "bg-slate-100 text-slate-600 border-slate-200",
  member: "bg-gray-100 text-gray-600 border-gray-200",
  guest: "bg-gray-50 text-gray-400 border-gray-100",
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-semibold border", ROLE_COLORS[role] || ROLE_COLORS.member)}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}

type MemberTab = "all" | "pending" | "approved" | "rejected";

export default function AdminMemberTab() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canApprove = isStaffOrAbove(user);
  const [activeTab, setActiveTab] = useState<MemberTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  // API 데이터
  const { members: allMembers, isLoading: allLoading } = useAllMembers();
  const { pendingMembers, isLoading: pendingLoading } = usePendingMembers();
  const { members: approvedMembers } = useMembers();
  const { members, isLoading } = useMembers(
    roleFilter !== "all" ? { role: roleFilter } : undefined,
  );
  const { changeRole } = useChangeRole();

  // 승인대기 vs 거절 분리
  const truePending = useMemo(() => pendingMembers.filter((m) => !m.rejected), [pendingMembers]);
  const rejectedMembers = useMemo(() => pendingMembers.filter((m) => m.rejected), [pendingMembers]);

  // 수기 회원 추가
  const { createMember } = useCreateMember();
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "", email: "", role: "member" as UserRole,
    studentId: "", phone: "", field: "",
  });

  // 운영진 교체
  const [showHandover, setShowHandover] = useState(false);
  const { members: currentStaff } = useMembers({ role: "staff" });
  const { members: currentPresidents } = useMembers({ role: "president" });
  const currentLeadership = [...currentPresidents, ...currentStaff];
  const [newRoles, setNewRoles] = useState<{ memberId: string; role: UserRole }[]>([]);
  const { bulkChangeRoles, isLoading: bulkLoading } = useBulkChangeRoles();

  // 현재 탭에 따른 표시 대상 회원 목록
  const displayMembers = useMemo(() => {
    const source = activeTab === "all" ? allMembers : members;
    if (!searchQuery) return source;
    const q = searchQuery.toLowerCase();
    return source.filter(
      (m) => m.name.toLowerCase().includes(q) || m.username.toLowerCase().includes(q),
    );
  }, [activeTab, allMembers, members, searchQuery]);

  function handleRoleChange(userId: string, newRole: UserRole) {
    const target = allMembers.find((m) => m.id === userId);
    changeRole({ id: userId, role: newRole });
    toast.success("역할이 변경되었습니다.");
    logAudit({ action: "역할 변경", category: "role", detail: `${target?.name ?? userId}: ${target?.role ?? "?"} → ${newRole}`, targetId: userId, targetName: target?.name, userId: user?.id ?? "", userName: user?.name ?? "" });
  }

  async function executeHandover() {
    if (newRoles.length === 0) { toast.error("새 운영진을 선택해주세요."); return; }
    const changes: { id: string; role: UserRole }[] = [];
    for (const m of currentLeadership) {
      if (!newRoles.find((nr) => nr.memberId === m.id)) changes.push({ id: m.id, role: "member" });
    }
    for (const nr of newRoles) changes.push({ id: nr.memberId, role: nr.role });
    try {
      await bulkChangeRoles(changes);
      toast.success(`운영진 교체 완료 (${changes.length}건 변경)`);
      logAudit({ action: "운영진 교체", category: "role", detail: `${changes.length}건 역할 변경`, userId: user?.id ?? "", userName: user?.name ?? "" });
      setShowHandover(false);
      setNewRoles([]);
    } catch { toast.error("운영진 교체에 실패했습니다."); }
  }

  async function handleAddMember() {
    if (!newMember.name || !newMember.email) { toast.error("이름과 이메일은 필수입니다."); return; }
    if (!newMember.studentId) { toast.error("학번은 필수입니다."); return; }
    if (!newMember.phone) { toast.error("핸드폰 번호는 필수입니다."); return; }
    try {
      await createMember({
        ...newMember,
        username: newMember.email.split("@")[0],
        generation: 0,
      });
      toast.success(`${newMember.name} 회원이 추가되었습니다.`);
      setShowAddMember(false);
      setNewMember({ name: "", email: "", role: "member", studentId: "", phone: "", field: "" });
    } catch { toast.error("회원 추가에 실패했습니다."); }
  }

  // ── 검색/필터/액션 바 ──
  function ToolBar() {
    return (
      <div className="flex items-center justify-between flex-wrap gap-3">
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
          {activeTab === "approved" && (
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
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            const source = activeTab === "all" ? allMembers : displayMembers;
            exportCSV("회원목록", ["이름", "아이디", "이메일", "학번", "역할", "기수", "분야", "상태"],
              source.map((m) => [m.name, m.username, m.email, m.studentId, m.role, m.generation, m.field, m.approved ? "승인" : m.rejected ? "거절" : "대기"]),
            );
          }}>
            <Download size={14} className="mr-1" /> CSV 내보내기
          </Button>
          {canApprove && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)}>
                <UserPlus size={14} className="mr-1" /> 회원 추가
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowHandover(true)}>
                <RefreshCw size={14} className="mr-1" /> 운영진 교체
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── 역할 인라인 셀렉트 (배지 스타일) ──
  function RoleCell({ member: m }: { member: User }) {
    if (!canApprove) return <RoleBadge role={m.role} />;
    return (
      <select
        value={m.role}
        onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
        className={cn(
          "cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-semibold appearance-none outline-none",
          ROLE_COLORS[m.role] || ROLE_COLORS.member,
        )}
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>
    );
  }

  // ── 회원 테이블 ──
  function MemberTable({ data, showStatus }: { data: User[]; showStatus?: boolean }) {
    return (
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium">이름</th>
              <th className="px-4 py-3 text-left font-medium">아이디</th>
              <th className="px-4 py-3 text-left font-medium">학번</th>
              <th className="px-4 py-3 text-left font-medium">분야</th>
              <th className="px-4 py-3 text-left font-medium">역할</th>
              {showStatus && <th className="px-4 py-3 text-left font-medium">상태</th>}
              {canApprove && <th className="px-4 py-3 text-left font-medium">관리</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((m) => (
              <tr key={m.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-muted-foreground">@{m.username}</td>
                <td className="px-4 py-3">{m.studentId || "-"}</td>
                <td className="px-4 py-3">{m.field || "-"}</td>
                <td className="px-4 py-3"><RoleCell member={m} /></td>
                {showStatus && (
                  <td className="px-4 py-3">
                    {m.approved ? (
                      <Badge className="bg-green-100 text-green-700 text-[10px]">승인</Badge>
                    ) : m.rejected ? (
                      <Badge className="bg-red-100 text-red-700 text-[10px]">거절</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 text-[10px]">대기</Badge>
                    )}
                  </td>
                )}
                {canApprove && (
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/admin/members/${m.id}`)}
                      title="회원 상세 관리"
                    >
                      <Settings size={14} />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 탭 헤더 ── */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
        {([
          { key: "all" as const, icon: Users, label: "전체", count: allMembers.length, color: undefined },
          { key: "pending" as const, icon: Clock, label: "승인 대기", count: truePending.length, color: truePending.length > 0 ? "bg-amber-500 text-white" : undefined },
          { key: "approved" as const, icon: UserCheck, label: "승인 완료", count: approvedMembers.length, color: undefined },
          { key: "rejected" as const, icon: XCircle, label: "거절", count: rejectedMembers.length, color: rejectedMembers.length > 0 ? "bg-red-500 text-white" : undefined },
        ] as const).map(({ key, icon: Icon, label, count, color }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={16} />
            {label}
            {count > 0 && (
              <Badge variant={color ? "default" : "secondary"} className={cn("ml-1 text-[10px] px-1.5 py-0", color)}>
                {count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* ── 전체 탭 ── */}
      {activeTab === "all" && (
        <section>
          <ToolBar />
          {allLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : displayMembers.length === 0 ? (
            <div className="mt-3 rounded-xl border bg-white p-12 text-center">
              <Users size={40} className="mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-muted-foreground">
                {searchQuery ? "검색 결과가 없습니다." : "등록된 회원이 없습니다."}
              </p>
            </div>
          ) : (
            <MemberTable data={displayMembers} showStatus />
          )}
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

      {/* ── 승인 완료 탭 ── */}
      {activeTab === "approved" && (
        <section>
          <ToolBar />
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : displayMembers.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {searchQuery ? "검색 결과가 없습니다." : "등록된 회원이 없습니다."}
            </p>
          ) : (
            <MemberTable data={displayMembers} />
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
                  <div key={u.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.name}</span>
                        {u.studentId && <Badge variant="secondary">{u.studentId}</Badge>}
                        <Badge variant="outline" className="text-[10px] text-red-500 border-red-200">거절됨</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">@{u.username} · {u.email}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      changeRole({ id: u.id, role: "member" });
                      profilesApi.update(u.id, { rejected: false });
                      toast.success(`${u.name}을(를) 승인 대기로 복구했습니다.`);
                    }}>
                      <RotateCcw size={14} className="mr-1" /> 복구
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 수기 회원 추가 Dialog ── */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>회원 수기 추가</DialogTitle></DialogHeader>
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
                  placeholder="user@yonsei.ac.kr"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">아이디</label>
              <Input
                value={newMember.email ? newMember.email.split("@")[0] : ""}
                disabled
                className="bg-muted text-muted-foreground"
                placeholder="이메일 입력 시 자동 생성"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">학번 *</label>
                <Input
                  value={newMember.studentId}
                  onChange={(e) => setNewMember({ ...newMember, studentId: e.target.value })}
                  placeholder="예: 2024123456"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">핸드폰 번호 *</label>
                <Input
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  placeholder="010-1234-5678"
                  type="tel"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="mb-1.5 block text-sm font-medium">관심 분야</label>
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

      {/* ── 운영진 교체 Dialog ── */}
      <Dialog open={showHandover} onOpenChange={setShowHandover}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>운영진 교체</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium">현재 운영진</h4>
              {currentLeadership.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">현재 운영진이 없습니다.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentLeadership.map((m) => (<Badge key={m.id} variant="secondary">{m.name} — {ROLE_LABELS[m.role]}</Badge>))}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">교체 실행 시 기존 운영진은 자동으로 &quot;회원&quot;으로 변경됩니다.</p>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-medium">새 운영진 지정</h4>
              <div className="mt-2 space-y-2">
                {newRoles.map((nr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select value={nr.memberId} onChange={(e) => { const u = [...newRoles]; u[i] = { ...nr, memberId: e.target.value }; setNewRoles(u); }} className="flex-1 rounded-md border px-2 py-1.5 text-sm">
                      <option value="">회원 선택...</option>
                      {members.filter((m) => m.role === "member" || m.role === "alumni" || newRoles.some((r) => r.memberId === m.id)).map((m) => (<option key={m.id} value={m.id}>{m.name} ({m.studentId || "-"})</option>))}
                    </select>
                    <select value={nr.role} onChange={(e) => { const u = [...newRoles]; u[i] = { ...nr, role: e.target.value as UserRole }; setNewRoles(u); }} className="w-28 rounded-md border px-2 py-1.5 text-sm">
                      <option value="president">회장</option><option value="staff">운영진</option>
                    </select>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => setNewRoles(newRoles.filter((_, j) => j !== i))}>삭제</Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setNewRoles([...newRoles, { memberId: "", role: "staff" }])}>+ 추가</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHandover(false)}>취소</Button>
            <Button onClick={executeHandover} disabled={bulkLoading || newRoles.some((nr) => !nr.memberId)}>{bulkLoading ? "처리 중..." : "교체 실행"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
