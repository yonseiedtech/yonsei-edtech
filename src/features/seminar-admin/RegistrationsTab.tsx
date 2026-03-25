"use client";

import { useState } from "react";
import { useSeminars, useSeminar } from "@/features/seminar/useSeminar";
import { registrationsApi, attendeesApi, seminarsApi } from "@/lib/bkend";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Download, Trash2, Pencil, Settings, UserPlus, Plus, Loader2, BarChart3, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SeminarRegistration, RegistrationFieldConfig } from "@/types";
import { DEFAULT_REGISTRATION_FIELDS } from "@/types";

function exportRegistrationsCSV(seminarTitle: string, regs: SeminarRegistration[]) {
  const header = "이름,이메일,소속,연락처,메모,신청일시,참석자전환";
  const rows = regs.map((r) =>
    [
      r.name,
      r.email,
      r.affiliation ?? "",
      r.phone ?? "",
      `"${(r.memo ?? "").replace(/"/g, '""')}"`,
      r.createdAt ? new Date(r.createdAt).toLocaleString("ko-KR") : "",
      r.convertedAt ? "O" : "",
    ].join(","),
  );
  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `신청자_${seminarTitle.replace(/[^가-힣a-zA-Z0-9]/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── 분석 섹션 ── */
function RegistrationAnalysis({ registrations }: { registrations: SeminarRegistration[] }) {
  if (registrations.length === 0) return null;

  const total = registrations.length;
  const members = registrations.filter((r) => r.userId).length;
  const converted = registrations.filter((r) => r.convertedAt).length;

  // 소속별 분포
  const affDist: Record<string, number> = {};
  for (const r of registrations) {
    const key = r.affiliation?.trim() || "미입력";
    affDist[key] = (affDist[key] || 0) + 1;
  }
  const affEntries = Object.entries(affDist).sort((a, b) => b[1] - a[1]);
  const affMax = Math.max(...affEntries.map(([, c]) => c), 1);

  return (
    <div className="rounded-xl border bg-white p-5 space-y-4">
      <h4 className="flex items-center gap-1.5 text-sm font-medium">
        <BarChart3 size={16} />
        신청 현황 분석
      </h4>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-lg font-bold text-blue-600">{total}</p>
          <p className="text-[10px] text-muted-foreground">총 신청</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-lg font-bold text-primary">{members}</p>
          <p className="text-[10px] text-muted-foreground">회원</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{total - members}</p>
          <p className="text-[10px] text-muted-foreground">비회원</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-lg font-bold text-green-600">{converted}</p>
          <p className="text-[10px] text-muted-foreground">참석자 전환</p>
        </div>
      </div>

      {/* 소속별 분포 */}
      {affEntries.length > 1 && (
        <div>
          <h5 className="mb-2 text-xs font-medium text-muted-foreground">소속별 분포</h5>
          <div className="space-y-1.5">
            {affEntries.map(([aff, count]) => (
              <div key={aff} className="flex items-center gap-2 text-xs">
                <span className="w-28 truncate text-right text-muted-foreground" title={aff}>{aff}</span>
                <div className="h-4 flex-1 rounded bg-muted/30">
                  <div className="h-full rounded bg-blue-500/70 transition-all" style={{ width: `${(count / affMax) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface EditForm {
  id: string;
  name: string;
  email: string;
  affiliation: string;
  phone: string;
  memo: string;
}

/* ── 신청서 폼 설정 ── */
function FormFieldsEditor({ seminarId, fields }: { seminarId: string; fields: RegistrationFieldConfig[] }) {
  const qc = useQueryClient();
  const [localFields, setLocalFields] = useState<RegistrationFieldConfig[]>(
    fields.length > 0 ? fields : DEFAULT_REGISTRATION_FIELDS,
  );
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newField, setNewField] = useState({ label: "", type: "text" as RegistrationFieldConfig["type"] });

  function toggleEnabled(idx: number) {
    const updated = [...localFields];
    if (updated[idx].key === "name" || updated[idx].key === "email") return;
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    setLocalFields(updated);
  }

  function toggleRequired(idx: number) {
    const updated = [...localFields];
    updated[idx] = { ...updated[idx], required: !updated[idx].required };
    setLocalFields(updated);
  }

  function addCustomField() {
    if (!newField.label.trim()) { toast.error("필드 이름을 입력하세요."); return; }
    const key = `custom_${Date.now()}`;
    setLocalFields([...localFields, {
      key,
      label: newField.label.trim(),
      type: newField.type,
      required: false,
      enabled: true,
      placeholder: "",
    }]);
    setNewField({ label: "", type: "text" });
    setAddOpen(false);
  }

  function removeField(idx: number) {
    const f = localFields[idx];
    if (!f.key.startsWith("custom_")) return;
    setLocalFields(localFields.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await seminarsApi.update(seminarId, { registrationFields: localFields });
      qc.invalidateQueries({ queryKey: ["seminars", seminarId] });
      toast.success("신청서 폼 설정이 저장되었습니다.");
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-medium">
          <Settings size={16} />
          신청서 폼 설정
        </h4>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1" />필드 추가
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="mr-1 animate-spin" />}
            저장
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        {localFields.map((f, i) => (
          <div key={f.key} className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
            !f.enabled && "opacity-50 bg-muted/20",
          )}>
            <Checkbox
              checked={f.enabled}
              onCheckedChange={() => toggleEnabled(i)}
              disabled={f.key === "name" || f.key === "email"}
            />
            <span className="flex-1 font-medium">{f.label}</span>
            <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <Checkbox
                checked={f.required}
                onCheckedChange={() => toggleRequired(i)}
                disabled={!f.enabled}
              />
              필수
            </label>
            {f.key.startsWith("custom_") && (
              <button onClick={() => removeField(i)} className="text-muted-foreground hover:text-destructive">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        활성화된 필드만 공개 신청 폼에 표시됩니다. 이름/이메일은 필수 항목입니다.
      </p>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>커스텀 필드 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">필드 이름</label>
              <Input value={newField.label} onChange={(e) => setNewField({ ...newField, label: e.target.value })} placeholder="예: 소속 학과" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">입력 타입</label>
              <select
                value={newField.type}
                onChange={(e) => setNewField({ ...newField, type: e.target.value as RegistrationFieldConfig["type"] })}
                className="w-full rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="text">텍스트</option>
                <option value="email">이메일</option>
                <option value="tel">전화번호</option>
                <option value="textarea">장문 텍스트</option>
                <option value="select">선택형</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
            <Button onClick={addCustomField}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RegistrationsTab() {
  const { seminars } = useSeminars();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const seminar = seminars.find((s) => s.id === selectedId);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [converting, setConverting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const qc = useQueryClient();
  const seminarDetail = useSeminar(selectedId ?? "");

  const { data, refetch } = useQuery({
    queryKey: ["registrations", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const res = await registrationsApi.list(selectedId);
      return res.data as unknown as SeminarRegistration[];
    },
    enabled: !!selectedId,
    retry: false,
  });

  const registrations = data ?? [];

  async function handleDelete(id: string) {
    try {
      await registrationsApi.delete(id);
      toast.success("신청이 삭제되었습니다.");
      refetch();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  function openEdit(reg: SeminarRegistration) {
    setEditForm({
      id: reg.id,
      name: reg.name,
      email: reg.email,
      affiliation: reg.affiliation ?? "",
      phone: reg.phone ?? "",
      memo: reg.memo ?? "",
    });
  }

  async function handleSaveEdit() {
    if (!editForm) return;
    try {
      await registrationsApi.update(editForm.id, {
        name: editForm.name,
        email: editForm.email,
        affiliation: editForm.affiliation || undefined,
        phone: editForm.phone || undefined,
        memo: editForm.memo || undefined,
      });
      toast.success("신청 정보가 수정되었습니다.");
      setEditForm(null);
      refetch();
    } catch {
      toast.error("수정에 실패했습니다.");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const convertable = registrations.filter((r) => !r.convertedAt);
    if (selected.size === convertable.length) setSelected(new Set());
    else setSelected(new Set(convertable.map((r) => r.id)));
  }

  async function convertToAttendees(ids: string[]) {
    if (!selectedId) return;
    setConverting(true);
    let added = 0;
    let skipped = 0;

    try {
      const regsToConvert = registrations.filter((r) => ids.includes(r.id));
      for (const reg of regsToConvert) {
        // 중복 체크
        if (reg.userId) {
          const existing = await attendeesApi.check(selectedId, reg.userId);
          if ((existing.data as unknown[]).length > 0) { skipped++; continue; }
        }

        // P1: 데이터 완전 전달
        await attendeesApi.addWithDetails(selectedId, {
          userName: reg.name,
          userId: reg.userId || `guest_${reg.email}`,
          email: reg.email,
          phone: reg.phone || undefined,
          interests: reg.affiliation || undefined,
          questions: reg.memo || undefined,
          isGuest: !reg.userId,
          checkedIn: false,
          checkedInAt: null,
          checkedInBy: null,
        });

        // P3: 전환 상태 기록
        await registrationsApi.update(reg.id, {
          convertedAt: new Date().toISOString(),
        });

        added++;
      }

      qc.invalidateQueries({ queryKey: ["attendees", selectedId] });
      refetch();
      setSelected(new Set());
      const parts = [];
      if (added > 0) parts.push(`${added}명 참석자 등록`);
      if (skipped > 0) parts.push(`${skipped}명 중복 건너뜀`);
      toast.success(parts.join(", "));
    } catch {
      toast.error("참석자 전환 중 오류가 발생했습니다.");
    } finally {
      setConverting(false);
    }
  }

  const convertableSelected = [...selected].filter((id) => {
    const r = registrations.find((reg) => reg.id === id);
    return r && !r.convertedAt;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium">세미나 선택</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => { setSelectedId(e.target.value || null); setSelected(new Set()); }}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">-- 세미나를 선택하세요 --</option>
            {seminars.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.date})
              </option>
            ))}
          </select>
        </div>
        {seminar && registrations.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportRegistrationsCSV(seminar.title, registrations)}
          >
            <Download size={14} className="mr-1" />
            CSV 내보내기
          </Button>
        )}
      </div>

      {/* 신청서 폼 설정 */}
      {seminarDetail && selectedId && (
        <FormFieldsEditor
          seminarId={selectedId}
          fields={(seminarDetail.registrationFields as RegistrationFieldConfig[]) ?? []}
        />
      )}

      {/* P2: 신청 현황 분석 */}
      {selectedId && <RegistrationAnalysis registrations={registrations} />}

      {/* 신청 목록 */}
      {selectedId && (
        <div className="rounded-xl border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-medium">
              자체 신청 현황: {registrations.length}명
            </span>
            {convertableSelected.length > 0 && (
              <Button size="sm" onClick={() => convertToAttendees(convertableSelected)} disabled={converting}>
                {converting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <UserPlus size={14} className="mr-1" />}
                선택 → 참석자 등록 ({convertableSelected.length})
              </Button>
            )}
          </div>

          {registrations.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              자체 신청 내역이 없습니다.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <Checkbox
                        checked={registrations.filter((r) => !r.convertedAt).length > 0 && selected.size === registrations.filter((r) => !r.convertedAt).length}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="px-3 py-2 text-left font-medium">이름</th>
                    <th className="px-3 py-2 text-left font-medium">이메일</th>
                    <th className="px-3 py-2 text-left font-medium">소속</th>
                    <th className="px-3 py-2 text-left font-medium">연락처</th>
                    <th className="px-3 py-2 text-left font-medium">메모</th>
                    <th className="px-3 py-2 text-left font-medium">상태</th>
                    <th className="px-3 py-2 text-left font-medium">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {registrations.map((r) => (
                    <tr key={r.id} className={cn(selected.has(r.id) && "bg-primary/5")}>
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={selected.has(r.id)}
                          onCheckedChange={() => toggleSelect(r.id)}
                          disabled={!!r.convertedAt}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {r.name}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.affiliation ?? "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.phone ?? "-"}</td>
                      <td className="max-w-32 truncate px-3 py-2 text-xs text-muted-foreground" title={r.memo}>
                        {r.memo ?? "-"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {r.userId && <Badge variant="secondary" className="text-[10px]">회원</Badge>}
                          {r.convertedAt ? (
                            <Badge className="bg-green-50 text-green-700 text-[10px]">참석자 등록됨</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">대기</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                            <Pencil size={12} />
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(r.id)}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 신청 수정 Dialog */}
      <Dialog open={!!editForm} onOpenChange={(open) => !open && setEditForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>신청 정보 수정</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">이름</label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">이메일</label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">소속</label>
                  <Input value={editForm.affiliation} onChange={(e) => setEditForm({ ...editForm, affiliation: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">연락처</label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">메모</label>
                <Textarea value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditForm(null)}>취소</Button>
            <Button onClick={handleSaveEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
