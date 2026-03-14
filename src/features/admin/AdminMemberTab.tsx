"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isPresidentOrAbove } from "@/lib/permissions";
import AdminUserList from "./AdminUserList";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/types";
import type { User, UserRole } from "@/types";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const PENDING_USERS: User[] = [
  { id: "10", username: "honggildong", name: "홍길동", generation: 4, field: "AI 교육", role: "member", approved: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "11", username: "kimcs", name: "김철수", generation: 4, field: "VR 교육", role: "member", approved: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const ALL_MEMBERS: User[] = [
  { id: "1", username: "admin", name: "관리자", generation: 1, field: "교육공학", role: "admin", approved: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "2", username: "president", name: "김회장", generation: 12, field: "교수설계", role: "president", approved: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "3", username: "staff", name: "이운영", generation: 12, field: "에듀테크", role: "staff", approved: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "4", username: "alumni", name: "박졸업", generation: 5, field: "학습과학", role: "alumni", approved: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "5", username: "advisor", name: "최자문", generation: 1, field: "교육공학", role: "advisor", approved: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
];

const ASSIGNABLE_ROLES: UserRole[] = ["member", "alumni", "advisor", "staff", "president"];

export default function AdminMemberTab() {
  const { user } = useAuthStore();
  const canApprove = isPresidentOrAbove(user);
  const [members, setMembers] = useState(ALL_MEMBERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [members, searchQuery, roleFilter]);

  function handleRoleChange(userId: string, newRole: User["role"]) {
    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
    );
    toast.success("역할이 변경되었습니다.");
  }

  return (
    <div className="space-y-8">
      {canApprove && (
        <section>
          <h2 className="text-lg font-bold">승인 대기 회원</h2>
          <div className="mt-3">
            <AdminUserList users={PENDING_USERS} />
          </div>
        </section>
      )}

      {canApprove && <Separator />}

      <section>
        <h2 className="text-lg font-bold">전체 회원</h2>
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
        <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
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
                        onChange={(e) => handleRoleChange(m.id, e.target.value as User["role"])}
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
      </section>
    </div>
  );
}
