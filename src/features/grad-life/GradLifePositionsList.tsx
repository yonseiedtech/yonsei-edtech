"use client";

/**
 * 운영콘솔 — 대학원 생활 활동 이력 관리 (Sprint 33).
 *
 * 회원별로 전공대표·조교·학회장·학회 운영진 활동 이력을 입력/수정/삭제한다.
 * 학기 단위(yyyy년 전기/후기). 종료 학기 미입력 = 진행중.
 *
 * 데이터 흐름:
 * - grad_life_positions 컬렉션 read/write (운영진 권한 필수)
 * - 추가/수정 시 회원 이름(userName) denormalize 함께 저장
 * - 회원 프로필 페이지의 ProfileGradLife가 listByUser 로 조회·표시
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, Plus, Pencil, Trash2, Users, Filter } from "lucide-react";
import { gradLifePositionsApi } from "@/lib/bkend";
import { useAllMembers } from "@/features/member/useMembers";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import {
  GRAD_LIFE_ROLE_LABELS,
  GRAD_LIFE_ROLE_COLORS,
  GRAD_LIFE_SEMESTER_LABELS,
  type GradLifePosition,
  type GradLifeRole,
  type GradLifeSemester,
} from "@/types";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import MemberAutocomplete from "@/components/ui/MemberAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: GradLifeRole[] = [
  "society_president",
  "society_vice_president",
  "major_rep",
  "student_advisor",
  "ta",
  "society_staff",
];

const SEM_OPTIONS: GradLifeSemester[] = ["first", "second"];

interface FormState {
  id?: string;
  userId: string;
  userName: string;
  role: GradLifeRole;
  detail: string;
  startYear: string;
  startSemester: GradLifeSemester;
  endYear: string;
  endSemester: GradLifeSemester | "";
  notes: string;
}

const initialForm = (): FormState => ({
  userId: "",
  userName: "",
  role: "society_staff",
  detail: "",
  startYear: String(new Date().getFullYear()),
  startSemester: new Date().getMonth() + 1 < 9 ? "first" : "second",
  endYear: "",
  endSemester: "",
  notes: "",
});

function formatRange(p: GradLifePosition): string {
  const start = `${p.startYear}년 ${GRAD_LIFE_SEMESTER_LABELS[p.startSemester]}`;
  if (!p.endYear || !p.endSemester) return `${start} ~ 진행중`;
  if (p.startYear === p.endYear && p.startSemester === p.endSemester) return start;
  return `${start} ~ ${p.endYear}년 ${GRAD_LIFE_SEMESTER_LABELS[p.endSemester]}`;
}

export default function GradLifePositionsList() {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const qc = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ["grad-life-positions-all"],
    queryFn: () => gradLifePositionsApi.list(),
    staleTime: 30_000,
  });
  const positions = useMemo(() => (res?.data ?? []) as GradLifePosition[], [res]);

  const { members } = useAllMembers();
  const memberMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [members]);

  const [filterRole, setFilterRole] = useState<GradLifeRole | "all">("all");
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [filterUserName, setFilterUserName] = useState<string>("");

  const filtered = useMemo(() => {
    let list = positions;
    if (filterRole !== "all") list = list.filter((p) => p.role === filterRole);
    if (filterUserId) list = list.filter((p) => p.userId === filterUserId);
    return [...list].sort((a, b) => {
      // ongoing 먼저, then startYear desc, then semester (second > first)
      const aOn = !a.endYear || !a.endSemester;
      const bOn = !b.endYear || !b.endSemester;
      if (aOn !== bOn) return aOn ? -1 : 1;
      if (a.startYear !== b.startYear) return b.startYear - a.startYear;
      const sRank = (s: GradLifeSemester) => (s === "second" ? 1 : 0);
      return sRank(b.startSemester) - sRank(a.startSemester);
    });
  }, [positions, filterRole, filterUserId]);

  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm());
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setForm(initialForm());
    setOpenForm(true);
  }

  function openEdit(p: GradLifePosition) {
    setForm({
      id: p.id,
      userId: p.userId,
      userName: p.userName ?? memberMap.get(p.userId) ?? "",
      role: p.role,
      detail: p.detail ?? "",
      startYear: String(p.startYear),
      startSemester: p.startSemester,
      endYear: p.endYear ? String(p.endYear) : "",
      endSemester: p.endSemester ?? "",
      notes: p.notes ?? "",
    });
    setOpenForm(true);
  }

  async function save() {
    if (!form.userId) {
      toast.error("회원을 선택하세요.");
      return;
    }
    const sy = Number(form.startYear);
    if (!sy || sy < 2000 || sy > 2100) {
      toast.error("시작 연도가 올바르지 않습니다.");
      return;
    }
    const ey = form.endYear ? Number(form.endYear) : undefined;
    if (ey !== undefined && (ey < 2000 || ey > 2100)) {
      toast.error("종료 연도가 올바르지 않습니다.");
      return;
    }
    if (ey !== undefined && !form.endSemester) {
      toast.error("종료 연도를 입력했다면 종료 학기도 선택해야 합니다.");
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        userId: form.userId,
        userName: form.userName || memberMap.get(form.userId) || "",
        role: form.role,
        detail: form.detail.trim() || undefined,
        startYear: sy,
        startSemester: form.startSemester,
        endYear: ey,
        endSemester: ey !== undefined ? form.endSemester || undefined : undefined,
        notes: form.notes.trim() || undefined,
        createdBy: user?.id,
      };
      if (form.id) {
        await gradLifePositionsApi.update(form.id, payload);
        toast.success("수정되었습니다.");
      } else {
        await gradLifePositionsApi.create(payload);
        toast.success("추가되었습니다.");
      }
      setOpenForm(false);
      await qc.invalidateQueries({ queryKey: ["grad-life-positions-all"] });
      await qc.invalidateQueries({ queryKey: ["grad-life-positions", form.userId] });
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: GradLifePosition) {
    if (!confirm(`${p.userName ?? memberMap.get(p.userId) ?? "(이름 미확인)"}의 "${GRAD_LIFE_ROLE_LABELS[p.role]}" 활동 이력을 삭제하시겠습니까?`)) return;
    try {
      await gradLifePositionsApi.delete(p.id);
      toast.success("삭제되었습니다.");
      await qc.invalidateQueries({ queryKey: ["grad-life-positions-all"] });
      await qc.invalidateQueries({ queryKey: ["grad-life-positions", p.userId] });
    } catch (e) {
      toast.error(`삭제 실패: ${(e as Error).message}`);
    }
  }

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-sm text-muted-foreground">
        운영진 전용 페이지입니다.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <ConsolePageHeader
        icon={GraduationCap}
        title="대학원 생활 활동 이력"
        description="전공대표·조교·학회장·학회 운영진 활동을 학기 단위(전기/후기)로 입력합니다. 회원 프로필에 자동 표시됩니다."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} className="mr-1" />
            새 활동 이력
          </Button>
        }
      />

      {/* 필터 */}
      <div className="rounded-xl border bg-white p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Filter size={12} />필터
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">역할</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as GradLifeRole | "all")}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              <option value="all">전체</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{GRAD_LIFE_ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[260px] flex-1">
            <label className="mb-1 block text-[11px] text-muted-foreground">회원</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <MemberAutocomplete
                  value={filterUserId}
                  displayName={filterUserName}
                  onSelect={(m) => {
                    setFilterUserId(m.id);
                    setFilterUserName(m.name);
                  }}
                  placeholder="회원 이름·학번으로 검색"
                />
              </div>
              {filterUserId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setFilterUserId(""); setFilterUserName(""); }}
                >
                  해제
                </Button>
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <Users size={12} className="mr-1 inline" />
            {filtered.length}건 / 전체 {positions.length}건
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="rounded-xl border bg-white">
        {isLoading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            등록된 활동 이력이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">회원</th>
                  <th className="px-3 py-2 font-medium">역할</th>
                  <th className="px-3 py-2 font-medium">상세</th>
                  <th className="px-3 py-2 font-medium">기간 (학기)</th>
                  <th className="px-3 py-2 font-medium">메모</th>
                  <th className="px-3 py-2 text-right font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((p) => {
                  const ongoing = !p.endYear || !p.endSemester;
                  return (
                    <tr key={p.id} className={cn(ongoing && "bg-violet-50/30")}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{p.userName ?? memberMap.get(p.userId) ?? "(이름 미확인)"}</div>
                        <div className="text-[11px] text-muted-foreground">{p.userId.slice(0, 8)}…</div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={cn("text-[10px]", GRAD_LIFE_ROLE_COLORS[p.role])}>
                          {GRAD_LIFE_ROLE_LABELS[p.role]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-sm">{p.detail || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2 text-xs">
                        {formatRange(p)}
                        {ongoing && <Badge variant="secondary" className="ml-1.5 bg-violet-100 text-violet-800 text-[10px]">진행중</Badge>}
                      </td>
                      <td className="px-3 py-2 text-[11.5px] text-muted-foreground">
                        {p.notes ? <span className="line-clamp-2 whitespace-pre-wrap">{p.notes}</span> : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(p)}>
                            <Pencil size={13} />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-600 hover:bg-rose-50" onClick={() => remove(p)}>
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 입력 다이얼로그 */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "활동 이력 수정" : "새 활동 이력 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <label className="mb-1 block text-xs font-medium">회원 *</label>
              {form.id ? (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  {form.userName} <span className="ml-2 text-[11px] text-muted-foreground">(회원 변경 불가 — 삭제 후 재등록)</span>
                </div>
              ) : (
                <MemberAutocomplete
                  value={form.userId}
                  displayName={form.userName}
                  onSelect={(m) => setForm({ ...form, userId: m.id, userName: m.name })}
                  placeholder="회원 이름 또는 학번 검색"
                />
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">역할 *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as GradLifeRole })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{GRAD_LIFE_ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">상세 (선택)</label>
              <Input
                value={form.detail}
                onChange={(e) => setForm({ ...form, detail: e.target.value })}
                placeholder="예: 교육공학회 학술팀장 / ㅇㅇ 교수님 조교"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">시작 연도 *</label>
                <Input
                  type="number"
                  value={form.startYear}
                  onChange={(e) => setForm({ ...form, startYear: e.target.value })}
                  min={2000}
                  max={2100}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">시작 학기 *</label>
                <select
                  value={form.startSemester}
                  onChange={(e) => setForm({ ...form, startSemester: e.target.value as GradLifeSemester })}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  {SEM_OPTIONS.map((s) => (
                    <option key={s} value={s}>{GRAD_LIFE_SEMESTER_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">종료 연도 (생략=진행중)</label>
                <Input
                  type="number"
                  value={form.endYear}
                  onChange={(e) => setForm({ ...form, endYear: e.target.value })}
                  min={2000}
                  max={2100}
                  placeholder="진행중이면 비워두기"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">종료 학기</label>
                <select
                  value={form.endSemester}
                  onChange={(e) => setForm({ ...form, endSemester: e.target.value as GradLifeSemester | "" })}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  disabled={!form.endYear}
                >
                  <option value="">—</option>
                  {SEM_OPTIONS.map((s) => (
                    <option key={s} value={s}>{GRAD_LIFE_SEMESTER_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">메모 (선택)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="공개 메모 — 프로필에 함께 표시됩니다"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)} disabled={busy}>
              취소
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? "저장중…" : (form.id ? "수정" : "추가")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
