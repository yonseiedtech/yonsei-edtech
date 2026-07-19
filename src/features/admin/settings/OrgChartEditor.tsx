"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Sparkles, ArrowUpCircle, FileText, GraduationCap, Copy } from "lucide-react";
import { useOrgChart, useUpdateOrgChart, orgChartKey, DEFAULT_ORG_SEED, type OrgPosition, type OrgRole } from "./useOrgChart";
import { useAllMembers, useChangeRole } from "@/features/member/useMembers";
import { currentSemesterKey, listSemesterKeys, shiftSemesterKey, semesterLabelFromKey } from "@/lib/semester";
import { useAuthStore } from "@/features/auth/auth-store";
import { logAudit } from "@/lib/audit";
import { ROLE_HIERARCHY } from "@/lib/permissions";
import { dataApi, siteSettingsApi } from "@/lib/bkend";
import { ROLE_LABELS as USER_ROLE_LABELS } from "@/types";
import type { UserRole, HandoverDocument } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MemberAutocomplete from "@/components/ui/MemberAutocomplete";
import Section from "./SectionWrapper";
import { toast } from "sonner";

const LEVEL_LABELS: Record<number, string> = {
  0: "주임교수",
  1: "전공 교수",
  2: "학회장·운영진·직속보조",
  3: "팀장",
  4: "팀원",
};

const ROLE_LABELS: Record<OrgRole, string> = {
  advisor: "자문위원",
  professor: "전공 교수",
  president: "학회장",
  vice_president: "부학회장",
  direct_aide: "학회장 직속 보조",
  team_member: "팀원",
};

/**
 * 조직 역할(OrgRole) → 회원 계정 역할(UserRole) 승격 제안 매핑.
 * 자동 변경은 금지 — 담당자 배정 시 "제안"만 하고, 명시적 버튼 + 감사로그로만 실제 승격.
 * team_member(팀원)는 운영진 권한이 불필요하므로 제안에서 제외(최소권한 — 과도승격 방지).
 * vice_president/direct_aide → staff 는 실권한(콘솔 접근)이 필요하다는 판단으로 유지.
 */
const ORG_ROLE_TO_USER_ROLE: Partial<Record<OrgRole, UserRole>> = {
  advisor: "advisor",
  president: "president",
  vice_president: "staff",
  direct_aide: "staff",
};

/** 승격 제안 시 안내할 "부여될 권한 수준" 문구. */
const ROLE_PERMISSION_NOTE: Partial<Record<UserRole, string>> = {
  staff: "운영진 콘솔 접근(회원·게시물·설정 관리)",
  president: "회장 — 운영진 전체 권한",
  advisor: "자문위원 열람 권한",
};

