"use client";

import { useState, useRef } from "react";
import { useSeminars, useSeminar, useAttendees } from "@/features/seminar/useSeminar";
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
import {
  Download, Trash2, Pencil, Settings, UserPlus, Plus, Loader2,
  BarChart3, Users, FileSpreadsheet, Link, MessageSquare, Share2, Copy, Printer,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseCSVText, extractSheetId, getSheetCsvUrl } from "@/lib/parse-spreadsheet";
import type { SeminarRegistration, SeminarAttendee, RegistrationFieldConfig } from "@/types";
import { DEFAULT_REGISTRATION_FIELDS } from "@/types";

// 엑셀 헤더 → Registration 필드 매핑 (동의어)
const FIELD_MAP: Record<string, { key: string; label: string }> = {
  "이름": { key: "name", label: "이름" },
  "성명": { key: "name", label: "이름" },
  "학번": { key: "studentId", label: "학번" },
  "이메일": { key: "email", label: "이메일" },
  "email": { key: "email", label: "이메일" },
  "전화번호": { key: "phone", label: "전화번호" },
  "연락처": { key: "phone", label: "전화번호" },
  "소속": { key: "affiliation", label: "소속" },
  "누적학기": { key: "semester", label: "누적학기" },
  "학기": { key: "semester", label: "누적학기" },
  "관심분야": { key: "interests", label: "관심분야" },
  "관심 분야": { key: "interests", label: "관심분야" },
  "분야": { key: "interests", label: "관심분야" },
  "기타 질문사항": { key: "memo", label: "질문/메모" },
  "질문사항": { key: "memo", label: "질문/메모" },
  "질문": { key: "memo", label: "질문/메모" },
  "메모": { key: "memo", label: "질문/메모" },
  "기타": { key: "memo", label: "질문/메모" },
};

const GOOGLE_FORM_COLUMNS = ["이름", "학번", "누적학기", "이메일", "전화번호", "관심분야", "기타 질문사항"];

function exportRegistrationsCSV(seminarTitle: string, regs: SeminarRegistration[]) {
  const header = "이름,학번,이메일,전화번호,소속,누적학기,관심분야,질문/메모,신청일시,참석자전환";
  const rows = regs.map((r) =>
    [r.name, r.studentId ?? "", r.email, r.phone ?? "", r.affiliation ?? "",
      r.semester ?? "", `"${(r.interests ?? "").replace(/"/g, '""')}"`,
      `"${(r.memo ?? "").replace(/"/g, '""')}"`,
      r.createdAt ? new Date(r.createdAt).toLocaleString("ko-KR") : "", r.convertedAt ? "O" : ""].join(","),
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

/* ── 탭 버튼 ── */
type TabKey = "manage" | "analysis" | "settings";
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "manage", label: "신청 관리", icon: <Users size={14} /> },
  { key: "analysis", label: "분석", icon: <BarChart3 size={14} /> },
  { key: "settings", label: "폼 설정", icon: <Settings size={14} /> },
];

