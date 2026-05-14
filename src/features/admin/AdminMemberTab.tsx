"use client";

import { useState, useMemo, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
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
  useDeleteMember,
} from "@/features/member/useMembers";
import { profilesApi } from "@/lib/bkend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS, ENROLLMENT_STATUS_LABELS, OCCUPATION_LABELS } from "@/types";
import type { User, UserRole } from "@/types";
import { toast } from "sonner";
import {
  Search, RefreshCw, UserPlus, Clock, Users, UserCheck, XCircle,
  RotateCcw, Settings, Download, ShieldCheck, AlertTriangle, AlertCircle,
  CheckSquare, Square, Trash2, ArrowUp, ArrowDown, ArrowUpDown,
} from "lucide-react";
import { evaluateSignup, partitionPending } from "@/lib/auth/approval-rules";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { notifyMemberApproved } from "@/features/notifications/notify";
import { exportCSV } from "@/lib/export-csv";
import { logAudit } from "@/lib/audit";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ASSIGNABLE_ROLES: UserRole[] = ["member", "alumni", "advisor", "staff", "president", "admin", "sysadmin"];

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
function formatLastLogin(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const yy = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dow = DAY_KO[d.getDay()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${yy}년${m}월${day}일(${dow}) ${hh}:${mm}`;
}

function formatPhone(p?: string): string {
  if (!p) return "-";
  const d = p.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

// ── 역할별 배지 색상 ──
const ROLE_COLORS: Record<string, string> = {
  sysadmin: "bg-rose-100 text-rose-700 border-rose-200",
  admin: "bg-blue-100 text-blue-700 border-blue-200",
  president: "bg-blue-100 text-blue-700 border-blue-200",
  staff: "bg-sky-100 text-sky-700 border-sky-200",
  advisor: "bg-teal-100 text-teal-700 border-teal-200",
  alumni: "bg-slate-100 text-slate-600 border-slate-200",
  member: "bg-gray-100 text-gray-600 border-gray-200",
  guest: "bg-gray-50 text-gray-400 border-gray-100",
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
        ROLE_COLORS[role] || ROLE_COLORS.member,
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

// ── 회원 상태별 행 시각 스타일 ──
function rowStatusClass(m: User): string {
  if (m.rejected) return "bg-red-50/50 border-l-4 border-l-red-300";
  if (!m.approved) return "bg-amber-50/50 border-l-4 border-l-amber-300";
  return "";
}

function cardStatusClass(m: User): string {
  if (m.rejected) return "border-red-300 bg-red-50/40";
  if (!m.approved) return "border-amber-300 bg-amber-50/40";
  return "";
}

// ── 현재 신분 유형 라벨 ──
function currentStatusLabel(m: User): string {
  if (m.occupation) return OCCUPATION_LABELS[m.occupation];
  if (m.enrollmentStatus === "graduated") return "졸업생";
  if (m.enrollmentStatus === "on_leave") return "휴학생";
  if (m.enrollmentStatus === "enrolled") return "재학생";
  return "-";
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
  const { deleteMember, isLoading: deleting } = useDeleteMember();

  // 회원 탈퇴 확인 다이얼로그
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  async function handleDelete() {
    if (!deleteTarget) return;
    if (deleteConfirm !== deleteTarget.name) {
      toast.error("이름이 일치하지 않습니다.");
      return;
    }
    try {
      await deleteMember(deleteTarget.id);
      toast.success(`${deleteTarget.name} 회원을 탈퇴 처리했습니다.`);
      logAudit({
        action: "회원 탈퇴 (관리자)",
        category: "role",
        detail: `${deleteTarget.name}(@${deleteTarget.username}) 계정 삭제`,
        targetId: deleteTarget.id,
        targetName: deleteTarget.name,
        userId: user?.id ?? "",
        userName: user?.name ?? "",
      });
      setDeleteTarget(null);
      setDeleteConfirm("");
    } catch {
      toast.error("회원 탈퇴 처리에 실패했습니다.");
    }
  }

  // 승인대기 vs 거절 분리
  const truePending = useMemo(() => pendingMembers.filter((m) => !m.rejected), [pendingMembers]);
  const rejectedMembers = useMemo(() => pendingMembers.filter((m) => m.rejected), [pendingMembers]);

  // 자동 승인 규칙 평가
  const { qualifying: qualifyingPending } = useMemo(
    () => partitionPending(truePending, allMembers),
    [truePending, allMembers],
  );

  // 자동 승인 토글 (localStorage 영속)
  const [autoApprove, setAutoApprove] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setAutoApprove(localStorage.getItem("autoApproveEnabled") === "true");
  }, []);
  function toggleAutoApprove(next: boolean) {
    setAutoApprove(next);
    if (typeof window !== "undefined") localStorage.setItem("autoApproveEnabled", String(next));
    toast.success(next ? "자동 승인이 켜졌습니다" : "자동 승인이 꺼졌습니다");
  }

  // 일괄 승인 처리
  const [bulkApproving, setBulkApproving] = useState(false);

  // 수동 선택 일괄 승인
  const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set());
  function togglePendingSelect(id: string) {
    setSelectedPending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  async function handleApproveSelected() {
    if (selectedPending.size === 0) return;
    if (!confirm(`선택된 ${selectedPending.size}명을 일괄 승인하시겠습니까?`)) return;
    setBulkApproving(true);
    let ok = 0;
    let fail = 0;
    for (const id of selectedPending) {
      const u = truePending.find((p) => p.id === id);
      if (!u) continue;
      try {
        await profilesApi.approve(u.id);
        await notifyMemberApproved(u.id, u.name);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBulkApproving(false);
    setSelectedPending(new Set());
    if (fail === 0) toast.success(`${ok}명 승인 완료`);
    else toast.warning(`승인: ${ok}명 / 실패: ${fail}명`);
    logAudit({
      action: "회원 일괄 승인",
      category: "role",
      detail: `${ok}건 승인 (수동 선택${fail > 0 ? `, 실패 ${fail}건` : ""})`,
      userId: user?.id ?? "",
      userName: user?.name ?? "",
    });
  }

  // 자동 승인: 토글 ON + 자격 대기자 발생 시 자동 처리
  useEffect(() => {
    if (!autoApprove || !canApprove || bulkApproving) return;
    if (qualifyingPending.length === 0) return;
    (async () => {
      setBulkApproving(true);
      let ok = 0;
      for (const u of qualifyingPending) {
        try {
          await profilesApi.approve(u.id);
          await notifyMemberApproved(u.id, u.name);
          ok++;
        } catch {}
      }
      setBulkApproving(false);
      if (ok > 0) toast.success(`자동 승인 완료: ${ok}명`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoApprove, qualifyingPending.length]);

  async function handleBulkApprove() {
    if (qualifyingPending.length === 0) return;
    if (!confirm(`자동 승인 가능 ${qualifyingPending.length}명을 일괄 승인하시겠습니까?`)) return;
    setBulkApproving(true);
    let successCount = 0;
    let errorCount = 0;
    for (const u of qualifyingPending) {
      try {
        await profilesApi.approve(u.id);
        await notifyMemberApproved(u.id, u.name);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    setBulkApproving(false);
    if (errorCount === 0) {
      toast.success(`${successCount}명 일괄 승인 완료`);
    } else {
      toast.warning(`승인 완료: ${successCount}명 / 실패: ${errorCount}명`);
    }
  }

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

  // 정렬 (테이블 헤더 클릭 시 토글) — 컬럼별 asc/desc, null = 기본 순서
  type SortKey =
    | "name" | "studentId" | "enrollmentStatus" | "accumulatedSemesters"
    | "currentStatus" | "phone" | "role" | "lastLoginAt";
  // 기본 정렬: 최근 접속 desc — 운영진이 가장 최근 접속한 회원부터 보도록
  const [sortKey, setSortKey] = useState<SortKey | null>("lastLoginAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      // desc → asc → 해제 (lastLoginAt 의 경우 자연스러운 순환)
      if (sortDir === "desc") setSortDir("asc");
      else { setSortKey(null); setSortDir("asc"); }
    } else {
      setSortKey(key);
      // lastLoginAt 은 항상 desc 부터 (최근이 위), 다른 키는 asc 부터
      setSortDir(key === "lastLoginAt" ? "desc" : "asc");
    }
  }
  function getSortValue(m: User, key: SortKey): string | number {
    switch (key) {
      case "name": return (m.name ?? "").toLowerCase();
      case "studentId": return (m.studentId || m.username || "").toLowerCase();
      case "enrollmentStatus":
        return m.enrollmentStatus ? ENROLLMENT_STATUS_LABELS[m.enrollmentStatus] : "";
      case "accumulatedSemesters": return m.accumulatedSemesters ?? -1;
      case "currentStatus": {
        const occ = m.occupation ? OCCUPATION_LABELS[m.occupation] : "";
        return (occ || (m.enrollmentStatus ? ENROLLMENT_STATUS_LABELS[m.enrollmentStatus] : "")).toLowerCase();
      }
      case "phone": return (m.phone ?? "").replace(/\D/g, "");
      case "role": return ROLE_LABELS[m.role] ?? "";
      case "lastLoginAt": return m.lastLoginAt ? new Date(m.lastLoginAt).getTime() : 0;
    }
  }

  // 현재 탭에 따른 표시 대상 회원 목록 (검색 + 정렬 적용)
  const displayMembers = useMemo(() => {
    const source = activeTab === "all" ? allMembers : members;
    const q = searchQuery.toLowerCase();
    const filtered = !searchQuery
      ? source
      : source.filter(
          (m) => m.name.toLowerCase().includes(q) || m.username.toLowerCase().includes(q),
        );
    if (!sortKey) return filtered;
    const sorted = [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv), "ko");
    });
    return sortDir === "desc" ? sorted.reverse() : sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, allMembers, members, searchQuery, sortKey, sortDir]);

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
  // Sprint 67: 함수 컴포넌트 → JSX 상수로 변경 (검색 input focus 손실 버그 수정).
  // 함수 컴포넌트를 컴포넌트 내부에 정의하면 매 render 마다 새 컴포넌트 identity 가 생성되어
  // React 가 unmount/remount → input 이 첫 글자 입력 후 blur 됨.
  const toolBarJsx = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="이름 또는 아이디 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:w-60"
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
            exportCSV("회원목록",
              ["이름", "아이디", "이메일", "학번", "역할", "기수", "신분유형", "누적학기", "현재 신분 유형", "연락처", "분야", "관심 연구분야", "상태"],
              source.map((m) => [
                m.name,
                m.username,
                m.email,
                m.studentId,
                m.role,
                m.generation,
                m.enrollmentStatus ? ENROLLMENT_STATUS_LABELS[m.enrollmentStatus] : "",
                m.accumulatedSemesters ?? "",
                currentStatusLabel(m),
                m.phone,
                m.field,
                (m.researchInterests ?? []).join(", "),
                m.approved ? "승인" : m.rejected ? "거절" : "대기",
              ]),
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

  // ── 역할 인라인 셀렉트 (배지 스타일) ──
  function RoleCell({ member: m }: { member: User }) {
    if (!canApprove) return <RoleBadge role={m.role} />;
    return (
      <select
        value={m.role}
        onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
        className={cn(
          "inline-flex w-fit cursor-pointer rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none appearance-none outline-none",
          ROLE_COLORS[m.role] || ROLE_COLORS.member,
        )}
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>
    );
  }

  // ── 회원 모바일 카드 ──
  function MemberMobileCard({ m }: { m: User; showStatus?: boolean }) {
    const cardCls = cardStatusClass(m);
    return (
      <div className={cn("rounded-2xl border bg-card p-4", cardCls)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-sm">{m.name}</span>
              <span className="text-xs text-muted-foreground">@{m.username}</span>
              <RoleCell member={m} />
              {m.rejected && (
                <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">거절</span>
              )}
              {!m.approved && !m.rejected && (
                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">대기</span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {m.studentId && <span>학번: {m.studentId}</span>}
              {m.enrollmentStatus && (
                <span>신분: {ENROLLMENT_STATUS_LABELS[m.enrollmentStatus]}</span>
              )}
              {m.accumulatedSemesters != null && <span>누적학기: {m.accumulatedSemesters}</span>}
              <span>현재: {currentStatusLabel(m)}</span>
              {m.phone && <span>{m.phone}</span>}
              {m.lastLoginAt && <span>접속: {formatLastLogin(m.lastLoginAt)}</span>}
            </div>
          </div>
          {canApprove && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push(`/console/members/${m.id}`)}
                title="회원 상세 관리"
              >
                <Settings size={14} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => { setDeleteTarget(m); setDeleteConfirm(""); }}
                title="회원 탈퇴"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 회원 테이블 ──
  function SortableTh<K extends string>({ sortKey: key, label, current, dir, onClick }: {
    sortKey: K; label: string; current: K | null; dir: "asc" | "desc"; onClick: (k: K) => void;
  }) {
    const active = current === key;
    const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th
        scope="col"
        className={cn(
          "px-4 py-3 text-left font-medium select-none cursor-pointer hover:bg-muted/50 transition-colors",
          active && "text-primary",
        )}
        onClick={() => onClick(key)}
        title={`${label} 정렬 (오름차순 → 내림차순 → 해제)`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <Icon size={12} className={cn(!active && "opacity-40")} />
        </span>
      </th>
    );
  }

  function MemberTable({ data }: { data: User[]; showStatus?: boolean }) {
    return (
      <>
        {/* 모바일 카드 뷰 */}
        <div className="mt-3 space-y-2 sm:hidden">
          {data.map((m) => (
            <MemberMobileCard key={m.id} m={m} />
          ))}
        </div>
        {/* 데스크톱 테이블 */}
        <div className="mt-3 hidden overflow-x-auto rounded-2xl border bg-card sm:block">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="border-b bg-muted/30">
              <tr>
                <SortableTh sortKey="name" label="이름" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh sortKey="studentId" label="학번(아이디)" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh sortKey="enrollmentStatus" label="신분유형" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh sortKey="accumulatedSemesters" label="누적학기" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh sortKey="currentStatus" label="현재 신분 유형" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh sortKey="phone" label="연락처" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh sortKey="role" label="역할" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableTh sortKey="lastLoginAt" label="최근 접속" current={sortKey} dir={sortDir} onClick={toggleSort} />
                {canApprove && <th className="px-4 py-3 text-left font-medium">관리</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((m) => (
                <tr key={m.id} className={cn("hover:bg-muted/20", rowStatusClass(m))}>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.studentId || m.username}</div>
                    {m.studentId && (
                      <div className="text-xs text-muted-foreground">@{m.username}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.enrollmentStatus ? ENROLLMENT_STATUS_LABELS[m.enrollmentStatus] : "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.accumulatedSemesters != null ? `${m.accumulatedSemesters}학기` : "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{currentStatusLabel(m)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatPhone(m.phone)}</td>
                  <td className="px-4 py-3"><RoleCell member={m} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatLastLogin(m.lastLoginAt)}</td>
                  {canApprove && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/console/members/${m.id}`)}
                          title="회원 상세 관리"
                        >
                          <Settings size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => { setDeleteTarget(m); setDeleteConfirm(""); }}
                          title="회원 탈퇴"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={Users}
        title="회원 관리"
        description="회원 가입 승인, 역할 부여, 운영진 교체를 관리합니다."
      />
      {/* ── 탭 헤더 ── */}
      <nav className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-1">
        {([
          { key: "all" as const, icon: Users, label: "전체", count: allMembers.length, color: undefined },
          { key: "pending" as const, icon: Clock, label: "대기", count: truePending.length, color: truePending.length > 0 ? "bg-amber-500 text-white" : undefined },
          { key: "approved" as const, icon: UserCheck, label: "승인", count: approvedMembers.length, color: undefined },
          { key: "rejected" as const, icon: XCircle, label: "거절", count: rejectedMembers.length, color: rejectedMembers.length > 0 ? "bg-red-500 text-white" : undefined },
        ] as const).map(({ key, icon: Icon, label, count, color }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm",
              activeTab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
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
      </nav>

      {/* ── 전체 탭 ── */}
      {activeTab === "all" && (
        <section>
          {toolBarJsx}
          {allLoading ? (
            <div className="mt-3 space-y-2" aria-busy="true" aria-label="회원 목록 불러오는 중">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : displayMembers.length === 0 ? (
            <div className="mt-3 rounded-2xl border bg-card p-12 text-center">
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
          {/* 자동 승인 토글 — 대기자 유무 관계없이 항상 표시 */}
          {canApprove && (
            <div className="mb-4 flex items-center justify-between rounded-2xl border bg-card p-4">
              <div>
                <p className="text-sm font-medium">자동 승인</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  켜두면 승인 규칙을 통과한 가입 신청자(@yonsei.ac.kr 이메일 + 학번 + 중복 없음)를 자동으로 승인합니다.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoApprove}
                onClick={() => toggleAutoApprove(!autoApprove)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
                  autoApprove ? "bg-green-500" : "bg-gray-300",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow ring-0 transition-transform",
                    autoApprove ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>
          )}
          {pendingLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="승인 대기 목록 불러오는 중">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : truePending.length === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center">
              <Clock size={40} className="mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-muted-foreground">승인 대기 중인 회원이 없습니다.</p>
              {autoApprove && (
                <p className="mt-2 text-xs text-green-700">자동 승인이 켜져 있습니다.</p>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    {truePending.length}명 대기 중 — 자동 승인 가능{" "}
                    <span className="font-semibold text-green-700">{qualifyingPending.length}명</span>
                  </p>
                  {canApprove && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const allSelected = truePending.length > 0 && truePending.every((u) => selectedPending.has(u.id));
                        if (allSelected) setSelectedPending(new Set());
                        else setSelectedPending(new Set(truePending.map((u) => u.id)));
                      }}
                    >
                      {truePending.length > 0 && truePending.every((u) => selectedPending.has(u.id))
                        ? <CheckSquare size={14} className="text-primary" />
                        : <Square size={14} />}
                      전체 선택
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canApprove && selectedPending.size > 0 && (
                    <Button size="sm" variant="default" onClick={handleApproveSelected} disabled={bulkApproving}>
                      {bulkApproving ? (
                        <div className="mr-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <UserCheck size={14} className="mr-1" />
                      )}
                      선택 {selectedPending.size}명 승인
                    </Button>
                  )}
                  {canApprove && qualifyingPending.length > 0 && (
                    <Button size="sm" variant="outline" onClick={handleBulkApprove} disabled={bulkApproving}>
                      {bulkApproving ? (
                        <div className="mr-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <ShieldCheck size={14} className="mr-1" />
                      )}
                      자동 승인 가능 {qualifyingPending.length}명 일괄 승인
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {truePending.map((u) => {
                  const eval_ = evaluateSignup(u, allMembers);
                  const riskIcon = eval_.qualifying
                    ? <ShieldCheck size={14} className="text-green-600" />
                    : eval_.risk === "medium"
                    ? <AlertTriangle size={14} className="text-amber-500" />
                    : <AlertCircle size={14} className="text-red-500" />;
                  const riskColor = eval_.qualifying
                    ? "border-green-200 bg-green-50"
                    : eval_.risk === "medium"
                    ? "border-amber-200 bg-amber-50"
                    : "border-red-200 bg-red-50";
                  return (
                    <div key={u.id} className={cn("flex items-start justify-between rounded-2xl border p-4", riskColor)}>
                      {canApprove && (
                        <button
                          type="button"
                          onClick={() => togglePendingSelect(u.id)}
                          className="mr-3 mt-0.5 shrink-0"
                          aria-label={selectedPending.has(u.id) ? "선택 해제" : "선택"}
                          title={selectedPending.has(u.id) ? "선택 해제" : "일괄 승인 대상으로 선택"}
                        >
                          {selectedPending.has(u.id)
                            ? <CheckSquare size={18} className="text-primary" />
                            : <Square size={18} className="text-muted-foreground" />}
                        </button>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {riskIcon}
                          <span className="font-medium">{u.name}</span>
                          {u.studentId && <Badge variant="secondary">{u.studentId}</Badge>}
                          {eval_.qualifying ? (
                            <Badge className="bg-green-100 text-green-700 text-[10px]">자동 승인 가능</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 text-[10px]">수동 검토 필요</Badge>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">@{u.username} · {u.email || "-"}</div>
                        {!eval_.qualifying && eval_.reasons.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {eval_.reasons.map((r, i) => (
                              <span key={i} className="rounded-full bg-card border border-red-200 px-2 py-0.5 text-[10px] text-red-600">{r}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {canApprove && (
                        <Button size="sm" variant="ghost" className="ml-3 shrink-0" onClick={() => router.push(`/console/members/${u.id}`)}>
                          <Settings size={14} />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 승인 완료 탭 ── */}
      {activeTab === "approved" && (
        <section>
          {toolBarJsx}
          {isLoading ? (
            <div className="mt-3 space-y-2" aria-busy="true" aria-label="졸업생 목록 불러오는 중">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : displayMembers.length === 0 ? (
            <div className="mt-3">
              <AdminEmptyState
                icon={UserCheck}
                title={searchQuery ? "검색 결과가 없습니다." : "등록된 회원이 없습니다."}
              />
            </div>
          ) : (
            <MemberTable data={displayMembers} />
          )}
        </section>
      )}

      {/* ── 거절 탭 ── */}
      {activeTab === "rejected" && (
        <section>
          {pendingLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="반려 목록 불러오는 중">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : rejectedMembers.length === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center">
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
                  <div key={u.id} className="flex items-center justify-between rounded-2xl border bg-card p-4">
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

      {/* ── 회원 탈퇴 확인 Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirm(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={18} /> 회원 탈퇴
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              <strong>{deleteTarget?.name}</strong>(@{deleteTarget?.username}) 회원을 탈퇴 처리합니다.
            </p>
            <p className="rounded-md bg-destructive/10 p-3 text-xs leading-relaxed text-destructive">
              이 작업은 되돌릴 수 없습니다. 회원 정보가 영구 삭제되며, 작성한 글·신청 기록 등은 저자 정보만 비표시됩니다.
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                확인을 위해 회원의 이름 <strong>{deleteTarget?.name}</strong>을(를) 입력하세요.
              </label>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={deleteTarget?.name}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }}>취소</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || deleteConfirm !== deleteTarget?.name}
            >
              {deleting ? "처리 중…" : "탈퇴 확정"}
            </Button>
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