function generateId() {
  return `pos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

interface EditDialogProps {
  position: OrgPosition | null;
  allPositions: OrgPosition[];
  /** 현재 편집 중인 학기 키 — grad-life 프리필 링크에 전달 */
  semesterKey: string;
  open: boolean;
  onClose: () => void;
  onSave: (pos: OrgPosition) => void;
}

function EditDialog({ position, allPositions, semesterKey, open, onClose, onSave }: EditDialogProps) {
  const { members } = useAllMembers();
  const { user } = useAuthStore();
  const { changeRole, isLoading: promoting } = useChangeRole();

  const [form, setForm] = useState<OrgPosition>(
    position ?? { id: generateId(), title: "", level: 0, order: 0 },
  );

  useEffect(() => {
    if (position) setForm(position);
    else setForm({ id: generateId(), title: "", level: 0, order: allPositions.length });
  }, [position, allPositions.length]);

  const parentOptions = allPositions.filter((p) => p.level < form.level && p.id !== form.id);

  // 배정된 회원 (역할 승격 제안 계산용)
  const assignedMember = form.userId ? members.find((m) => m.id === form.userId) : undefined;
  const suggestedRole = form.role ? ORG_ROLE_TO_USER_ROLE[form.role] : undefined;
  const needsPromotion =
    !!assignedMember &&
    !!suggestedRole &&
    ROLE_HIERARCHY[assignedMember.role] < ROLE_HIERARCHY[suggestedRole];

  // 배정 해제/교체 시 이전 담당자가 승격된 역할(staff 이상)이면 수동 강등 검토 안내.
  // 자동 강등은 절대 금지 — 안내 toast 로만 유도(#2).
  function warnResidualRole(prevUserId?: string) {
    if (!prevUserId) return;
    const prev = members.find((m) => m.id === prevUserId);
    if (prev && ROLE_HIERARCHY[prev.role] >= ROLE_HIERARCHY.staff) {
      toast.info(
        `${prev.name} 님의 계정 역할(${USER_ROLE_LABELS[prev.role]})은 배정 해제로 자동 변경되지 않습니다. 회원 관리에서 역할을 검토하세요.`,
      );
    }
  }

  async function handlePromote() {
    if (!assignedMember || !suggestedRole) return;
    if (
      !window.confirm(
        `${assignedMember.name} 님의 계정 역할을 "${USER_ROLE_LABELS[assignedMember.role]}" → "${USER_ROLE_LABELS[suggestedRole]}" 로 승격할까요?`,
      )
    )
      return;
    try {
      await changeRole({ id: assignedMember.id, role: suggestedRole });
      toast.success(`${assignedMember.name} 님을 ${USER_ROLE_LABELS[suggestedRole]}(으)로 승격했습니다.`);
      logAudit({
        action: "역할 승격 (조직 설정)",
        category: "role",
        detail: `${assignedMember.name}: ${USER_ROLE_LABELS[assignedMember.role]} → ${USER_ROLE_LABELS[suggestedRole]} (직책: ${form.title || "미지정"})`,
        targetId: assignedMember.id,
        targetName: assignedMember.name,
        userId: user?.id ?? "",
        userName: user?.name ?? "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "역할 승격에 실패했습니다.");
    }
  }

  // 이 직책(title)에 연결된 업무노트(업무수행철) 수 — handover_docs.role === title
  const { data: handoverDocs = [] } = useQuery({
    queryKey: ["handover_docs"],
    queryFn: async () => {
      const res = await dataApi.list<HandoverDocument>("handover_docs", {
        sort: "role:asc,priority:asc",
        limit: 500,
      });
      return res.data;
    },
    enabled: open,
  });
  const linkedNoteCount = form.title
    ? handoverDocs.filter((d) => d.role === form.title).length
    : 0;
  const worklogHref = form.title
    ? `/console/handover?tab=worklog&role=${encodeURIComponent(form.title)}`
    : "/console/handover?tab=worklog";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{position ? "직책 수정" : "직책 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">직책명</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 회장, 학술팀장" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">부서/팀명 (선택)</label>
            <Input value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value || undefined })} placeholder="예: 학술부, 홍보부" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">계층</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: Number(e.target.value), parentId: undefined })}
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
              >
                {Object.entries(LEVEL_LABELS).map(([lv, label]) => (
                  <option key={lv} value={lv}>{lv} - {label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">순서</label>
              <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
            </div>
          </div>
          {form.level > 0 && parentOptions.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">상위 직책</label>
              <select
                value={form.parentId ?? ""}
                onChange={(e) => setForm({ ...form, parentId: e.target.value || undefined })}
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
              >
                <option value="">없음</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}{p.userName ? ` (${p.userName})` : ""}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">역할</label>
              <select
                value={form.role ?? ""}
                onChange={(e) => {
                  const role = (e.target.value || undefined) as OrgRole | undefined;
                  setForm({ ...form, role, isDirectAide: role === "direct_aide" });
                }}
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
              >
                <option value="">선택 안 함</option>
                {Object.entries(ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">팀명 (선택)</label>
              <Input value={form.team ?? ""} onChange={(e) => setForm({ ...form, team: e.target.value || undefined })} placeholder="예: 학술팀" />
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-lg border bg-amber-50/40 px-3 py-2 text-xs">
            <input
              type="checkbox"
              checked={!!form.isIndependent}
              onChange={(e) => setForm({ ...form, isIndependent: e.target.checked || undefined })}
            />
            <span>독립 사이드 브랜치 (부모 카드 우측에 점선으로 표시, 예: 외부 자문위원)</span>
          </label>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">담당 업무 (선택)</label>
            <textarea
              value={form.duty ?? ""}
              onChange={(e) => setForm({ ...form, duty: e.target.value || undefined })}
              placeholder="이 직책이 맡는 일 — 예: 세미나 기획·연사 섭외, 회비 관리, 홍보물 제작 등"
              rows={2}
              className="w-full rounded-lg border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">담당자 (회원 계정 연결)</label>
            <MemberAutocomplete
              value={form.userId ?? ""}
              displayName={form.userName}
              approvedOnly
              onSelect={(m) => {
                // 담당자 교체 시 이전 담당자가 승격된 권한을 보유하면 수동 검토 안내(#2)
                if (form.userId && form.userId !== m.id) warnResidualRole(form.userId);
                const full = members.find((x) => x.id === m.id);
                setForm({ ...form, userId: m.id, userName: m.name, userPhoto: full?.profileImage });
              }}
              onClear={() => {
                warnResidualRole(form.userId);
                setForm({ ...form, userId: undefined, userName: undefined, userPhoto: undefined });
              }}
              placeholder="승인 회원 이름·학번으로 검색 (공석이면 비워두기)"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">승인된 회원만 배정할 수 있습니다.</p>
            {needsPromotion && suggestedRole && (
              <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs">
                <p className="leading-relaxed">
                  <strong>{assignedMember?.name}</strong> 님의 현재 계정 역할은{" "}
                  <strong>{assignedMember ? USER_ROLE_LABELS[assignedMember.role] : ""}</strong> 입니다.
                  이 직책에 맞게 <strong>{USER_ROLE_LABELS[suggestedRole]}</strong>(으)로 승격을 제안합니다.
                  <span className="text-muted-foreground"> (자동 변경되지 않습니다)</span>
                </p>
                {ROLE_PERMISSION_NOTE[suggestedRole] && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    부여될 권한: {ROLE_PERMISSION_NOTE[suggestedRole]}
                  </p>
                )}
                <Button size="sm" variant="outline" className="mt-2" onClick={handlePromote} disabled={promoting}>
                  <ArrowUpCircle size={13} className="mr-1" />
                  {promoting ? "승격 중…" : `${USER_ROLE_LABELS[suggestedRole]}(으)로 승격`}
                </Button>
              </div>
            )}
            {assignedMember && suggestedRole && !needsPromotion && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                계정 역할({USER_ROLE_LABELS[assignedMember.role]})이 이 직책에 적합합니다.
              </p>
            )}
          </div>
          <div className="rounded-lg border bg-muted/20 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <FileText size={13} className="text-muted-foreground" />
                업무노트 연결
                {form.title && <span className="text-muted-foreground">· {linkedNoteCount}건</span>}
              </div>
              <Link href={worklogHref} className="text-xs text-primary hover:underline">
                업무노트 보기·작성 →
              </Link>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              직책명을 기준으로 업무수행철(업무노트)이 연결됩니다. 링크를 열면 이 직책으로 필터되어 새 노트를 작성할 수 있습니다.
            </p>
            {assignedMember && (
              <Link
                href={`/console/grad-life/positions?userId=${encodeURIComponent(assignedMember.id)}&userName=${encodeURIComponent(assignedMember.name)}&position=${encodeURIComponent(form.title)}&semester=${encodeURIComponent(semesterKey)}`}
                className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline"
              >
                <GraduationCap size={12} /> {assignedMember.name} 님의 활동 이력(대학원 생활)에 기록 →
              </Link>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">인수인계 메모 (선택)</label>
            <textarea
              value={form.handover ?? ""}
              onChange={(e) => setForm({ ...form, handover: e.target.value || undefined })}
              placeholder="차기 임원에게 전달할 업무 노하우·주의사항·연락처 등 (간단 메모 — 상세 업무는 위의 업무노트에)"
              rows={3}
              className="w-full rounded-lg border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={() => { if (!form.title.trim()) { toast.error("직책명을 입력하세요."); return; } onSave(form); onClose(); }}>
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function OrgChartEditor() {
  // 편집 대상 학기 (기본=현재 학기). 과거/다음 학기 선택 시 해당 학기 조직도 로드·편집.
  const [selectedSemester, setSelectedSemester] = useState(() => currentSemesterKey());
  const semesterOptions = useMemo(() => listSemesterKeys(4, 1), []);
  const { positions, recordId, signature, isLegacyFallback, isLoading } = useOrgChart(selectedSemester);
  const { members, isLoading: membersLoading } = useAllMembers();
  const updateMutation = useUpdateOrgChart();
  const [items, setItems] = useState<OrgPosition[]>([]);
  const [editPos, setEditPos] = useState<OrgPosition | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  // 저장 전 이탈 경고용 dirty 플래그(#11)
  const [dirty, setDirty] = useState(false);

  useEffect(() => { if (!isLoading) setItems(positions); }, [isLoading, positions]);

  // 저장되지 않은 편집이 있으면 브라우저 이탈·새로고침 시 경고(#11)
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // 배정된 userId 가 현재 회원 목록에 없으면 탈퇴/미확인 회원으로 간주(#6)
  function isOrphanAssignee(pos: OrgPosition): boolean {
    if (!pos.userId) return false;
    if (membersLoading || members.length === 0) return false; // 로딩 중 오탐 방지
    return !members.some((m) => m.id === pos.userId);
  }

  function handleSavePosition(pos: OrgPosition) {
    setItems((prev) => {
      const exists = prev.find((p) => p.id === pos.id);
      if (exists) return prev.map((p) => p.id === pos.id ? pos : p);
      // 신규: 동일 부모 스코프 내 max order + 1 부여 (삭제 후 전역 order 충돌 방지)(#12)
      const scopeMax = prev
        .filter((p) => p.parentId === pos.parentId)
        .reduce((mx, p) => Math.max(mx, p.order), -1);
      return [...prev, { ...pos, order: scopeMax + 1 }];
    });
    setDirty(true);
  }

  // 서브트리 전체를 재귀적으로 수집(계단식 삭제)(#8)
  function collectSubtree(list: OrgPosition[], id: string): Set<string> {
    const toRemove = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const p of list) {
        if (p.parentId && toRemove.has(p.parentId) && !toRemove.has(p.id)) {
          toRemove.add(p.id);
          changed = true;
        }
      }
    }
    return toRemove;
  }

  function handleDelete(id: string) {
    // 하위 직책이 함께 지워질 때만 확인 — 편집기 내에서 되돌릴 수 없는 일괄 삭제
    const childCount = collectSubtree(items, id).size - 1;
    if (childCount > 0 && !confirm(`하위 직책 ${childCount}개가 함께 삭제됩니다. 계속할까요?`)) return;
    setItems((prev) => {
      const toRemove = collectSubtree(prev, id);
      return prev.filter((p) => !toRemove.has(p.id));
    });
    setDirty(true);
  }

  function handleMoveOrder(id: string, delta: number) {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const item = prev[idx];
      // 순서 스왑은 동일 부모 스코프 내로 한정 — 다른 가지의 순서를 교란하지 않도록(#12)
      const sameParent = prev.filter((p) => p.parentId === item.parentId).sort((a, b) => a.order - b.order);
      const posInScope = sameParent.findIndex((p) => p.id === id);
      const swapIdx = posInScope + delta;
      if (swapIdx < 0 || swapIdx >= sameParent.length) return prev;
      const swap = sameParent[swapIdx];
      return prev.map((p) => {
        if (p.id === item.id) return { ...p, order: swap.order };
        if (p.id === swap.id) return { ...p, order: item.order };
        return p;
      });
    });
    setDirty(true);
  }

  // 선택 학기가 비어 있을 때, 직전 학기(또는 레거시) 조직도를 초안으로 불러오기
  async function handleCopyFromPrevious() {
    const prevKey = shiftSemesterKey(selectedSemester, -1);
    let res = prevKey ? await siteSettingsApi.getByKey(orgChartKey(prevKey)) : { data: [] as Record<string, unknown>[] };
    let sourceLabel = prevKey ? `${semesterLabelFromKey(prevKey)} 조직도` : "";
    if (res.data.length === 0) {
      res = await siteSettingsApi.getByKey("org_chart");
      sourceLabel = "이전(레거시) 조직도";
    }
    if (res.data.length === 0) { toast.info("복사할 이전 학기 조직도가 없습니다."); return; }
    let parsed: OrgPosition[] = [];
    try {
      const p = JSON.parse(res.data[0].value as string);
      if (Array.isArray(p)) parsed = p as OrgPosition[];
    } catch { /* 손상값 무시 */ }
    if (parsed.length === 0) { toast.info("이전 학기 조직도가 비어 있습니다."); return; }
    setItems(parsed);
    setDirty(true);
    toast.success(`${sourceLabel}에서 불러왔습니다. '저장'을 눌러 이 학기로 반영하세요.`);
  }

  async function handleSaveAll() {
    // 동시편집 방어(#3): 저장 직전 서버의 최신 시그니처를 로드 시점과 비교 (학기 키 단위)
    if (recordId && signature) {
      try {
        const fresh = await siteSettingsApi.getByKey(orgChartKey(selectedSemester));
        const freshRow = fresh.data[0];
        const freshSig = freshRow
          ? ((freshRow.updatedAt as string | undefined) ?? (freshRow.value as string | undefined))
          : undefined;
        if (freshSig && freshSig !== signature) {
          if (!confirm("다른 운영자가 먼저 저장했습니다. 덮어쓸까요? (취소하면 저장하지 않습니다)")) return;
        }
      } catch {
        // 비교 실패 시 기존 동작대로 저장 진행
      }
    }
    updateMutation.mutate({ recordId, positions: items, semesterKey: selectedSemester }, {
      onSuccess: () => { setDirty(false); toast.success("조직도가 저장되었습니다."); },
      onError: () => toast.error("저장 실패"),
    });
  }

  if (isLoading) return <div className="py-4 text-sm text-muted-foreground">불러오는 중...</div>;

  const grouped = new Map<number, OrgPosition[]>();
  for (const item of [...items].sort((a, b) => a.order - b.order)) {
    const list = grouped.get(item.level) ?? [];
    list.push(item);
    grouped.set(item.level, list);
  }
  const levels = [...grouped.keys()].sort();

  return (
    <div className="space-y-6">
    <Section title="운영진 설정">
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        직책 구조를 정의하고, 각 직책에 회원 계정을 배정합니다. 배정하면 공개 조직도(학회 소개 → 주요 구성원)와
        회원 프로필에 자동 반영되며, 직책별 담당 업무·업무노트가 연결됩니다. 계정 역할(권한) 승격은 각 직책 편집에서
        명시적으로 제안·실행합니다 (자동 변경 없음).
      </p>

      {/* 학기 선택 — 운영진 구성은 학기마다 다를 수 있음 */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
        <label className="text-xs font-medium text-muted-foreground">편집 학기</label>
        <select
          value={selectedSemester}
          onChange={(e) => { setSelectedSemester(e.target.value); setDirty(false); }}
          className="rounded-md border bg-card px-2.5 py-1.5 text-sm"
        >
          {semesterOptions.map((k) => (
            <option key={k} value={k}>
              {semesterLabelFromKey(k)}{k === currentSemesterKey() ? " (현재)" : ""}
            </option>
          ))}
        </select>
        {isLegacyFallback && (
          <span className="text-[11px] text-muted-foreground">
            아직 이 학기 조직도가 없어 이전 구성을 표시 중 — 저장하면 이 학기로 반영됩니다.
          </span>
        )}
      </div>

      {levels.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {semesterLabelFromKey(selectedSemester)}에 등록된 직책이 없습니다.
        </p>
      )}

      {levels.map((level) => (
        <div key={level} className="mt-4 first:mt-0">
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
            Level {level}: {LEVEL_LABELS[level] ?? `기타`}
          </h4>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {grouped.get(level)!.map((pos) => (
              <div key={pos.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5">
                {pos.userName ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {pos.userName[0]}
                  </div>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">?</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{pos.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {pos.userName ?? "공석"}
                    {pos.department && ` · ${pos.department}`}
                  </p>
                  {isOrphanAssignee(pos) && (
                    <span className="mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                      탈퇴/미확인 회원
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button onClick={() => handleMoveOrder(pos.id, -1)} className="rounded p-1 text-muted-foreground hover:bg-muted"><ChevronUp size={14} /></button>
                  <button onClick={() => handleMoveOrder(pos.id, 1)} className="rounded p-1 text-muted-foreground hover:bg-muted"><ChevronDown size={14} /></button>
                  <button onClick={() => { setEditPos(pos); setShowDialog(true); }} className="rounded p-1 text-muted-foreground hover:bg-muted"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(pos.id)} className="rounded p-1 text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => { setEditPos(null); setShowDialog(true); }}>
          <Plus size={14} className="mr-1" />직책 추가
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (items.length > 0 && !confirm("기존 직책을 모두 지우고 기본 구조로 초기화합니다. 계속하시겠습니까?")) return;
            setItems(DEFAULT_ORG_SEED.map((p) => ({ ...p })));
            setDirty(true);
            toast.success("기본 구조를 불러왔습니다. '저장' 버튼을 눌러 반영하세요.");
          }}
        >
          <Sparkles size={14} className="mr-1" />기본 구조 불러오기
        </Button>
        {items.length === 0 && (
          <Button variant="outline" size="sm" onClick={handleCopyFromPrevious}>
            <Copy size={14} className="mr-1" />이전 학기에서 복사
          </Button>
        )}
        <Button size="sm" onClick={handleSaveAll} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>

      <EditDialog
        position={editPos}
        allPositions={items}
        semesterKey={selectedSemester}
        open={showDialog}
        onClose={() => { setShowDialog(false); setEditPos(null); }}
        onSave={handleSavePosition}
      />
    </Section>
    </div>
  );
}