/* ── 분석 섹션 ── */
function RegistrationAnalysis({
  registrations, attendees, seminarTitle, seminarDate,
}: {
  registrations: SeminarRegistration[];
  attendees: SeminarAttendee[];
  seminarTitle: string;
  seminarDate?: string;
}) {
  const [shareOpen, setShareOpen] = useState(false);

  if (registrations.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">신청 데이터가 없습니다.</p>;

  const total = registrations.length;
  const members = registrations.filter((r) => r.userId).length;
  const converted = registrations.filter((r) => r.convertedAt).length;
  const checkedIn = attendees.filter((a) => a.checkedIn).length;

  // 소속별 분포
  const affDist: Record<string, number> = {};
  for (const r of registrations) {
    const key = r.affiliation?.trim() || "미입력";
    affDist[key] = (affDist[key] || 0) + 1;
  }
  const affEntries = Object.entries(affDist).sort((a, b) => b[1] - a[1]);
  const affMax = Math.max(...affEntries.map(([, c]) => c), 1);

  // 질문 목록
  const NO_Q = [".", "-", "없음", "없습니다", "아직 없습니다", "없어요", "x", "X"];
  const questions = registrations.filter((r) => {
    if (!r.memo) return false;
    const t = r.memo.trim();
    if (t.length < 2) return false;
    if (NO_Q.includes(t) || t.startsWith("아직 특별한") || t.startsWith("아직 없")) return false;
    return true;
  }).map((r) => ({ id: r.id, name: r.name, q: r.memo! }));

  // 참석 전환율
  const convRate = total > 0 ? Math.round((converted / total) * 100) : 0;
  const checkRate = converted > 0 ? Math.round((checkedIn / converted) * 100) : 0;

  function generateShareText() {
    const lines = [
      `📊 ${seminarTitle} — 신청자 분석 리포트`,
      seminarDate ? `📅 ${seminarDate}` : "",
      "",
      `▸ 총 신청: ${total}명 (회원 ${members}명, 비회원 ${total - members}명)`,
      `▸ 참석자 전환: ${converted}명 (${convRate}%)`,
      converted > 0 ? `▸ 실제 출석: ${checkedIn}명 (전환 대비 ${checkRate}%)` : "",
      "",
    ];
    if (affEntries.length > 1) {
      lines.push("▸ 소속별 분포:");
      for (const [aff, count] of affEntries) lines.push(`  - ${aff}: ${count}명`);
      lines.push("");
    }
    if (questions.length > 0) {
      lines.push("▸ 사전 질문/메모:");
      for (const { name, q } of questions) lines.push(`  - ${name}: ${q}`);
    }
    return lines.filter(Boolean).join("\n");
  }

  function handleCopy() {
    navigator.clipboard.writeText(generateShareText());
    toast.success("리포트가 클립보드에 복사되었습니다.");
  }

  function handlePrint() {
    const text = generateShareText();
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${seminarTitle} 신청자 리포트</title><style>body{font-family:sans-serif;padding:40px;white-space:pre-wrap;line-height:1.8;font-size:14px;}</style></head><body>${text}</body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <div className="space-y-4">
      {/* 강사 공유 */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 size={14} className="mr-1" />강사 공유
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{total}</p>
          <p className="text-xs text-muted-foreground">총 신청</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-primary">{members}</p>
          <p className="text-xs text-muted-foreground">회원</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{converted}</p>
          <p className="text-xs text-muted-foreground">참석자 전환</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{checkedIn}</p>
          <p className="text-xs text-muted-foreground">실제 출석</p>
        </div>
      </div>

      {/* 전환율 / 출석률 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>참석 전환율</span>
            <span className="font-medium">{convRate}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted/30">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${convRate}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>실제 출석률</span>
            <span className="font-medium">{checkRate}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted/30">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${checkRate}%` }} />
          </div>
        </div>
      </div>

      {/* 소속별 분포 */}
      {affEntries.length > 1 && (
        <div className="rounded-xl border bg-white p-5">
          <h5 className="mb-3 text-sm font-medium">소속별 분포</h5>
          <div className="space-y-2">
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

      {/* 사전 질문/메모 */}
      {questions.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h5 className="mb-3 text-sm font-medium">사전 질문/메모 ({questions.length}건)</h5>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {questions.map((q) => (
              <div key={q.id} className="rounded-lg border bg-muted/10 px-4 py-3 text-xs">
                <span className="font-medium text-foreground">{q.name}</span>
                <p className="mt-1 leading-relaxed text-muted-foreground">{q.q}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 강사 공유 Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>강사 공유용 리포트</DialogTitle></DialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/10 p-4">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed">{generateShareText()}</pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handlePrint}><Printer size={14} className="mr-1" />인쇄</Button>
            <Button onClick={handleCopy}><Copy size={14} className="mr-1" />클립보드 복사</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── 사전 질문 관리 ── */
function QuestionManager({ registrations, refetch }: { registrations: SeminarRegistration[]; refetch: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", memo: "" });
  const [selectedQ, setSelectedQ] = useState<Set<string>>(new Set());

  const NO_QUESTION = [".", "-", "없음", "없습니다", "아직 없습니다", "없어요", "x", "X", "아직 없음", "아직없습니다", "없슴", "특별히 없습니다"];
  const withMemo = registrations.filter((r) => {
    if (!r.memo) return false;
    const trimmed = r.memo.trim();
    if (trimmed.length < 2) return false;
    if (NO_QUESTION.some((nq) => trimmed === nq || trimmed.startsWith("아직 특별한") || trimmed.startsWith("아직 없"))) return false;
    return true;
  });

  async function handleSaveMemo(id: string) {
    try {
      await registrationsApi.update(id, { memo: editText || undefined });
      toast.success("질문이 수정되었습니다.");
      setEditingId(null);
      refetch();
    } catch { toast.error("수정에 실패했습니다."); }
  }

  async function handleDeleteMemo(id: string) {
    try {
      await registrationsApi.update(id, { memo: "" });
      toast.success("질문이 삭제되었습니다.");
      refetch();
    } catch { toast.error("삭제에 실패했습니다."); }
  }

  async function handleDeleteSelectedQ() {
    const ids = [...selectedQ];
    if (ids.length === 0) return;
    if (!confirm(`${ids.length}건의 질문을 삭제하시겠습니까?`)) return;
    try {
      for (const id of ids) await registrationsApi.update(id, { memo: "" });
      toast.success(`${ids.length}건 삭제 완료`);
      setSelectedQ(new Set());
      refetch();
    } catch { toast.error("삭제 중 오류"); }
  }

  async function handleDeleteAllQ() {
    if (withMemo.length === 0) return;
    if (!confirm(`전체 ${withMemo.length}건의 질문을 삭제하시겠습니까?`)) return;
    try {
      for (const r of withMemo) await registrationsApi.update(r.id, { memo: "" });
      toast.success(`${withMemo.length}건 전체 삭제 완료`);
      setSelectedQ(new Set());
      refetch();
    } catch { toast.error("삭제 중 오류"); }
  }

  async function handleAddQuestion() {
    if (!addForm.name.trim()) { toast.error("이름을 입력하세요."); return; }
    if (!addForm.memo.trim()) { toast.error("질문을 입력하세요."); return; }
    // 기존 신청자 중 이름 매칭하여 memo 업데이트, 없으면 안내
    const match = registrations.find((r) => r.name === addForm.name.trim() && (!r.memo || r.memo === "."));
    if (match) {
      try {
        await registrationsApi.update(match.id, { memo: addForm.memo.trim() });
        toast.success(`${addForm.name}의 질문이 추가되었습니다.`);
        setAddForm({ name: "", memo: "" });
        setAddOpen(false);
        refetch();
      } catch { toast.error("추가에 실패했습니다."); }
    } else {
      toast.error("해당 이름의 신청자를 찾을 수 없거나 이미 질문이 있습니다.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="flex items-center gap-1.5 text-sm font-medium">
          <MessageSquare size={16} />
          사전 질문 관리 ({withMemo.length}건)
        </h5>
        <div className="flex gap-2">
          {selectedQ.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelectedQ}>
              <Trash2 size={14} className="mr-1" />선택 삭제 ({selectedQ.size})
            </Button>
          )}
          {withMemo.length > 0 && (
            <Button variant="outline" size="sm" className="text-destructive" onClick={handleDeleteAllQ}>
              <Trash2 size={14} className="mr-1" />전체 삭제
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1" />질문 추가
          </Button>
        </div>
      </div>

      {withMemo.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">등록된 질문이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {withMemo.map((r) => (
            <div key={r.id} className="rounded-xl border bg-white p-4">
              {editingId === r.id ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium">{r.name}</p>
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>취소</Button>
                    <Button size="sm" onClick={() => handleSaveMemo(r.id)}>저장</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedQ.has(r.id)}
                    onCheckedChange={() => setSelectedQ((prev) => { const next = new Set(prev); if (next.has(r.id)) next.delete(r.id); else next.add(r.id); return next; })}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-medium">{r.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.memo}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="outline" size="sm" onClick={() => { setEditingId(r.id); setEditText(r.memo ?? ""); }}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDeleteMemo(r.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 질문 추가 Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>사전 질문 추가</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">신청자 이름 *</label>
              <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="기존 신청자 이름" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">질문 내용 *</label>
              <Textarea value={addForm.memo} onChange={(e) => setAddForm({ ...addForm, memo: e.target.value })} rows={3} placeholder="질문 내용을 입력하세요" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
            <Button onClick={handleAddQuestion}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EditForm {
  id: string;
  name: string;
  studentId: string;
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
    setLocalFields([...localFields, {
      key: `custom_${Date.now()}`,
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
    if (!localFields[idx].key.startsWith("custom_")) return;
    setLocalFields(localFields.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await seminarsApi.update(seminarId, { registrationFields: localFields });
      qc.invalidateQueries({ queryKey: ["seminars", seminarId] });
      toast.success("신청서 폼 설정이 저장되었습니다.");
    } catch { toast.error("저장에 실패했습니다."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium">신청서 필드 설정</h5>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}><Plus size={14} className="mr-1" />필드 추가</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="mr-1 animate-spin" />}저장
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        {localFields.map((f, i) => (
          <div key={f.key} className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
            !f.enabled && "opacity-50 bg-muted/20",
          )}>
            <Checkbox checked={f.enabled} onCheckedChange={() => toggleEnabled(i)} disabled={f.key === "name" || f.key === "email"} />
            <span className="flex-1 font-medium">{f.label}</span>
            <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <Checkbox checked={f.required} onCheckedChange={() => toggleRequired(i)} disabled={!f.enabled} />필수
            </label>
            {f.key.startsWith("custom_") && (
              <button onClick={() => removeField(i)} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">활성화된 필드만 공개 신청 폼에 표시됩니다. 이름/이메일은 필수입니다.</p>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>커스텀 필드 추가</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">필드 이름</label>
              <Input value={newField.label} onChange={(e) => setNewField({ ...newField, label: e.target.value })} placeholder="예: 소속 학과" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">입력 타입</label>
              <select value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value as RegistrationFieldConfig["type"] })} className="w-full rounded-md border px-3 py-1.5 text-sm">
                <option value="text">텍스트</option><option value="email">이메일</option><option value="tel">전화번호</option><option value="textarea">장문 텍스트</option><option value="select">선택형</option>
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

/* ── 메인 컴포넌트 ── */
export default function RegistrationsTab() {
  const { seminars } = useSeminars();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const seminar = seminars.find((s) => s.id === selectedId);
  const [activeTab, setActiveTab] = useState<TabKey>("manage");
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [converting, setConverting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [registering, setRegistering] = useState(false);
  const excelRef = useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetLoading, setSheetLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", email: "", affiliation: "", phone: "", memo: "" });
  // 엑셀 미리보기 상태
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  const qc = useQueryClient();
  const seminarDetail = useSeminar(selectedId ?? "");
  const { attendees } = useAttendees(selectedId ?? "");

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

  interface RegRow {
    name: string; email: string; phone: string;
    studentId: string; semester: string; interests: string; memo: string;
    affiliation: string;
  }

  // 신청자 등록 — Firestore 클라이언트 직접 저장
  async function registerFromData(rows: RegRow[]) {
    if (rows.length === 0) { toast.error("데이터가 없습니다."); return; }
    if (!selectedId) return;
    setRegistering(true);

    // 중복 필터링
    const existingEmails = new Set(registrations.map((r) => r.email).filter(Boolean));
    const existingStudentIds = new Set(registrations.map((r) => r.studentId).filter(Boolean));
    const newRows = rows.filter((row) => {
      if (!row.name.trim()) return false;
      if (row.email && existingEmails.has(row.email)) return false;
      if (row.studentId && existingStudentIds.has(row.studentId)) return false;
      return true;
    });
    const skipped = rows.length - newRows.length;

    if (newRows.length === 0) {
      toast.error(skipped > 0 ? `${skipped}명 모두 중복입니다.` : "등록할 데이터가 없습니다.");
      setRegistering(false);
      return;
    }

    let added = 0;
    try {
      for (const row of newRows) {
        const payload: Record<string, unknown> = {
          seminarId: selectedId,
          name: row.name,
        };
        if (row.email) payload.email = row.email;
        if (row.phone) payload.phone = row.phone;
        if (row.studentId) payload.studentId = row.studentId;
        if (row.semester) payload.semester = row.semester;
        if (row.interests) payload.interests = row.interests;
        if (row.memo) payload.memo = row.memo;
        if (row.affiliation) payload.affiliation = row.affiliation;

        await registrationsApi.create(payload);
        added++;
      }

      // 캐시 리셋 + 강제 refetch
      qc.removeQueries({ queryKey: ["registrations", selectedId] });
      setTimeout(async () => {
        await refetch();
      }, 500);

      const parts = [];
      if (added > 0) parts.push(`${added}명 신청 등록 완료`);
      if (skipped > 0) parts.push(`${skipped}명 중복 건너뜀`);
      toast.success(parts.join(", "));
    } catch (err) {
      console.error("[registerFromData] error:", err);
      toast.error(`등록 중 오류 (${added}/${newRows.length}명 완료)`);
    } finally {
      setRegistering(false);
    }
  }

  function cleanStudentId(val: string): string {
    if (!val) return "";
    // 엑셀에서 숫자로 읽힌 경우 소수점 제거 (2025431009.0 → 2025431009)
    const num = Number(val);
    if (!isNaN(num) && num > 1000000000) return String(Math.round(num));
    return val.trim();
  }

  function mapParsedToRegRow(r: Record<string, string>): RegRow {
    return {
      name: r["이름"] || "",
      email: r["이메일"] || "",
      phone: r["전화번호"] || r["연락처"] || "",
      studentId: cleanStudentId(r["학번"] || ""),
      semester: r["누적학기"] || "",
      interests: r["관심분야"] || "",
      memo: r["기타 질문사항"] || r["메모"] || "",
      affiliation: r["소속"] || "",
    };
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-excel", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); toast.error(err.error || "파싱 실패"); return; }
      const { headers, rows, total } = await res.json() as { headers: string[]; rows: Record<string, string>[]; total: number };
      if (total === 0) { toast.error("데이터가 없습니다."); return; }
      // 자동 필드 매핑
      const mapping: Record<string, string> = {};
      for (const h of headers) {
        const mapped = FIELD_MAP[h];
        if (mapped) mapping[h] = mapped.key;
      }
      setPreviewHeaders(headers);
      setPreviewRows(rows);
      setFieldMapping(mapping);
      setPreviewOpen(true);
    } catch { toast.error("파일을 읽을 수 없습니다."); }
    if (excelRef.current) excelRef.current.value = "";
  }

  async function handlePreviewConfirm() {
    // 매핑 기반으로 RegRow 변환
    const rows: RegRow[] = previewRows.map((row) => {
      const mapped: Record<string, string> = {};
      for (const [header, value] of Object.entries(row)) {
        const fieldKey = fieldMapping[header];
        if (fieldKey && value) mapped[fieldKey] = value;
      }
      return {
        name: mapped.name || "",
        email: mapped.email || "",
        phone: mapped.phone || "",
        studentId: cleanStudentId(mapped.studentId || ""),
        semester: mapped.semester || "",
        interests: mapped.interests || "",
        memo: mapped.memo || "",
        affiliation: mapped.affiliation || "",
      };
    });
    await registerFromData(rows);
    setPreviewOpen(false);
  }

  async function handleSheetLoad() {
    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) { toast.error("올바른 구글 스프레드시트 URL을 입력하세요."); return; }
    setSheetLoading(true);
    try {
      const res = await fetch(`/api/sheets?url=${encodeURIComponent(getSheetCsvUrl(sheetId))}`);
      if (!res.ok) { toast.error("불러오기 실패"); return; }
      const raw = parseCSVText(await res.text(), GOOGLE_FORM_COLUMNS);
      await registerFromData(raw.map(mapParsedToRegRow));
      setSheetOpen(false);
      setSheetUrl("");
    } catch { toast.error("스프레드시트 연결 실패"); }
    finally { setSheetLoading(false); }
  }

  async function handleManualRegister() {
    if (!manualForm.name.trim()) { toast.error("이름은 필수입니다."); return; }
    await registerFromData([{ ...manualForm, studentId: "", semester: "", interests: "" }]);
    setManualForm({ name: "", email: "", affiliation: "", phone: "", memo: "" });
    setManualOpen(false);
  }

  async function handleDelete(id: string) {
    try { await registrationsApi.delete(id); toast.success("삭제되었습니다."); refetch(); }
    catch { toast.error("삭제 실패"); }
  }

  async function handleRemoveDuplicates() {
    if (registrations.length < 2) return;
    const seen = new Map<string, string>(); // key → 첫 번째 id
    const dupeIds: string[] = [];
    for (const r of registrations) {
      // 학번 우선, 없으면 이름+이메일로 중복 판별
      const key = r.studentId ? `sid:${r.studentId}` : `ne:${r.name}:${r.email || ""}`;
      if (seen.has(key)) {
        dupeIds.push(r.id);
      } else {
        seen.set(key, r.id);
      }
    }
    if (dupeIds.length === 0) { toast.success("중복 신청자가 없습니다."); return; }
    if (!confirm(`${dupeIds.length}명의 중복 신청자를 삭제하시겠습니까?`)) return;
    try {
      for (const id of dupeIds) await registrationsApi.delete(id);
      toast.success(`${dupeIds.length}명 중복 제거 완료`);
      refetch();
    } catch { toast.error("중복 제거 중 오류"); }
  }

  function openEdit(reg: SeminarRegistration) {
    setEditForm({ id: reg.id, name: reg.name, studentId: reg.studentId ?? "", email: reg.email, affiliation: reg.affiliation ?? "", phone: reg.phone ?? "", memo: reg.memo ?? "" });
  }

  async function handleSaveEdit() {
    if (!editForm) return;
    try {
      await registrationsApi.update(editForm.id, {
        name: editForm.name, studentId: editForm.studentId || undefined, email: editForm.email,
        affiliation: editForm.affiliation || undefined, phone: editForm.phone || undefined, memo: editForm.memo || undefined,
      });
      toast.success("수정되었습니다."); setEditForm(null); refetch();
    } catch { toast.error("수정 실패"); }
  }

  async function handleBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`${ids.length}명의 신청자를 삭제하시겠습니까?`)) return;
    try {
      for (const id of ids) await registrationsApi.delete(id);
      toast.success(`${ids.length}명 삭제 완료`);
      setSelected(new Set());
      refetch();
    } catch { toast.error("삭제 중 오류가 발생했습니다."); }
  }

  async function handleDeleteAll() {
    if (registrations.length === 0) return;
    if (!confirm(`전체 ${registrations.length}명의 신청자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      for (const r of registrations) await registrationsApi.delete(r.id);
      toast.success(`${registrations.length}명 전체 삭제 완료`);
      setSelected(new Set());
      refetch();
    } catch { toast.error("삭제 중 오류가 발생했습니다."); }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function toggleAll() {
    if (selected.size === registrations.length) setSelected(new Set());
    else setSelected(new Set(registrations.map((r) => r.id)));
  }

  async function convertToAttendees(ids: string[]) {
    if (!selectedId) return;
    setConverting(true);
    let added = 0, skipped = 0;
    try {
      for (const reg of registrations.filter((r) => ids.includes(r.id))) {
        if (reg.userId) {
          const existing = await attendeesApi.check(selectedId, reg.userId);
          if ((existing.data as unknown[]).length > 0) { skipped++; continue; }
        }
        await attendeesApi.addWithDetails(selectedId, {
          userName: reg.name, userId: reg.userId || `guest_${reg.email}`,
          email: reg.email, phone: reg.phone || undefined,
          interests: reg.affiliation || undefined, questions: reg.memo || undefined,
          isGuest: !reg.userId, checkedIn: false, checkedInAt: null, checkedInBy: null,
        });
        await registrationsApi.update(reg.id, { convertedAt: new Date().toISOString() });
        added++;
      }
      qc.invalidateQueries({ queryKey: ["attendees", selectedId] });
      refetch(); setSelected(new Set());
      const parts = [];
      if (added > 0) parts.push(`${added}명 참석자 등록`);
      if (skipped > 0) parts.push(`${skipped}명 중복 건너뜀`);
      toast.success(parts.join(", "));
    } catch { toast.error("전환 중 오류"); }
    finally { setConverting(false); }
  }

  const convertableSelected = [...selected].filter((id) => { const r = registrations.find((reg) => reg.id === id); return r && !r.convertedAt; });

  return (
    <div className="space-y-6">
      {/* 세미나 선택 */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium">세미나 선택</label>
          <select value={selectedId ?? ""} onChange={(e) => { setSelectedId(e.target.value || null); setSelected(new Set()); setActiveTab("manage"); }} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">-- 세미나를 선택하세요 --</option>
            {seminars.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.date})</option>)}
          </select>
        </div>
        {seminar && registrations.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportRegistrationsCSV(seminar.title, registrations)}>
            <Download size={14} className="mr-1" />CSV
          </Button>
        )}
      </div>

      {/* 서브 탭 */}
      {selectedId && (
        <div className="flex gap-1 border-b">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 신청 관리 탭 */}
      {selectedId && activeTab === "manage" && (
        <div className="space-y-4">
          {/* 등록 버튼 */}
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-sm font-medium"><UserPlus size={16} />신청자 등록</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => excelRef.current?.click()} disabled={registering}>
                  {registering ? <Loader2 size={14} className="mr-1 animate-spin" /> : <FileSpreadsheet size={14} className="mr-1" />}엑셀
                </Button>
                <input ref={excelRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
                <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)} disabled={registering}><Link size={14} className="mr-1" />구글 시트</Button>
                <Button variant="outline" size="sm" onClick={() => setManualOpen(true)} disabled={registering}><UserPlus size={14} className="mr-1" />수기 등록</Button>
              </div>
            </div>
          </div>

          {/* 신청 목록 */}
          <div className="rounded-xl border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-medium">신청자 {registrations.length}명</span>
              <div className="flex gap-2">
                {selected.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 size={14} className="mr-1" />선택 삭제 ({selected.size})
                  </Button>
                )}
                {convertableSelected.length > 0 && (
                  <Button size="sm" onClick={() => convertToAttendees(convertableSelected)} disabled={converting}>
                    {converting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <UserPlus size={14} className="mr-1" />}
                    참석자 전환 ({convertableSelected.length})
                  </Button>
                )}
                {registrations.length > 1 && (
                  <Button variant="outline" size="sm" onClick={handleRemoveDuplicates}>
                    중복 제거
                  </Button>
                )}
                {registrations.length > 0 && (
                  <Button variant="outline" size="sm" className="text-destructive" onClick={handleDeleteAll}>
                    <Trash2 size={14} className="mr-1" />전체 삭제
                  </Button>
                )}
              </div>
            </div>
            {registrations.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">신청 내역이 없습니다.</p>
            ) : (
              <div className="max-h-96 overflow-x-auto overflow-y-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="sticky top-0 border-b bg-muted/30">
                    <tr>
                      <th className="px-3 py-2 text-left"><Checkbox checked={registrations.length > 0 && selected.size === registrations.length} onCheckedChange={toggleAll} /></th>
                      <th className="px-3 py-2 text-left font-medium">이름</th>
                      <th className="px-3 py-2 text-left font-medium">학번</th>
                      <th className="px-3 py-2 text-left font-medium">이메일</th>
                      <th className="px-3 py-2 text-left font-medium">전화번호</th>
                      <th className="px-3 py-2 text-left font-medium">관심분야</th>
                      <th className="px-3 py-2 text-left font-medium">상태</th>
                      <th className="px-3 py-2 text-left font-medium">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {registrations.map((r) => (
                      <tr key={r.id} className={cn(selected.has(r.id) && "bg-primary/5")}>
                        <td className="px-3 py-2"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></td>
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.studentId ?? "-"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.email || "-"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.phone ?? "-"}</td>
                        <td className="max-w-32 truncate px-3 py-2 text-xs text-muted-foreground" title={r.interests}>{r.interests ?? "-"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {r.userId && <Badge variant="secondary" className="text-[10px]">회원</Badge>}
                            {r.convertedAt ? <Badge className="bg-green-50 text-green-700 text-[10px]">참석 등록</Badge> : <Badge variant="outline" className="text-[10px] text-muted-foreground">대기</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => openEdit(r)}><Pencil size={12} /></Button>
                            <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 size={12} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 사전 질문 관리 */}
          <div className="rounded-xl border bg-white p-5">
            <QuestionManager registrations={registrations} refetch={refetch} />
          </div>
        </div>
      )}

      {/* 분석 탭 */}
      {selectedId && activeTab === "analysis" && (
        <RegistrationAnalysis
          registrations={registrations}
          attendees={attendees}
          seminarTitle={seminar?.title ?? ""}
          seminarDate={seminar?.date}
        />
      )}

      {/* 폼 설정 탭 */}
      {selectedId && activeTab === "settings" && seminarDetail && (
        <div className="rounded-xl border bg-white p-5">
          <FormFieldsEditor seminarId={selectedId} fields={(seminarDetail.registrationFields as RegistrationFieldConfig[]) ?? []} />
        </div>
      )}

      {/* 엑셀 미리보기 + 필드 매핑 Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>엑셀 데이터 미리보기 ({previewRows.length}명)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-hidden">
            {/* 필드 매핑 */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">엑셀 열 → 신청 필드 매핑</p>
              <div className="flex flex-wrap gap-2">
                {previewHeaders.map((h) => (
                  <div key={h} className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs">
                    <span className="font-medium">{h}</span>
                    <span className="text-muted-foreground">→</span>
                    <select
                      value={fieldMapping[h] || ""}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, [h]: e.target.value })}
                      className="rounded border-none bg-transparent px-1 py-0.5 text-xs font-medium text-primary"
                    >
                      <option value="">건너뛰기</option>
                      <option value="name">이름</option>
                      <option value="studentId">학번</option>
                      <option value="email">이메일</option>
                      <option value="phone">전화번호</option>
                      <option value="affiliation">소속</option>
                      <option value="semester">누적학기</option>
                      <option value="interests">관심분야</option>
                      <option value="memo">질문/메모</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
            {/* 데이터 미리보기 */}
            <div className="overflow-auto rounded-lg border max-h-60">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="sticky top-0 bg-muted/50 border-b">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-muted-foreground">#</th>
                    {previewHeaders.filter((h) => fieldMapping[h]).map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium">{FIELD_MAP[h]?.label || fieldMapping[h]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewRows.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                      {previewHeaders.filter((h) => fieldMapping[h]).map((h) => (
                        <td key={h} className="px-2 py-1.5">{row[h] || "-"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRows.length > 10 && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground text-center">... 외 {previewRows.length - 10}명</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>취소</Button>
            <Button onClick={handlePreviewConfirm} disabled={registering || !fieldMapping["이름"] && !Object.values(fieldMapping).includes("name")}>
              {registering && <Loader2 size={14} className="mr-1 animate-spin" />}
              {previewRows.length}명 신청 등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>구글 스프레드시트에서 신청자 등록</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
            <p className="text-xs text-muted-foreground">&quot;링크가 있는 모든 사용자에게 공개&quot; 설정 필요. 이름/이메일/소속/연락처/메모 열 자동 인식.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>취소</Button>
            <Button onClick={handleSheetLoad} disabled={sheetLoading || !sheetUrl.trim()}>
              {sheetLoading && <Loader2 size={14} className="mr-1 animate-spin" />}불러오기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>신청자 수기 등록</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-medium">이름 *</label><Input value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-medium">이메일 *</label><Input value={manualForm.email} onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-medium">소속</label><Input value={manualForm.affiliation} onChange={(e) => setManualForm({ ...manualForm, affiliation: e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-medium">연락처</label><Input value={manualForm.phone} onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })} /></div>
            </div>
            <div><label className="mb-1 block text-xs font-medium">메모/질문</label><Textarea value={manualForm.memo} onChange={(e) => setManualForm({ ...manualForm, memo: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>취소</Button>
            <Button onClick={handleManualRegister} disabled={registering}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editForm} onOpenChange={(open) => !open && setEditForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>신청 정보 수정</DialogTitle></DialogHeader>
          {editForm && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-sm font-medium">이름</label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div><label className="mb-1 block text-sm font-medium">학번</label><Input value={editForm.studentId} onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })} placeholder="2025431009" /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium">이메일</label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-sm font-medium">소속</label><Input value={editForm.affiliation} onChange={(e) => setEditForm({ ...editForm, affiliation: e.target.value })} /></div>
                <div><label className="mb-1 block text-sm font-medium">연락처</label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium">메모</label><Textarea value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })} rows={3} /></div>
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
